const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const MANDATED_LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU3-002';
const LOG_PREFIX_MANDATED = 'CU3-002';
const PORT = Number(process.env.PORT || getUseCasePort('CU3-002'));

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function createLogFile(dir, prefix) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const now = new Date();
  const base = `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(dir, filename)));

  return {
    filename,
    filepath: path.join(dir, filename),
    stream: fs.createWriteStream(path.join(dir, filename), { flags: 'a' })
  };
}

function ensureLogFiles() {
  const primary = createLogFile(LOG_DIR, LOG_PREFIX);
  const mandated = createLogFile(MANDATED_LOG_DIR, LOG_PREFIX_MANDATED);
  global.logStreams = [primary.stream, mandated.stream];
  global.logFiles = [primary.filepath, mandated.filepath];
  logLine(`LOG FILE: ${primary.filename}`);
  logLine(`LOG FILE (MANDATED): ${mandated.filename}`);
}

function logLine(message, level = 'INFO') {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (global.logStreams) {
    global.logStreams.forEach((stream) => stream.write(`${line}\n`));
  }
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  const message = context ? `${context} | ${detail}` : detail;
  logLine(message, 'ERROR');
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

function parseDsn(dsn) {
  const tcpMatch = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (tcpMatch) {
    return {
      user: decodeURIComponent(tcpMatch[1]),
      password: decodeURIComponent(tcpMatch[2]),
      host: tcpMatch[3],
      port: Number(tcpMatch[4]),
      database: tcpMatch[5]
    };
  }
  const parsed = new URL(dsn);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    database: parsed.pathname.replace('/', '')
  };
}

function parseErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const data = yaml.parse(raw);
  if (!data || !Array.isArray(data.connections) || !data.connections.length) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }
  const connection = data.connections[0];
  if (!connection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }
  return {
    name: connection.name || '',
    dsn: connection.dsn
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return mysql.createPool({
    ...dbConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

// OTP_GATE_ENABLED_START
function extractFirstInteger(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = extractFirstInteger(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const parsed = extractFirstInteger(value[key]);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return null;
}

function extractAuthParams(source) {
  const codigoUsuarioRaw = source?.vUsuario ?? source?.Codigo_usuario ?? source?.codigo_usuario;
  const otpRaw = source?.vOTP ?? source?.OTP ?? source?.otp;
  const codigoUsuario = String(codigoUsuarioRaw ?? '').trim();
  const otp = String(otpRaw ?? '').trim();
  return { codigoUsuario, otp };
}

function hasValidAuthFormat(codigoUsuario, otp) {
  if (!codigoUsuario || !otp) {
    return false;
  }
  if (codigoUsuario.length > 36 || otp.length > 6) {
    return false;
  }
  return true;
}

function unauthorizedHtml() {
  const text = 'Warning ACCESO NO AUTORIZADO !!!';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Acceso no autorizado</title></head><body><script>alert(' +
    JSON.stringify(text) +
    ');try{window.open("","_self");window.close();}catch(e){}setTimeout(function(){location.replace("about:blank");},120);</script></body></html>';
}

function resolvePoolReference() {
  if (app.locals && app.locals.db && app.locals.db.pool) return app.locals.db.pool;
  if (app.locals && app.locals.db && typeof app.locals.db.getConnection === 'function') return app.locals.db;
  if (app.locals && app.locals.pool && typeof app.locals.pool.getConnection === 'function') return app.locals.pool;
  if (typeof dbState !== 'undefined' && dbState && dbState.pool) return dbState.pool;
  if (typeof pool !== 'undefined' && pool && typeof pool.getConnection === 'function') return pool;
  return null;
}

async function validarOtp(poolRef, codigoUsuario, otp) {
  const conn = await poolRef.getConnection();
  try {
    if (typeof runQuery === 'function') {
      await runQuery(conn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
      const [rows] = await runQuery(conn, 'SELECT @p_resultado AS resultado');
      return extractFirstInteger(rows);
    }

    if (typeof execQuery === 'function') {
      await execQuery('CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp], conn);
      const rows = await execQuery('SELECT @p_resultado AS resultado', [], conn);
      return extractFirstInteger(rows);
    }

    await conn.query('CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
    const [rows] = await conn.query('SELECT @p_resultado AS resultado');
    return extractFirstInteger(rows);
  } finally {
    conn.release();
  }
}
async function authorizeAndServeIndex(req, res) {
  const { codigoUsuario, otp } = extractAuthParams(req.query || {});
  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  const poolRef = resolvePoolReference();
  if (!poolRef) {
    res.status(503).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  try {
    const resultado = await validarOtp(poolRef, codigoUsuario, otp);
    if (resultado !== 1) {
      res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
      return;
    }
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (error) {
    logError(error, 'INDEX OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
}
// OTP_GATE_ENABLED_END

const app = express();
app.use(express.json({ limit: '1mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

let pool;

app.get('/api/proveedores-pendientes', async (req, res) => {
  try {
    const [rows] = await runQuery(pool, 'CALL get_proveedores_saldos_pendientes()');
    res.json({ ok: true, data: rows[0] || [] });
  } catch (error) {
    logError(error, 'Error en proveedores pendientes');
    res.status(500).json({ ok: false, message: 'ERROR_PROVEEDORES' });
  }
});

app.get('/api/cuentas-bancarias', async (req, res) => {
  try {
    const [rows] = await runQuery(pool, 'CALL get_cuentasbancarias()');
    res.json({ ok: true, data: rows[0] || [] });
  } catch (error) {
    logError(error, 'Error en cuentas bancarias');
    res.status(500).json({ ok: false, message: 'ERROR_CUENTAS' });
  }
});

app.get('/api/next-numero-documento', async (req, res) => {
  const tipo = req.query.tipo || 'RCC';
  try {
    const [rows] = await runQuery(
      pool,
      "SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ?",
      [tipo]
    );
    res.json({ ok: true, next: rows?.[0]?.next || 1 });
  } catch (error) {
    logError(error, 'Error en next numero documento');
    res.status(500).json({ ok: false, message: 'ERROR_NUMERO' });
  }
});

app.post('/api/recibos-proveedor', async (req, res) => {
  const {
    codigo_provedor,
    fecha,
    tipo_documento,
    numero_documento,
    codigo_cuentabancaria,
    monto,
    descripcion
  } = req.body || {};

  if (!codigo_provedor || !fecha || !tipo_documento || !numero_documento || !codigo_cuentabancaria || !monto) {
    return res.status(400).json({ ok: false, message: 'DATOS_INCOMPLETOS' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const insertSql = `
      INSERT INTO mov_contable_prov (
        tipo_documento_compra,
        num_documento_compra,
        codigo_provedor,
        codigo_cuentabancaria,
        monto,
        saldo,
        fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await runQuery(conn, insertSql, [
      tipo_documento,
      numero_documento,
      codigo_provedor,
      codigo_cuentabancaria,
      monto,
      monto,
      fecha
    ]);

    await runQuery(conn, 'CALL aplicar_recibo_a_facturas_prov(?, ?, ?)', [
      codigo_provedor,
      numero_documento,
      monto
    ]);

    await runQuery(conn, 'CALL actualizarsaldosprovedores(?, ?, ?)', [codigo_provedor, tipo_documento, monto]);

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    logError(error, 'Error registrando recibo proveedor');
    res.status(500).json({ ok: false, message: 'ERROR_REGISTRO' });
  } finally {
    conn.release();
  }
});

ensureLogFiles();
initDb()
  .then((dbPool) => {
    pool = dbPool;
    app.listen(PORT, '127.0.0.1', () => {
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logError(error, 'No se pudo iniciar servidor');
    process.exit(1);
  });
