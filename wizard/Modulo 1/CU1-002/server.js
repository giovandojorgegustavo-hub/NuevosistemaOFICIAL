const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');
const mysql = require('mysql2/promise');

const PORT = Number(process.env.PORT || getUseCasePort('CU1-002'));
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG_PATH = path.resolve(ROOT_DIR, '../../..', 'erp.yml');
const SESSION_COOKIE_NAME = 'cu002_session';
const SESSION_TTL_SECONDS = 60 * 30;
const sessionStore = new Map();

function loadErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  const data = yaml.parse(content);
  const connection = data.connections && data.connections[0];
  if (!connection || !connection.dsn || !connection.name) {
    throw new Error('Invalid erp.yml: missing connections');
  }
  return {
    dsn: connection.dsn,
    name: connection.name,
    google_maps: data.google_maps
  };
}

function parseMysqlDsn(dsn, dbName) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('Invalid DSN format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: dbName
  };
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  let index = 1;
  let filename;
  do {
    const suffix = String(index).padStart(3, '0');
    filename = `CU002-${stamp}-${suffix}.log`;
    index += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));
  return path.join(LOG_DIR, filename);
}

const LOG_FILE = ensureLogFile();

function logLine(message, isError = false) {
  const line = `[${new Date().toISOString()}] ${message}`;
  if (isError) {
    console.error(line);
  } else {
    console.log(line);
  }
  fs.appendFileSync(LOG_FILE, `${line}\n`);
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function createSession(codigoUsuario) {
  const token = crypto.randomBytes(24).toString('hex');
  sessionStore.set(token, {
    codigoUsuario,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  });
  return token;
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const session = sessionStore.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessionStore.delete(token);
    return null;
  }
  return { token, ...session };
}

function requireApiSession(req, res, next) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  req.auth = { codigo_usuario: session.codigoUsuario, token: session.token };
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
    const token = createSession(codigoUsuario);
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
    );
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (error) {
    logLine(`ERROR INDEX OTP VALIDATION: ${error.stack || error.message}`, true);
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
}
// OTP_GATE_ENABLED_END

const app = express();
app.use(express.json({ limit: '1mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

let pool;
let config;

async function initDb() {
  config = loadErpConfig();
  const dbConfig = parseMysqlDsn(config.dsn, config.name);
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10
  });
  logLine('DB pool created');
}

async function execQuery(sql, params = [], connection = pool) {
  logLine(`SQL: ${sql} | Params: ${JSON.stringify(params)}`);
  const [rows] = await connection.execute(sql, params);
  return rows;
}

app.use((req, res, next) => {
  logLine(`HTTP ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  return requireApiSession(req, res, next);
});

app.get('/api/config', (req, res) => {
  res.json({ google_maps: config.google_maps });
});

app.get('/api/paquetes-pendientes', async (req, res) => {
  try {
    const rows = await execQuery('CALL get_paquetes_por_estado(?)', ['pendiente empacar']);
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR paquetes-pendientes: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/mov-contable-detalle', async (req, res) => {
  const tipo = req.query.tipo_documento;
  const numero = req.query.numero_documento;
  if (!tipo || !numero) {
    return res.status(400).json({ error: 'tipo_documento and numero_documento required' });
  }
  try {
    const rows = await execQuery('CALL get_mov_contable_detalle(?, ?)', [tipo, numero]);
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR mov-contable-detalle: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const rows = await execQuery('CALL get_bases()');
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR bases: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/reasignar-base', async (req, res) => {
  const { vtipo_documento, vcodigo_paquete, vcodigo_base, vCodigo_base_nueva, vcodigo_usuario } = req.body || {};
  const usuarioSesion = req.auth && req.auth.codigo_usuario ? String(req.auth.codigo_usuario).trim() : '';
  const usuarioPayload = vcodigo_usuario ? String(vcodigo_usuario).trim() : '';
  const usuarioFinal = usuarioPayload || usuarioSesion;
  if (!vtipo_documento || !vcodigo_paquete || !vcodigo_base || !vCodigo_base_nueva || !usuarioFinal) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (usuarioPayload && usuarioSesion && usuarioPayload !== usuarioSesion) {
    return res.status(403).json({ error: 'Código de usuario inválido.' });
  }
  if (String(vCodigo_base_nueva).trim() === String(vcodigo_base).trim()) {
    return res.status(400).json({ error: 'La base nueva debe ser distinta a la base actual.' });
  }

  try {
    const basesRows = await execQuery('CALL get_bases()');
    const bases = basesRows[0] || [];
    const baseExiste = bases.some((base) => String(base.codigo_base) === String(vCodigo_base_nueva));
    if (!baseExiste) {
      return res.status(400).json({ error: 'Código de base inválido.' });
    }

    const userRows = await execQuery(
      'SELECT 1 FROM usuarios WHERE codigo_usuario = ? LIMIT 1',
      [usuarioFinal]
    );
    if (!userRows || userRows.length === 0) {
      return res.status(400).json({ error: 'Código de usuario inválido.' });
    }
  } catch (err) {
    logLine(`ERROR validar usuario: ${err.stack || err.message}`, true);
    return res.status(500).json({ error: 'DB error' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await execQuery(
      'INSERT INTO Log_reasignacionBase (tipo_documento, numero_documento, codigo_base_actual, codigo_base_reasignada, codigo_usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
      [vtipo_documento, vcodigo_paquete, vcodigo_base, vCodigo_base_nueva, usuarioFinal],
      connection
    );
    await execQuery('CALL get_actualizarbasespaquete(?, ?, ?)', [vtipo_documento, vcodigo_paquete, vCodigo_base_nueva], connection);
    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    logLine(`ERROR reasignar-base: ${err.stack || err.message}`, true);
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Código de usuario inválido.' });
    }
    res.status(500).json({ error: 'DB error' });
  } finally {
    connection.release();
  }
});

initDb()
  .then(() => {
    app.listen(PORT, '127.0.0.1', () => {
      logLine(`CU002 server listening on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((err) => {
    logLine(`ERROR init: ${err.stack || err.message}`, true);
    process.exit(1);
  });
