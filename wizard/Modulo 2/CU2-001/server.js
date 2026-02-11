const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU2-001';
const PORT = 3009;

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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/ultima-asistencia', async (req, res) => {
  const codigoBase = req.query.codigo_base;
  const codigoUsuario = req.query.codigo_usuario;
  if (!codigoBase || !codigoUsuario) {
    return res.status(400).json({ ok: false, message: 'CODIGO_BASE_USUARIO_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        'SELECT MAX(fecha) AS ultima_asistencia FROM bitacoraBase WHERE codigo_base = ? AND codigo_usuario = ?',
        [codigoBase, codigoUsuario]
      );
      res.json({ ok: true, ultima_asistencia: row?.ultima_asistencia ?? null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'ULTIMA ASISTENCIA ERROR');
    res.status(500).json({ ok: false, message: 'ULTIMA_ASISTENCIA_ERROR' });
  }
});

app.post('/api/abrir-horario', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha;
  const vFechaRegistro = payload.vFecha_registro || vFecha;
  const vCodigoBase = payload.vCodigo_base;
  const vCodigoUsuario = payload.vCodigo_usuario;

  if (!vFecha || !vCodigoBase || !vCodigoUsuario || !vFechaRegistro) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    const [[row]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(codigo_bitacora), 0) + 1 AS next_codigo FROM bitacoraBase FOR UPDATE'
    );
    const nextCodigo = Number(row?.next_codigo) || 1;

    await runQuery(
      conn,
      'INSERT INTO bitacoraBase (codigo_bitacora, fecha, codigo_base, codigo_usuario) VALUES (?, ?, ?, ?)',
      [nextCodigo, vFechaRegistro, vCodigoBase, vCodigoUsuario]
    );

    logSql('COMMIT');
    await conn.commit();

    res.json({ ok: true, ultima_asistencia: vFechaRegistro });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'ABRIR HORARIO ERROR');
    res.status(500).json({ ok: false, message: 'ABRIR_HORARIO_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.pool = pool;
  app.listen(PORT, () => {
    logLine(`Servidor CU2001 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
