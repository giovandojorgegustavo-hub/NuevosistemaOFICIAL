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
  const base = `CU2-006-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
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

function normalizeRows(resultSets) {
  if (Array.isArray(resultSets)) {
    return resultSets[0] || [];
  }
  return [];
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

async function getNextNumber(conn, sql, params) {
  const [rows] = await runQuery(conn, sql, params);
  const nextRaw = rows[0]?.next ?? 1;
  const next = Number(nextRaw || 1);
  return Number.isFinite(next) && next > 0 ? next : 1;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.use(express.static(ROOT_DIR));

app.get('/api/now', (req, res) => {
  const now = new Date();
  res.json({
    fecha: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`
  });
});

app.get('/api/proveedores-pendientes', async (req, res) => {
  const sql = 'CALL get_proveedores_saldos_pendientes()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar proveedores con saldo pendiente.' });
  }
});

app.get('/api/cuentasbancarias', async (req, res) => {
  const sql = 'CALL get_cuentasbancarias()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar cuentas bancarias.' });
  }
});

app.get('/api/next-numdocumento-rcp', async (req, res) => {
  const sql =
    "SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = 'RCP'";
  try {
    const next = await getNextNumber(req.app.locals.db, sql);
    res.json({ next });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular numero de documento.' });
  }
});

app.post('/api/recibo-proveedor', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha;
  const vTipo = payload.vTipo_documento_compra || 'RCP';
  const vNum = payload.vNum_documento_compra;
  const vCodigoProveedor = payload.vCodigo_provedor;
  const vCuenta = payload.vCodigo_cuentabancaria;
  const vMonto = Number(payload.vMonto);

  if (!vFecha || !vCodigoProveedor || !vCuenta || !vNum) {
    return res.status(400).json({ message: 'Faltan datos requeridos para registrar el recibo.' });
  }

  if (!Number.isFinite(vMonto) || vMonto <= 0) {
    return res.status(400).json({ message: 'El monto debe ser mayor a 0.' });
  }

  const conn = await req.app.locals.db.getConnection();
  try {
    await conn.beginTransaction();
    logLine('SQL: BEGIN TRANSACTION');

    const insertSql =
      'INSERT INTO mov_contable_prov (fecha, tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_cuentabancaria, monto) VALUES (?, ?, ?, ?, ?, ?)';
    await runQuery(conn, insertSql, [vFecha, vTipo, vNum, vCodigoProveedor, vCuenta, vMonto]);

    await runQuery(conn, 'CALL actualizarsaldosprovedores(?, ?, ?)', [vCodigoProveedor, vTipo, vMonto]);
    await runQuery(conn, 'CALL aplicar_pago_proveedor(?, ?, ?)', [vTipo, vNum, vCodigoProveedor]);

    await conn.commit();
    logLine('SQL: COMMIT');

    res.json({ message: 'Recibo registrado correctamente.' });
  } catch (error) {
    await conn.rollback();
    logLine('SQL: ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al registrar el recibo.' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.db = await initDb();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logLine(`SERVER START: http://localhost:${port}`);
    });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

start();
