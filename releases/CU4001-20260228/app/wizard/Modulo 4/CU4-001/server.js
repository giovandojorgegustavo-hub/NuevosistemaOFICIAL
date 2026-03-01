const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU4-001';
const PORT = Number(process.env.PORT || getUseCasePort('CU4-001'));
const API_SESSION_COOKIE = 'cu4_001_session';
const API_SESSION_TTL_MS = 15 * 60 * 1000;
const apiSessions = new Map();

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
  logLine(`LOG FILE: ${filename}`);
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

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function getSqlLines(raw) {
  return raw
    .split('\n')
    .filter((line) => line.includes('[SQL]') || line.includes('SQL:'))
    .map((line) => line.trim())
    .filter(Boolean);
}

function unwrapProcedureRows(rows) {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows || [];
}

function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function normalizeFechaForDb(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return timestamp();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const timePart = timestamp().split(' ')[1];
    return `${raw} ${timePart}`;
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(raw)) {
    return raw.replace('T', ' ') + ':00';
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw.replace('T', ' ');
  }
  return null;
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

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const pairs = header.split(';');
  const cookies = {};
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (!key) continue;
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function createApiSession(codigoUsuario) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + API_SESSION_TTL_MS;
  apiSessions.set(token, { codigoUsuario: String(codigoUsuario || ''), expiresAt });
  return token;
}

function getValidApiSession(token) {
  if (!token) return null;
  const found = apiSessions.get(token);
  if (!found) return null;
  if (found.expiresAt < Date.now()) {
    apiSessions.delete(token);
    return null;
  }
  return found;
}

function extractAuthParamsFromRequest(req) {
  const fromHeaders = extractAuthParams({
    vUsuario: req.get('x-codigo-usuario'),
    vOTP: req.get('x-otp')
  });
  if (fromHeaders.codigoUsuario && fromHeaders.otp) {
    return fromHeaders;
  }
  const fromQuery = extractAuthParams(req.query || {});
  if (fromQuery.codigoUsuario && fromQuery.otp) {
    return fromQuery;
  }
  return extractAuthParams(req.body || {});
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
  if (app.locals && app.locals.db && typeof app.locals.db.getConnection === 'function') return app.locals.db;
  if (app.locals && app.locals.db && app.locals.db.pool) return app.locals.db.pool;
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
  const { codigoUsuario, otp } = extractAuthParamsFromRequest(req);
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
    const sessionToken = createApiSession(codigoUsuario);
    res.cookie(API_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: API_SESSION_TTL_MS,
      path: '/'
    });
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (error) {
    logError(error, 'INDEX OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
}
// OTP_GATE_ENABLED_END

class AppError extends Error {
  constructor(message, status = 400, code = message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDecimalWithMaxTwoDigits(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value || '').trim());
}

function isExplicitConfirmation(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

function normalizeDetalle(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw new AppError('DATA_REQUIRED', 400, 'DATA_REQUIRED');
  }
  const normalized = rawItems.map((item) => {
    const codigoProducto = String(item?.vcodigo_producto || '').trim();
    const rawCantidad = String(item?.Vcantidad || '').trim();
    const cantidad = toFiniteNumber(rawCantidad);
    if (!codigoProducto) {
      throw new AppError('ITEM_PRODUCT_REQUIRED', 422, 'ITEM_INVALID');
    }
    if (!isDecimalWithMaxTwoDigits(rawCantidad)) {
      throw new AppError('ITEM_QUANTITY_DECIMALS_INVALID', 422, 'ITEM_INVALID');
    }
    if (cantidad === null || cantidad <= 0) {
      throw new AppError('ITEM_QUANTITY_INVALID', 422, 'ITEM_INVALID');
    }
    return { codigoProducto, cantidad };
  });
  return normalized;
}

async function getNextDocumentoWithLock(conn, tipodocumento) {
  const lockName = `CU4_001_NUMDOC_${tipodocumento}`;
  const [[lockRow]] = await runQuery(conn, 'SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
  const acquired = Number(lockRow?.acquired || 0);
  if (acquired !== 1) {
    throw new AppError('DOC_NUMBER_LOCK_TIMEOUT', 409, 'DOC_NUMBER_CONFLICT');
  }
  const [[row]] = await runQuery(
    conn,
    'SELECT numdocumentostock FROM movimiento_stock WHERE tipodocumentostock = ? ORDER BY numdocumentostock DESC LIMIT 1 FOR UPDATE',
    [tipodocumento]
  );
  const last = Number(row?.numdocumentostock || 0);
  return { value: last + 1, lockName };
}

async function releaseNamedLock(conn, lockName) {
  if (!lockName) return;
  try {
    await runQuery(conn, 'SELECT RELEASE_LOCK(?)', [lockName]);
  } catch (error) {
    logError(error, `RELEASE_LOCK ERROR (${lockName})`);
  }
}

async function getStockDisponible(conn, codigoBase, codigoProducto) {
  try {
    const [[row]] = await runQuery(conn, 'SELECT erp.get_stock_disponible(?, ?) AS stock_disponible', [
      codigoBase,
      codigoProducto
    ]);
    return Number(row?.stock_disponible || 0);
  } catch (error) {
    const denied =
      error &&
      (error.code === 'ER_PROCACCESS_DENIED_ERROR' ||
        error.code === 'ER_SPECIFIC_ACCESS_DENIED_ERROR' ||
        String(error.message || '').toLowerCase().includes('denied'));
    if (!denied) {
      throw error;
    }
    logLine(
      `WARN: sin permisos para erp.get_stock_disponible, aplicando fallback saldo_stock para base=${codigoBase} producto=${codigoProducto}`,
      'WARN'
    );
    const [[fallbackRow]] = await runQuery(
      conn,
      'SELECT COALESCE(saldo_actual, 0) AS stock_disponible FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ?',
      [codigoBase, codigoProducto]
    );
    return Number(fallbackRow?.stock_disponible || 0);
  }
}

async function validateStockDisponible(conn, codigoBase, detalle) {
  const requiredByProduct = new Map();
  for (const item of detalle) {
    const current = requiredByProduct.get(item.codigoProducto) || 0;
    requiredByProduct.set(item.codigoProducto, current + item.cantidad);
  }
  for (const [codigoProducto, cantidadRequerida] of requiredByProduct.entries()) {
    await runQuery(
      conn,
      'SELECT saldo_actual FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ? FOR UPDATE',
      [codigoBase, codigoProducto]
    );
    const stockDisponible = await getStockDisponible(conn, codigoBase, codigoProducto);
    if (stockDisponible < cantidadRequerida) {
      throw new AppError('STOCK_INSUFICIENTE', 409, 'STOCK_INSUFICIENTE');
    }
  }
}

function mapDatabaseError(error) {
  if (!error) return null;
  if (error instanceof AppError) {
    return error;
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return new AppError('DOC_NUMBER_CONFLICT', 409, 'DOC_NUMBER_CONFLICT');
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('FK_CONSTRAINT_ERROR', 422, 'FK_CONSTRAINT_ERROR');
  }
  if (error.code === 'ER_SIGNAL_EXCEPTION' && String(error.sqlMessage || '').includes('Tipo de documento no soportado')) {
    return new AppError('TIPO_DOCUMENTO_INVALIDO', 422, 'TIPO_DOCUMENTO_INVALIDO');
  }
  return null;
}

async function requireApiAuthorization(req, res, next) {
  const sessionToken = parseCookies(req)[API_SESSION_COOKIE];
  const session = getValidApiSession(sessionToken);
  if (session) {
    return next();
  }

  const { codigoUsuario, otp } = extractAuthParamsFromRequest(req);
  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
  }
  const poolRef = resolvePoolReference();
  if (!poolRef) {
    return res.status(503).json({ ok: false, message: 'AUTH_SERVICE_UNAVAILABLE' });
  }
  try {
    const resultado = await validarOtp(poolRef, codigoUsuario, otp);
    if (resultado !== 1) {
      return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
    }
    const newToken = createApiSession(codigoUsuario);
    res.cookie(API_SESSION_COOKIE, newToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: API_SESSION_TTL_MS,
      path: '/'
    });
    next();
  } catch (error) {
    logError(error, 'API OTP VALIDATION ERROR');
    return res.status(500).json({ ok: false, message: 'AUTH_ERROR' });
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));
app.use('/api', requireApiAuthorization);

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/init', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const tipodocSalida = 'TRS';
      const tipodocEntrada = 'TRE';
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
        [tipodocSalida]
      );
      const vNumdocumentostockSalida = Number(row?.next || 1);
      const vNumdocumentostockEntrada = vNumdocumentostockSalida + 1;

      res.json({
        ok: true,
        data: {
          vFecha: getCurrentDate(),
          vTipodocumentostockSalida: tipodocSalida,
          vTipodocumentostockEntrada: tipodocEntrada,
          vNumdocumentostockSalida,
          vNumdocumentostockEntrada
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'INIT ERROR');
    res.status(500).json({ ok: false, message: 'INIT_ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_bases()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET BASES ERROR');
    res.status(500).json({ ok: false, message: 'GET_BASES_ERROR' });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_productos()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET PRODUCTOS ERROR');
    res.status(500).json({ ok: false, message: 'GET_PRODUCTOS_ERROR' });
  }
});

app.post('/api/transferencias', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha;
  const vConfirmar = payload.vConfirmar;
  const vTipodocumentostockSalida = 'TRS';
  const vTipodocumentostockEntrada = 'TRE';
  const vCodigo_base = payload.vCodigo_base;
  const vCodigo_basedestino = payload.vCodigo_basedestino;
  let vDetalleTransferencia = [];

  if (!vFecha || !vCodigo_base || !vCodigo_basedestino) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  const vFechaDb = normalizeFechaForDb(vFecha);
  if (!vFechaDb) {
    return res.status(422).json({ ok: false, message: 'FECHA_INVALIDA' });
  }
  if (String(vCodigo_base) === String(vCodigo_basedestino)) {
    return res.status(422).json({ ok: false, message: 'BASES_IGUALES' });
  }
  if (!isExplicitConfirmation(vConfirmar)) {
    return res.status(422).json({ ok: false, message: 'CONFIRMACION_REQUERIDA' });
  }
  try {
    vDetalleTransferencia = normalizeDetalle(payload.vDetalleTransferencia);
  } catch (error) {
    const known = mapDatabaseError(error) || error;
    const status = known.status || 400;
    return res.status(status).json({ ok: false, message: known.code || 'ITEM_INVALID' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  let lockSalida = null;
  let lockEntrada = null;
  try {
    logSql('BEGIN');
    await conn.beginTransaction();
    const nextSalida = await getNextDocumentoWithLock(conn, vTipodocumentostockSalida);
    lockSalida = nextSalida.lockName;
    const vNumdocumentostockSalida = nextSalida.value;
    const vNumdocumentostockEntrada = vNumdocumentostockSalida + 1;
    const nextEntrada = await getNextDocumentoWithLock(conn, vTipodocumentostockEntrada);
    lockEntrada = nextEntrada.lockName;

    if (vNumdocumentostockEntrada < Number(nextEntrada.value || 0)) {
      throw new AppError('DOC_NUMBER_CONFLICT', 409, 'DOC_NUMBER_CONFLICT');
    }
    await validateStockDisponible(conn, vCodigo_base, vDetalleTransferencia);

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, codigo_basedestino) VALUES (?, ?, ?, ?, ?)',
      [vTipodocumentostockSalida, vNumdocumentostockSalida, vFechaDb, vCodigo_base, vCodigo_basedestino]
    );

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, codigo_basedestino) VALUES (?, ?, ?, ?, ?)',
      [vTipodocumentostockEntrada, vNumdocumentostockEntrada, vFechaDb, vCodigo_basedestino, vCodigo_base]
    );

    const [[rowSalida]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipodocumentostockSalida, vNumdocumentostockSalida]
    );

    const [[rowEntrada]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipodocumentostockEntrada, vNumdocumentostockEntrada]
    );

    let ordinalSalida = Number(rowSalida?.next || 1);
    let ordinalEntrada = Number(rowEntrada?.next || 1);

    for (const item of vDetalleTransferencia) {
      const codigoProducto = item.codigoProducto;
      const cantidad = item.cantidad;

      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [ordinalSalida, vTipodocumentostockSalida, vNumdocumentostockSalida, codigoProducto, cantidad]
      );
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_base,
        codigoProducto,
        cantidad,
        vTipodocumentostockSalida,
        vNumdocumentostockSalida
      ]);

      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [ordinalEntrada, vTipodocumentostockEntrada, vNumdocumentostockEntrada, codigoProducto, cantidad]
      );
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_basedestino,
        codigoProducto,
        cantidad,
        vTipodocumentostockEntrada,
        vNumdocumentostockEntrada
      ]);

      ordinalSalida += 1;
      ordinalEntrada += 1;
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({
      ok: true,
      data: {
        vTipodocumentostockSalida,
        vTipodocumentostockEntrada,
        vNumdocumentostockSalida,
        vNumdocumentostockEntrada
      }
    });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'TRANSFERENCIA ERROR');
    const knownError = mapDatabaseError(error);
    if (knownError) {
      return res.status(knownError.status).json({ ok: false, message: knownError.code });
    }
    res.status(500).json({ ok: false, message: 'TRANSFERENCIA_ERROR' });
  } finally {
    await releaseNamedLock(conn, lockEntrada);
    await releaseNamedLock(conn, lockSalida);
    conn.release();
  }
});

app.get('/api/sql-logs', (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, lines: [] });
    }
    const raw = fs.readFileSync(global.logFilePath, 'utf-8');
    const lines = getSqlLines(raw);
    res.json({ ok: true, lines });
  } catch (error) {
    logError(error, 'SQL LOGS ERROR');
    res.status(500).json({ ok: false, message: 'SQL_LOGS_ERROR' });
  }
});

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.pool = pool;
  app.listen(PORT, '127.0.0.1', () => {
    logLine(`Servidor CU4001 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
