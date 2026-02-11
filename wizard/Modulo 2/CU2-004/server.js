const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU2-004';
const PORT = Number(process.env.PORT || 3012);

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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/bases', async (req, res) => {
  try {
    const conn = await app.locals.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_bases()');
      const rows = unwrapRows(result).map((row) => ({
        codigo_base: row.codigo_base,
        nombre: row.nombre
      }));
      return res.json({ ok: true, rows });
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

  const vcodigo_base = String(payload.vcodigo_base || '').trim();
  const vnombre_packing_nuevo = String(payload.vnombre_packing_nuevo || '').trim();
  const vtipo_packing_nuevo = String(payload.vtipo_packing_nuevo || '').trim();
  const vdescripcion_packing_nuevo = String(payload.vdescripcion_packing_nuevo || '').trim();

  const numberRegex = /^\d+$/;
  if (!vcodigo_base || !numberRegex.test(vcodigo_base)) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_CODIGO_BASE' });
  }
  if (!vnombre_packing_nuevo || !vtipo_packing_nuevo || !vdescripcion_packing_nuevo) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_FIELDS_REQUIRED' });
  }

  const conn = await app.locals.pool.getConnection();

  try {
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
    app.listen(PORT, () => {
      logLine(`SERVER_START: http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER_START_ERROR');
    process.exit(1);
  }
}

start();
