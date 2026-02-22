const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU2-004';
const PORT = Number(process.env.PORT || getUseCasePort('CU2-004'));

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const now = new Date();
  const base = `${LOG_PREFIX}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  global.logFileName = filename;
  global.logFilePath = path.join(LOG_DIR, filename);
  global.logStream = fs.createWriteStream(global.logFilePath, { flags: 'a' });
  logLine(`LOG_FILE: ${filename}`);
}

function logLine(message, level = 'INFO') {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (global.logStream) {
    global.logStream.write(`${line}\n`);
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
    dsn: connection.dsn,
    name: connection.name || ''
  };
}

async function initDb() {
  const config = parseErpConfig();
  const parsed = parseDsn(config.dsn);
  const database = config.name || parsed.database;
  logLine(`DB_CONFIG: name=${config.name} dsn=${config.dsn}`);

  return mysql.createPool({
    ...parsed,
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

function unwrapRows(result) {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
}

function normalizeUserCode(value) {
  return String(value ?? '').trim();
}

function hasValidUserCode(value) {
  return /^[A-Za-z0-9-]{1,36}$/.test(String(value || '').trim());
}

function normalizeBaseCode(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? text : '';
}

function mapBaseRow(row) {
  return {
    codigo_base: normalizeBaseCode(row?.codigo_base),
    nombre: String(row?.nombre ?? '').trim()
  };
}

function mapPrivRow(row) {
  const values = Object.values(row || {});
  const base = row?.codigo_base ?? row?.base ?? values[0] ?? '';
  const priv = row?.privilegio ?? row?.priv ?? values[1] ?? '';
  const baseAux = row?.base_aux ?? row?.auxiliar ?? values[2] ?? '';

  return {
    vBase: normalizeBaseCode(base),
    vPriv: String(priv ?? '').trim().toUpperCase(),
    vBaseAux: baseAux === null || baseAux === undefined ? '' : String(baseAux).trim()
  };
}

function resolveBaseText(privData, bases) {
  const baseCode = normalizeBaseCode(privData?.vBase);
  const foundBase = (bases || []).find((row) => String(row.codigo_base) === String(baseCode));
  if (foundBase && foundBase.nombre) {
    return `${foundBase.codigo_base} - ${foundBase.nombre}`;
  }
  if (privData?.vBaseAux) {
    return `${baseCode} - ${privData.vBaseAux}`;
  }
  return baseCode;
}

function extractCodigoUsuario(source) {
  const raw = source?.Codigo_usuario ?? source?.codigo_usuario ?? source?.vUsuario ?? source?.vCodigo_usuario;
  return normalizeUserCode(raw);
}

async function loadPrivData(conn, codigoUsuario) {
  const [result] = await runQuery(conn, 'CALL get_priv_usuario(?)', [codigoUsuario]);
  const rows = unwrapRows(result);
  if (!rows.length) {
    return null;
  }
  return mapPrivRow(rows[0]);
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/bases', async (req, res) => {
  const codigoUsuario = extractCodigoUsuario(req.query || {});
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  try {
    const conn = await app.locals.pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuario);
      if (!privData || !privData.vBase) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }

      const [result] = await runQuery(conn, 'CALL get_bases()');
      const allBases = unwrapRows(result).map(mapBaseRow).filter((row) => row.codigo_base);

      const rows =
        privData.vPriv === 'ALL'
          ? allBases
          : allBases.filter((row) => String(row.codigo_base) === String(privData.vBase));

      const fallbackRows = rows.length
        ? rows
        : [
            {
              codigo_base: privData.vBase,
              nombre: privData.vBaseAux || privData.vBase
            }
          ];

      return res.json({
        ok: true,
        rows: fallbackRows,
        vPriv: privData.vPriv,
        vBase: privData.vBase,
        vBaseTexto: resolveBaseText(privData, allBases)
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'BASES_ERROR');
    return res.status(500).json({ ok: false, message: 'BASES_ERROR' });
  }
});

app.post('/api/guardar-packing', async (req, res) => {
  const payload = req.body || {};

  const codigoUsuario = extractCodigoUsuario(payload);
  const vcodigo_base = String(payload.vcodigo_base || '').trim();
  const vnombre_packing_nuevo = String(payload.vnombre_packing_nuevo || '').trim();
  const vtipo_packing_nuevo = String(payload.vtipo_packing_nuevo || '').trim();
  const vdescripcion_packing_nuevo = String(payload.vdescripcion_packing_nuevo || '').trim();

  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  const numberRegex = /^\d+$/;
  if (!vcodigo_base || !numberRegex.test(vcodigo_base)) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_CODIGO_BASE' });
  }
  if (!vnombre_packing_nuevo || !vtipo_packing_nuevo || !vdescripcion_packing_nuevo) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_FIELDS_REQUIRED' });
  }

  const conn = await app.locals.pool.getConnection();

  try {
    const privData = await loadPrivData(conn, codigoUsuario);
    if (!privData || !privData.vBase) {
      return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
    }

    if (privData.vPriv !== 'ALL' && String(vcodigo_base) !== String(privData.vBase)) {
      return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
    }

    const [basesResult] = await runQuery(conn, 'CALL get_bases()');
    const allBases = unwrapRows(basesResult).map(mapBaseRow).filter((row) => row.codigo_base);
    const baseExists = allBases.some((row) => String(row.codigo_base) === String(vcodigo_base));
    if (!baseExists) {
      return res.status(400).json({ ok: false, message: 'VALIDATION_CODIGO_BASE' });
    }

    logSql('BEGIN');
    await conn.beginTransaction();

    const [nextRows] = await runQuery(conn, 'SELECT COALESCE(MAX(codigo_packing), 0) + 1 AS next FROM packing');
    const vcodigo_packing_nuevo = Number(nextRows?.[0]?.next || 1);

    await runQuery(
      conn,
      'INSERT INTO packing (codigo_packing, nombre, tipo, descripcion, created_at) VALUES (?, ?, ?, ?, NOW())',
      [vcodigo_packing_nuevo, vnombre_packing_nuevo, vtipo_packing_nuevo, vdescripcion_packing_nuevo]
    );

    await runQuery(conn, 'INSERT INTO basespacking (codigo_base, codigo_packing) VALUES (?, ?)', [
      Number(vcodigo_base),
      vcodigo_packing_nuevo
    ]);

    logSql('COMMIT');
    await conn.commit();

    return res.json({
      ok: true,
      vcodigo_packing_nuevo
    });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'GUARDAR_PACKING_ERROR');
    return res.status(500).json({ ok: false, message: 'GUARDAR_PACKING_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.pool = await initDb();
    app.listen(PORT, '127.0.0.1', () => {
      logLine(`SERVER_START: http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER_START_ERROR');
    process.exit(1);
  }
}

start();
