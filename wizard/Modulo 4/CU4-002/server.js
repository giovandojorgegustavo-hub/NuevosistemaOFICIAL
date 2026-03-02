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
const LOG_PREFIX = 'CU4-002';
const PORT = Number(process.env.PORT || getUseCasePort('CU4-002'));
const AUTH_COOKIE_NAME = 'cu4002_auth';
const AUTH_TTL_SECONDS = Number(process.env.CU4002_AUTH_TTL_SECONDS || 1800);
const AUTH_SECRET = process.env.CU4002_AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const NUMDOC_LOCK_NAME = 'cu4002_numdoc_stock';
const REQUIRED_USECASE = 'CU4002';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SQL_LOGS_ENABLED = process.env.CU4002_ENABLE_SQL_LOGS
  ? process.env.CU4002_ENABLE_SQL_LOGS === 'true'
  : !IS_PRODUCTION;
const SQL_LOGS_ALLOWED_USERS = new Set(
  String(process.env.CU4002_SQL_LOGS_ALLOWED_USERS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
);
const OTP_WINDOW_MS = Number(process.env.CU4002_OTP_WINDOW_MS || 5 * 60 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.CU4002_OTP_MAX_ATTEMPTS || 8);
const API_WINDOW_MS = Number(process.env.CU4002_API_WINDOW_MS || 60 * 1000);
const API_MAX_REQUESTS = Number(process.env.CU4002_API_MAX_REQUESTS || 120);
const AJUSTES_WINDOW_MS = Number(process.env.CU4002_AJUSTES_WINDOW_MS || 60 * 1000);
const AJUSTES_MAX_REQUESTS = Number(process.env.CU4002_AJUSTES_MAX_REQUESTS || 20);
const otpLimiterStore = new Map();
const apiLimiterStore = new Map();
const ajustesLimiterStore = new Map();
const usecaseCache = new Map();

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
  logLine(`DB CONFIG: name=${config.name} dsn=${maskDsn(config.dsn)}`);
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

function formatDateOnly(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(date) {
  return `${formatDateOnly(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateTimeLocal(date) {
  return `${formatDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getCurrentDateTime() {
  const now = new Date();
  return formatDateTime(now);
}

function getCurrentDateTimeLocal() {
  const now = new Date();
  return formatDateTimeLocal(now);
}

function normalizeSqlDateTime(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateTime(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const now = new Date();
      return `${trimmed} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed.replace('T', ' ')}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.replace('T', ' ');
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateTime(parsed);
    }
  }
  return null;
}

function maskDsn(dsn) {
  if (!dsn) return '';
  const tcpMatch = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (tcpMatch) {
    return `mysql://${decodeURIComponent(tcpMatch[1])}:***@tcp(${tcpMatch[3]}:${tcpMatch[4]})/${tcpMatch[5]}`;
  }
  try {
    const parsed = new URL(dsn);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (_error) {
    return String(dsn).replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function hitRateLimit(store, key, windowMs, maxRequests) {
  const now = Date.now();
  const current = store.get(key);
  const recent = (current || []).filter((ts) => now - ts < windowMs);
  recent.push(now);
  store.set(key, recent);
  if (store.size > 5000) {
    for (const [entryKey, timestamps] of store.entries()) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1] > windowMs * 3) {
        store.delete(entryKey);
      }
    }
  }
  return recent.length > maxRequests;
}

function extractUseCaseCodes(rows) {
  const codes = new Set();
  const data = Array.isArray(rows) ? rows : [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    for (const [key, value] of Object.entries(row)) {
      const keyLc = String(key).toLowerCase();
      if (keyLc.includes('usecase') || keyLc.includes('ucase')) {
        const text = String(value || '').trim().toUpperCase();
        if (/^CU\d{4}$/.test(text)) {
          codes.add(text);
        }
      }
      const generic = String(value || '').trim().toUpperCase();
      if (/^CU\d{4}$/.test(generic)) {
        codes.add(generic);
      }
    }
  }
  return Array.from(codes);
}

async function getUserUseCases(poolRef, codigoUsuario) {
  const cacheKey = String(codigoUsuario || '').trim();
  const cached = usecaseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.codes;
  }
  const conn = await poolRef.getConnection();
  try {
    const [rows] = await runQuery(conn, 'CALL get_usecases_usuario(?)', [cacheKey]);
    const codes = extractUseCaseCodes(unwrapProcedureRows(rows));
    usecaseCache.set(cacheKey, {
      codes,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    return codes;
  } finally {
    conn.release();
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function signTokenPayload(payloadEncoded) {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadEncoded)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createAuthToken(codigoUsuario, useCases) {
  const payload = {
    sub: String(codigoUsuario || ''),
    uc: Array.isArray(useCases) ? useCases : [],
    exp: Date.now() + AUTH_TTL_SECONDS * 1000
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }
  const expectedSignature = signTokenPayload(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    if (!payload.exp || Number(payload.exp) < Date.now()) {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
}

function parseCookieHeader(headerValue) {
  if (!headerValue) return {};
  const parts = String(headerValue).split(';');
  const cookies = {};
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) segments.push(`Max-Age=${Math.max(0, Number(options.maxAge) || 0)}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.secure) segments.push('Secure');
  return segments.join('; ');
}

async function requireApiAuth(req, res, next) {
  const ip = getClientIp(req);
  if (hitRateLimit(apiLimiterStore, `api:${ip}`, API_WINDOW_MS, API_MAX_REQUESTS)) {
    return res.status(429).json({ ok: false, message: 'RATE_LIMITED' });
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];
  const payload = verifyAuthToken(token);
  if (!payload || !payload.sub) {
    return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
  }
  const tokenUseCases = Array.isArray(payload.uc) ? payload.uc.map((value) => String(value).toUpperCase()) : [];
  if (!tokenUseCases.includes(REQUIRED_USECASE)) {
    return res.status(403).json({ ok: false, message: 'FORBIDDEN' });
  }
  req.auth = payload;
  next();
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
  const { codigoUsuario, otp } = extractAuthParams(req.query || {});
  const ip = getClientIp(req);
  const otpRateKey = `otp:${ip}:${String(codigoUsuario || '').trim()}`;
  if (hitRateLimit(otpLimiterStore, otpRateKey, OTP_WINDOW_MS, OTP_MAX_ATTEMPTS)) {
    res.status(429).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }
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
    const useCases = await getUserUseCases(poolRef, codigoUsuario);
    if (!useCases.map((value) => String(value).toUpperCase()).includes(REQUIRED_USECASE)) {
      res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
      return;
    }
    const token = createAuthToken(codigoUsuario, useCases);
    res.setHeader(
      'Set-Cookie',
      serializeCookie(AUTH_COOKIE_NAME, token, {
        maxAge: AUTH_TTL_SECONDS,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure: IS_PRODUCTION
      })
    );
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (error) {
    logError(error, 'INDEX OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
}
// OTP_GATE_ENABLED_END

const app = express();
app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.originalUrl || req.path}`);
  next();
});
app.use(express.json({ limit: '1mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));
app.use('/api', requireApiAuth);

app.get('/api/init', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[rowAJE]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJE'"
      );
      const [[rowAJS]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJS'"
      );

      await runQuery(
        conn,
        "INSERT INTO provedores (codigo_provedor, nombre) SELECT 0, 'PROVEEDOR GENERICO' FROM dual WHERE NOT EXISTS (SELECT 1 FROM provedores WHERE codigo_provedor = 0)"
      );

      res.json({
        ok: true,
        data: {
          vFecha: getCurrentDateTimeLocal(),
          vNumdocumentostock_AJE: Number(rowAJE?.next || 1),
          vNumdocumentostock_AJS: Number(rowAJS?.next || 1),
          vCodigo_provedor: 0
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

app.get('/api/productos-stock', async (req, res) => {
  const codigoBase = req.query.codigo_base;
  if (!codigoBase) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        `SELECT p.codigo_producto,
                p.nombre,
                COALESCE(ss.saldo_actual, 0) AS saldo_actual
         FROM productos p
         LEFT JOIN saldo_stock ss
           ON ss.codigo_producto = p.codigo_producto
          AND ss.codigo_base = ?
         ORDER BY p.nombre`,
        [codigoBase]
      );
      res.json({ ok: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET PRODUCTOS STOCK ERROR');
    res.status(500).json({ ok: false, message: 'GET_PRODUCTOS_STOCK_ERROR' });
  }
});

app.get('/api/saldo-stock', async (req, res) => {
  const codigoBase = req.query.codigo_base;
  const codigoProducto = req.query.codigo_producto;
  if (!codigoBase || !codigoProducto) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(saldo_actual, 0) AS saldo_partidas FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ? LIMIT 1',
        [codigoBase, codigoProducto]
      );
      res.json({ ok: true, saldo: row ? Number(row.saldo_partidas) : 0 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET SALDO ERROR');
    res.status(500).json({ ok: false, message: 'GET_SALDO_ERROR' });
  }
});

app.get('/api/costo-ultimo', async (req, res) => {
  const codigoProducto = req.query.codigo_producto;
  if (!codigoProducto) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_ultimo_costo_producto(?)', [codigoProducto]);
      const data = unwrapProcedureRows(rows);
      const row = Array.isArray(data) && data.length ? data[0] : null;
      res.json({ ok: true, costo_unitario: row && row.costo_unitario !== null ? Number(row.costo_unitario) : null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET COSTO ULTIMO ERROR');
    res.status(500).json({ ok: false, message: 'GET_COSTO_ULTIMO_ERROR' });
  }
});

app.post('/api/ajustes', async (req, res) => {
  const ip = getClientIp(req);
  if (hitRateLimit(ajustesLimiterStore, `ajustes:${ip}`, AJUSTES_WINDOW_MS, AJUSTES_MAX_REQUESTS)) {
    return res.status(429).json({ ok: false, message: 'RATE_LIMITED' });
  }
  const payload = req.body || {};
  const vFecha = normalizeSqlDateTime(payload.vFecha || getCurrentDateTime());
  const vCodigo_base = payload.vCodigo_base;
  const vDetalleAjuste = Array.isArray(payload.vDetalleAjuste) ? payload.vDetalleAjuste : [];

  if (!vFecha || !vCodigo_base || !vDetalleAjuste.length) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  let lockTaken = false;
  try {
    logSql('BEGIN');
    await conn.beginTransaction();
    const [[lockRow]] = await runQuery(conn, 'SELECT GET_LOCK(?, 10) AS lock_status', [NUMDOC_LOCK_NAME]);
    if (Number(lockRow?.lock_status) !== 1) {
      throw new Error('NUMDOC_LOCK_TIMEOUT');
    }
    lockTaken = true;

    const [[prov]] = await runQuery(conn, 'SELECT codigo_provedor FROM provedores WHERE codigo_provedor = 0');
    if (!prov) {
      await runQuery(conn, 'INSERT INTO provedores (codigo_provedor, nombre) VALUES (0, ?)', ['PROVEEDOR GENERICO']);
    }

    const [[rowAJE]] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJE'"
    );
    const [[rowAJS]] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJS'"
    );

    const vNumdocumentostock_AJE = Number(rowAJE?.next || 1);
    const vNumdocumentostock_AJS = Number(rowAJS?.next || 1);
    const vCodigo_provedor = 0;

    const normalized = vDetalleAjuste.map((item) => {
      const cantidadSistema = Number(item.Vcantidad_sistema || 0);
      const cantidadReal = Number(item.Vcantidad_real || 0);
      const cantidad = Number(item.Vcantidad || cantidadReal - cantidadSistema);
      const monto = Number(item.Vmonto || 0);
      return {
        vcodigo_producto: item.vcodigo_producto,
        Vcantidad: cantidad,
        Vcantidad_real: cantidadReal,
        Vcantidad_sistema: cantidadSistema,
        Vmonto: monto
      };
    });

    const lineasAJE = normalized.filter((item) => item.Vcantidad > 0);
    const lineasAJS = normalized.filter((item) => item.Vcantidad < 0);
    const lineasCero = normalized.filter((item) => item.Vcantidad === 0);

    if (lineasAJS.length || lineasCero.length) {
      await runQuery(
        conn,
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)',
        ['AJS', vNumdocumentostock_AJS, vFecha, vCodigo_base]
      );

      const [[rowOrdinalAJS]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
        ['AJS', vNumdocumentostock_AJS]
      );
      let ordinalAJS = Number(rowOrdinalAJS?.next || 1);

      for (const item of [...lineasAJS, ...lineasCero]) {
        if (!item.vcodigo_producto) {
          throw new Error('ITEM_INVALID');
        }
        await runQuery(
          conn,
          'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
          [ordinalAJS, 'AJS', vNumdocumentostock_AJS, item.vcodigo_producto, Math.abs(item.Vcantidad)]
        );

        if (item.Vcantidad < 0) {
          await runQuery(conn, 'CALL aplicar_salida_partidas(?, ?, ?, ?)', [
            'AJS',
            vNumdocumentostock_AJS,
            item.vcodigo_producto,
            Math.abs(item.Vcantidad)
          ]);
          await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
            vCodigo_base,
            item.vcodigo_producto,
            Math.abs(item.Vcantidad),
            'AJS',
            vNumdocumentostock_AJS
          ]);
        }

        ordinalAJS += 1;
      }
    }

    if (lineasAJE.length) {
      await runQuery(
        conn,
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)',
        ['AJE', vNumdocumentostock_AJE, vFecha, vCodigo_base]
      );

      const totalMonto = lineasAJE.reduce((acc, item) => acc + Number(item.Vmonto || 0), 0);
      await runQuery(
        conn,
        'INSERT INTO mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, fecha, monto) VALUES (?, ?, ?, ?, ?)',
        ['AJE', vNumdocumentostock_AJE, vCodigo_provedor, vFecha, totalMonto]
      );

      const [[rowOrdinalAJE]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = ? AND num_documento_compra = ? AND codigo_provedor = ?',
        ['AJE', vNumdocumentostock_AJE, vCodigo_provedor]
      );
      let ordinalAJE = Number(rowOrdinalAJE?.next || 1);

      for (const item of lineasAJE) {
        if (!item.vcodigo_producto) {
          throw new Error('ITEM_INVALID');
        }
        await runQuery(
          conn,
          'INSERT INTO detalle_mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_base, ordinal, codigo_producto, cantidad, cantidad_entregada, saldo, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'AJE',
            vNumdocumentostock_AJE,
            vCodigo_provedor,
            vCodigo_base,
            ordinalAJE,
            item.vcodigo_producto,
            item.Vcantidad,
            item.Vcantidad,
            item.Vcantidad,
            item.Vmonto
          ]
        );

        await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
          vCodigo_base,
          item.vcodigo_producto,
          Math.abs(item.Vcantidad),
          'AJE',
          vNumdocumentostock_AJE
        ]);

        ordinalAJE += 1;
      }
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true, vNumdocumentostock_AJE, vNumdocumentostock_AJS });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'AJUSTE ERROR');
    res.status(500).json({ ok: false, message: 'AJUSTE_ERROR' });
  } finally {
    if (lockTaken) {
      try {
        await runQuery(conn, 'SELECT RELEASE_LOCK(?) AS released', [NUMDOC_LOCK_NAME]);
      } catch (lockError) {
        logError(lockError, 'LOCK RELEASE ERROR');
      }
    }
    conn.release();
  }
});

app.get('/api/sql-logs', (req, res) => {
  if (!SQL_LOGS_ENABLED) {
    return res.status(404).json({ ok: false, message: 'NOT_FOUND' });
  }
  const userId = String(req.auth?.sub || '').trim();
  if (!userId || !SQL_LOGS_ALLOWED_USERS.has(userId)) {
    return res.status(403).json({ ok: false, message: 'FORBIDDEN' });
  }
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, lines: [] });
    }
    const raw = fs.readFileSync(global.logFilePath, 'utf-8');
    res.json({ ok: true, lines: getSqlLines(raw) });
  } catch (error) {
    logError(error, 'SQL LOGS ERROR');
    res.status(500).json({ ok: false, message: 'SQL_LOGS_ERROR' });
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.pool = await initDb();
    const server = app.listen(PORT, '127.0.0.1', (listenError) => {
      if (listenError) {
        logError(listenError, 'SERVER LISTEN ERROR');
        process.exit(1);
        return;
      }
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
    server.on('error', (error) => {
      logError(error, 'SERVER ERROR EVENT');
      process.exit(1);
    });
  } catch (error) {
    logError(error, 'SERVER INIT ERROR');
    process.exit(1);
  }
}

start();
