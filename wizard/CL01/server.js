const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const crypto = require('crypto');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', 'erp.yml');
const LOG_PREFIX = 'CL01';

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
    dsn: connection.dsn,
    mainPort: Number(data.main_port || 0)
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return {
    pool: mysql.createPool({
      ...dbConfig,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }),
    port: config.mainPort
  };
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

const sessions = new Map();

function requireSession(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ ok: false, message: 'UNAUTHORIZED' });
  }
  req.session = sessions.get(token);
  req.sessionToken = token;
  return next();
}

function normalizeUser(userInput) {
  return String(userInput || '').trim();
}

function normalizePassword(passwordInput) {
  return String(passwordInput || '').trim();
}

async function logDbError(pool, codigoUsuario, message, detail) {
  try {
    const conn = await pool.getConnection();
    try {
      await runQuery(conn, 'CALL log_error(?, ?, ?)', [codigoUsuario, message, detail]);
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'No se pudo registrar log_error');
  }
}

async function logFailedLogin(pool, codigoUsuario, usuarioInput, ip, message) {
  try {
    const conn = await pool.getConnection();
    try {
      await runQuery(conn, 'CALL log_intento_fallido(?, ?, ?, ?)', [codigoUsuario, usuarioInput, ip, message]);
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'No se pudo registrar log_intento_fallido');
  }
}

async function logSession(pool, codigoUsuario, ip) {
  const conn = await pool.getConnection();
  try {
    await runQuery(conn, 'CALL log_sesion(?, ?)', [codigoUsuario, ip]);
  } finally {
    conn.release();
  }
}

async function logTrace(pool, codigoUsuario, codigoUsecase) {
  const conn = await pool.getConnection();
  try {
    await runQuery(conn, 'CALL log_traza_sesion(?, ?)', [codigoUsuario, codigoUsecase]);
  } finally {
    conn.release();
  }
}

async function getUsecases(pool, usuario) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await runQuery(conn, 'CALL get_usecases_usuario(?)', [usuario]);
    return rows[0] || [];
  } finally {
    conn.release();
  }
}

async function validateCredentials(pool, usuario, password) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await runQuery(conn, 'CALL validar_credenciales_usuario(?, ?)', [usuario, password]);
    const data = rows[0] && rows[0][0] ? rows[0][0] : null;
    if (data) {
      return { ok: true, codigo_usuario: data.codigo_usuario, nombre: data.nombre };
    }

    const [userRows] = await runQuery(
      conn,
      'SELECT u.codigo_usuario FROM usuarios u WHERE (u.codigo_usuario COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR u.nombre COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci OR CAST(u.numero AS CHAR) COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci) LIMIT 1',
      [usuario, usuario, usuario]
    );
    if (!userRows || !userRows.length) {
      return { ok: false, code: 1 };
    }
    return { ok: false, code: 2 };
  } finally {
    conn.release();
  }
}

app.post('/api/login', async (req, res) => {
  const usuario = normalizeUser(req.body.usuario);
  const password = normalizePassword(req.body.password);
  const ip = getClientIp(req);

  if (!usuario || !password) {
    return res.status(400).json({ ok: false, message: 'MISSING_FIELDS' });
  }

  try {
    const { pool } = app.locals.db;
    const result = await validateCredentials(pool, usuario, password);
    if (!result.ok) {
      const message = result.code === 1 ? 'USUARIO_ERRONEO' : 'PASSWORD_ERRONEA';
      await logFailedLogin(pool, null, usuario, ip, message);
      logLine(`LOGIN FALLIDO: usuario=${usuario} ip=${ip} code=${result.code}`, 'WARN');
      return res.status(401).json({ ok: false, code: result.code, message });
    }

    await logSession(pool, result.codigo_usuario, ip);
    const usecases = await getUsecases(pool, usuario);
    const token = crypto.randomUUID();
    sessions.set(token, {
      codigo_usuario: result.codigo_usuario,
      nombre: result.nombre,
      usuario_input: usuario,
      ip,
      login_time: new Date()
    });

    return res.json({
      ok: true,
      token,
      user: { codigo_usuario: result.codigo_usuario, nombre: result.nombre },
      usecases
    });
  } catch (error) {
    logError(error, 'LOGIN ERROR');
    const { pool } = app.locals.db;
    await logDbError(pool, null, 'LOGIN_ERROR', error.message);
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/session', requireSession, async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const usecases = await getUsecases(pool, req.session.usuario_input);
    return res.json({
      ok: true,
      user: { codigo_usuario: req.session.codigo_usuario, nombre: req.session.nombre },
      usecases
    });
  } catch (error) {
    logError(error, 'SESSION ERROR');
    const { pool } = app.locals.db;
    await logDbError(pool, req.session.codigo_usuario, 'SESSION_ERROR', error.message);
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/trace', requireSession, async (req, res) => {
  const codigoUsecase = req.body.codigo_usecase || null;
  try {
    const { pool } = app.locals.db;
    await logTrace(pool, req.session.codigo_usuario, codigoUsecase);
    logLine(`TRACE: usuario=${req.session.codigo_usuario} usecase=${codigoUsecase || 'null'}`);
    return res.json({ ok: true });
  } catch (error) {
    logError(error, 'TRACE ERROR');
    const { pool } = app.locals.db;
    await logDbError(pool, req.session.codigo_usuario, 'TRACE_ERROR', error.message);
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/logout', requireSession, async (req, res) => {
  try {
    const { pool } = app.locals.db;
    await logTrace(pool, req.session.codigo_usuario, null);
    logLine(`LOGOUT: usuario=${req.session.codigo_usuario}`);
    sessions.delete(req.sessionToken);
    return res.json({ ok: true });
  } catch (error) {
    logError(error, 'LOGOUT ERROR');
    const { pool } = app.locals.db;
    await logDbError(pool, req.session.codigo_usuario, 'LOGOUT_ERROR', error.message);
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

async function start() {
  ensureLogFile();
  const db = await initDb();
  app.locals.db = db;
  const port = db.port || 3000;
  if (!db.port) {
    logLine('main_port no configurado en erp.yml. Usando 3000 por defecto.', 'WARN');
  }
  app.listen(port, () => {
    logLine(`Servidor CL01 escuchando en puerto ${port}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
