const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function logLine(message) {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  if (global.logStream) {
    global.logStream.write(`${line}\n`);
  }
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const base = `CU002-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
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
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
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
  logLine(`SQL: ${formatted}`);
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function unwrapRows(rows) {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows || [];
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.use(express.static(ROOT_DIR));

app.get('/api/paquetes-pendientes', async (req, res) => {
  try {
    const [rows] = await runQuery(
      req.app.locals.db,
      'CALL get_paquetes_por_estado(?)',
      ['pendiente empacar']
    );
    res.json({
      data: unwrapRows(rows)
    });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar paquetes pendientes.' });
  }
});

app.get('/api/mov-contable-detalle', async (req, res) => {
  const codigoPaquete = req.query.codigo_paquete;
  if (!codigoPaquete) {
    return res.status(400).json({ message: 'codigo_paquete es requerido.' });
  }

  try {
    const [rows] = await runQuery(
      req.app.locals.db,
      'CALL get_mov_contable_detalle(?, ?)',
      ['FAC', codigoPaquete]
    );
    res.json({
      data: unwrapRows(rows)
    });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar detalle contable.' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const [rows] = await runQuery(req.app.locals.db, 'CALL get_bases()');
    res.json({
      data: unwrapRows(rows)
    });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar bases.' });
  }
});

app.post('/api/reasignar-base', async (req, res) => {
  const payload = req.body || {};
  const vtipo_documento = payload.vtipo_documento;
  const vcodigo_paquete = payload.vcodigo_paquete;
  const vcodigo_base = payload.vcodigo_base;
  const vCodigo_base_nueva = payload.vCodigo_base_nueva;
  const vcodigo_usuario = payload.vcodigo_usuario;

  if (!vtipo_documento || !vcodigo_paquete || !vcodigo_base || !vCodigo_base_nueva || !vcodigo_usuario) {
    return res.status(400).json({ message: 'Datos incompletos para reasignar base.' });
  }

  const insertSql =
    'INSERT INTO Log_reasignacionBase (tipo_documento, numero_documento, codigo_base_actual, codigo_base_reasignada, codigo_usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())';
  const callSql = 'CALL get_actualizarbasespaquete(?, ?, ?)';
  const db = req.app.locals.db;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    await runQuery(conn, insertSql, [
      vtipo_documento,
      vcodigo_paquete,
      vcodigo_base,
      vCodigo_base_nueva,
      vcodigo_usuario
    ]);
    await runQuery(conn, callSql, [vtipo_documento, vcodigo_paquete, vCodigo_base_nueva]);
    await conn.commit();
    res.json({ message: 'Reasignacion registrada correctamente.' });
  } catch (error) {
    await conn.rollback();
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al reasignar base.' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.db = await initDb();
    const port = process.env.PORT || 3002;
    app.listen(port, () => {
      logLine(`SERVER START: http://localhost:${port}`);
    });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

start();
