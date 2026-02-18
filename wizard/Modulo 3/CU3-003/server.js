const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU3-003';
const PORT = 3015;
const DECIMAL_2_REGEX = /^(?:0|[1-9]\d*)(?:[\.,]\d{1,2})?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

let logStream;
let pool;

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function compactDate(now) {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}

function createExecutionLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const base = `${LOG_PREFIX}-${compactDate(new Date())}`;
  let suffix = 1;
  let filename;
  do {
    filename = `${base}-${String(suffix).padStart(3, '0')}.log`;
    suffix += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  return path.join(LOG_DIR, filename);
}

function logLine(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }

  if (logStream) {
    logStream.write(`${line}\n`);
  }
}

function logInfo(message) {
  logLine('INFO', message);
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  logLine('ERROR', context ? `${context} | ${detail}` : detail);
}

function logSql(sql, params) {
  const serializedParams = Array.isArray(params) ? JSON.stringify(params) : '[]';
  logLine('SQL', `${sql} | params=${serializedParams}`);
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

function getConnectionFromConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const config = yaml.parse(raw);

  if (!config || !Array.isArray(config.connections) || config.connections.length === 0) {
    throw new Error('No se encontro connections en erp.yml');
  }

  const selected = config.connections[0];
  if (!selected.dsn) {
    throw new Error('No se encontro {dsn} en erp.yml');
  }

  return {
    name: selected.name || '',
    dsn: selected.dsn
  };
}

async function initDbPool() {
  const connection = getConnectionFromConfig();
  const parsed = parseDsn(connection.dsn);
  const database = connection.name || parsed.database;

  logInfo(`DB CONFIG | name=${connection.name} dsn=${connection.dsn}`);

  return mysql.createPool({
    ...parsed,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

async function runQuery(conn, sql, params = []) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

function parsePositiveDecimal(value) {
  const raw = String(value).trim();
  if (!DECIMAL_2_REGEX.test(raw)) {
    return null;
  }

  const normalized = raw.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
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
app.use(express.json({ limit: '2mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

app.use((req, res, next) => {
  logInfo(`ENDPOINT ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/bootstrap', async (req, res) => {
  try {
    const [proveedoresResult] = await runQuery(pool, 'CALL get_proveedores()');
    const [productosResult] = await runQuery(pool, 'CALL get_productos()');
    const [basesResult] = await runQuery(pool, 'CALL get_bases()');
    const [nextResult] = await runQuery(
      pool,
      'SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ?',
      ['NCC']
    );

    res.json({
      ok: true,
      data: {
        vFecha: todayYmd(),
        vTipo_documento_compra: 'NCC',
        vNum_documento_compra: nextResult?.[0]?.next || 1,
        vProveedores: proveedoresResult?.[0] || [],
        vProductos: productosResult?.[0] || [],
        vBases: basesResult?.[0] || []
      }
    });
  } catch (error) {
    logError(error, 'BOOTSTRAP_ERROR');
    res.status(500).json({ ok: false, message: 'ERROR_BOOTSTRAP' });
  }
});

app.post('/api/nota-credito-proveedor', async (req, res) => {
  const payload = req.body || {};

  const vFecha = payload.vFecha;
  const vTipo_documento_compra = String(payload.vTipo_documento_compra || 'NCC').trim();
  const vNum_documento_compra = parsePositiveInt(payload.vNum_documento_compra);
  const vCodigo_provedor = parsePositiveInt(payload.vCodigo_provedor);
  const vDetalleNotaCredito = Array.isArray(payload.vDetalleNotaCredito) ? payload.vDetalleNotaCredito : [];

  if (!vFecha || !vTipo_documento_compra || !vNum_documento_compra || !vCodigo_provedor || !vDetalleNotaCredito.length) {
    return res.status(400).json({ ok: false, message: 'DATOS_INCOMPLETOS' });
  }
  if (!DATE_REGEX.test(vFecha)) {
    return res.status(400).json({ ok: false, message: 'FECHA_INVALIDA' });
  }
  if (vTipo_documento_compra !== 'NCC') {
    return res.status(400).json({ ok: false, message: 'TIPO_DOCUMENTO_INVALIDO' });
  }

  const detalleNormalizado = [];
  for (let i = 0; i < vDetalleNotaCredito.length; i += 1) {
    const item = vDetalleNotaCredito[i] || {};
    const codigo_base = parsePositiveInt(item.codigo_base);
    const codigo_producto = parsePositiveInt(item.codigo_producto);
    const cantidad = parsePositiveDecimal(item.cantidad);
    const monto = parsePositiveDecimal(item.monto);

    if (!codigo_base || !codigo_producto || !cantidad || !monto) {
      return res.status(400).json({ ok: false, message: 'DETALLE_INVALIDO' });
    }

    detalleNormalizado.push({
      ordinal: i + 1,
      codigo_base,
      codigo_producto,
      cantidad,
      saldo: 0,
      monto
    });
  }

  const vTotal_nota = Number(
    detalleNormalizado.reduce((acc, item) => acc + item.cantidad * item.monto, 0).toFixed(2)
  );
  if (vTotal_nota <= 0) {
    return res.status(400).json({ ok: false, message: 'TOTAL_INVALIDO' });
  }

  let conn;

  try {
    conn = await pool.getConnection();
    logSql('BEGIN', []);
    await conn.beginTransaction();

    await runQuery(
      conn,
      `INSERT INTO mov_contable_prov (
        tipo_documento_compra,
        num_documento_compra,
        codigo_provedor,
        fecha,
        monto,
        saldo
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [vTipo_documento_compra, vNum_documento_compra, vCodigo_provedor, vFecha, vTotal_nota, vTotal_nota]
    );

    for (const item of detalleNormalizado) {
      await runQuery(
        conn,
        `INSERT INTO detalle_mov_contable_prov (
          tipo_documento_compra,
          num_documento_compra,
          codigo_provedor,
          codigo_base,
          ordinal,
          codigo_producto,
          cantidad,
          cantidad_entregada,
          saldo,
          monto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          vTipo_documento_compra,
          vNum_documento_compra,
          vCodigo_provedor,
          item.codigo_base,
          item.ordinal,
          item.codigo_producto,
          item.cantidad,
          item.cantidad,
          item.monto
        ]
      );
    }

    for (const item of detalleNormalizado) {
      await runQuery(conn, 'CALL aplicar_nota_credito_partidas_prov(?, ?, ?, ?, ?)', [
        vTipo_documento_compra,
        vNum_documento_compra,
        vCodigo_provedor,
        item.codigo_producto,
        item.cantidad
      ]);
    }

    for (const item of detalleNormalizado) {
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        item.codigo_base,
        item.codigo_producto,
        item.cantidad,
        vTipo_documento_compra,
        vNum_documento_compra
      ]);
    }

    await runQuery(conn, 'CALL aplicar_nota_credito_a_facturas_prov(?, ?, ?)', [
      vCodigo_provedor,
      vNum_documento_compra,
      vTotal_nota
    ]);

    await runQuery(conn, 'CALL actualizarsaldosprovedores(?, ?, ?)', [
      vCodigo_provedor,
      vTipo_documento_compra,
      vTotal_nota
    ]);

    logSql('COMMIT', []);
    await conn.commit();

    res.json({ ok: true, data: { vTotal_nota } });
  } catch (error) {
    if (conn) {
      logSql('ROLLBACK', []);
      await conn.rollback();
    }
    logError(error, 'REGISTRAR_NCC_ERROR');
    res.status(500).json({ ok: false, message: 'ERROR_REGISTRAR_NCC' });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

async function startServer() {
  const logPath = createExecutionLogFile();
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logInfo(`LOG FILE ${path.basename(logPath)}`);

  pool = await initDbPool();

  app.listen(PORT, () => {
    logInfo(`SERVER STARTED http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logError(error, 'STARTUP_FATAL');
  process.exit(1);
});
