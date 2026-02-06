const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-006';
const PORT = 3006;

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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

let pool;

app.get('/api/clientes-pendientes', async (req, res) => {
  try {
    const [rows] = await runQuery(pool, 'CALL get_clientes_saldo_pendiente()');
    res.json({ ok: true, data: rows[0] || [] });
  } catch (error) {
    logError(error, 'Error en clientes pendientes');
    res.status(500).json({ ok: false, message: 'ERROR_CLIENTES' });
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
  const tipo = req.query.tipo || 'RCP';
  try {
    const [rows] = await runQuery(
      pool,
      "SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = ?",
      [tipo]
    );
    res.json({ ok: true, next: rows?.[0]?.next || 1 });
  } catch (error) {
    logError(error, 'Error en next numero documento');
    res.status(500).json({ ok: false, message: 'ERROR_NUMERO' });
  }
});

app.post('/api/recibos', async (req, res) => {
  const {
    codigo_cliente,
    fecha_emision,
    tipo_documento,
    numero_documento,
    codigo_cuentabancaria,
    monto,
    descripcion
  } = req.body || {};

  if (!codigo_cliente || !fecha_emision || !tipo_documento || !numero_documento || !codigo_cuentabancaria || !monto) {
    return res.status(400).json({ ok: false, message: 'DATOS_INCOMPLETOS' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const insertSql = `
      INSERT INTO mov_operaciones_contables (
        tipodocumento,
        numdocumento,
        fecha,
        monto,
        codigo_cuentabancaria,
        codigo_cuentabancaria_destino,
        descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await runQuery(conn, insertSql, [
      tipo_documento,
      numero_documento,
      fecha_emision,
      monto,
      codigo_cuentabancaria,
      null,
      descripcion || null
    ]);

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [codigo_cliente, tipo_documento, monto]);

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    logError(error, 'Error registrando recibo');
    res.status(500).json({ ok: false, message: 'ERROR_REGISTRO' });
  } finally {
    conn.release();
  }
});

ensureLogFile();
initDb()
  .then((dbPool) => {
    pool = dbPool;
    app.listen(PORT, () => {
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logError(error, 'No se pudo iniciar servidor');
    process.exit(1);
  });
