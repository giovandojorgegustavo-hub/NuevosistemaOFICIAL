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
  const base = `CU2-002-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  global.logStream = fs.createWriteStream(path.join(LOG_DIR, filename), { flags: 'a' });
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
    fecha: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  });
});

app.get('/api/bases', async (req, res) => {
  const sql = 'CALL get_bases()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar bases.' });
  }
});

app.get('/api/productos', async (req, res) => {
  const sql = 'CALL get_productos()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar productos.' });
  }
});

app.get('/api/next-numdocumento', async (req, res) => {
  const tipo = req.query.tipo;
  if (!tipo) {
    return res.status(400).json({ message: 'Falta tipodocumentostock.' });
  }
  const sql =
    'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?';
  try {
    const [rows] = await runQuery(req.app.locals.db, sql, [tipo]);
    res.json({ next: rows[0]?.next || 1 });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular numero de documento.' });
  }
});

app.get('/api/next-ordinal', async (req, res) => {
  const tipo = req.query.tipo;
  const num = req.query.num;
  if (!tipo || !num) {
    return res.status(400).json({ message: 'Falta tipo o numero de documento.' });
  }
  const sql =
    'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?';
  try {
    const [rows] = await runQuery(req.app.locals.db, sql, [tipo, num]);
    res.json({ next: rows[0]?.next || 1 });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular ordinal.' });
  }
});

app.get('/api/logs/latest', (req, res) => {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return res.json({ content: '' });
    }
    const files = fs
      .readdirSync(LOG_DIR)
      .filter((file) => file.endsWith('.log'))
      .sort();
    const latest = files[files.length - 1];
    if (!latest) {
      return res.json({ content: '' });
    }
    const content = fs.readFileSync(path.join(LOG_DIR, latest), 'utf-8');
    res.json({ content });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al leer logs.' });
  }
});

app.post('/api/transferencia', async (req, res) => {
  const payload = req.body || {};
  const detalles = Array.isArray(payload.vDetalleTransferencia) ? payload.vDetalleTransferencia : [];

  if (
    !payload.vTipodocumentostock ||
    !payload.vNumdocumentostock ||
    !payload.vFecha ||
    !payload.vCodigo_base ||
    !payload.vCodigo_basedestino ||
    !detalles.length
  ) {
    return res.status(400).json({ message: 'Datos incompletos para registrar transferencia.' });
  }

  const conn = await req.app.locals.db.getConnection();
  try {
    await conn.beginTransaction();
    logLine('SQL: BEGIN TRANSACTION');

    const insertMovSql = `INSERT INTO movimiento_stock
      (tipodocumentostock, numdocumentostock, fecha, codigo_base, codigo_basedestino)
      VALUES (?, ?, ?, ?, ?)`;
    await runQuery(conn, insertMovSql, [
      payload.vTipodocumentostock,
      payload.vNumdocumentostock,
      payload.vFecha,
      payload.vCodigo_base,
      payload.vCodigo_basedestino
    ]);

    const ordinalSql =
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?';
    const [ordinalRows] = await runQuery(conn, ordinalSql, [
      payload.vTipodocumentostock,
      payload.vNumdocumentostock
    ]);
    let ordinal = ordinalRows[0]?.next || 1;

    const insertDetalleSql = `INSERT INTO detalle_movimiento_stock
      (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad)
      VALUES (?, ?, ?, ?, ?)`;

    for (const item of detalles) {
      await runQuery(conn, insertDetalleSql, [
        ordinal,
        payload.vTipodocumentostock,
        payload.vNumdocumentostock,
        item.vcodigo_producto,
        item.Vcantidad
      ]);
      ordinal += 1;
    }

    const callSql = 'CALL get_actualizarsaldosstocktrs(?, ?)';
    await runQuery(conn, callSql, [payload.vTipodocumentostock, payload.vNumdocumentostock]);

    await conn.commit();
    logLine('SQL: COMMIT');
    res.json({ message: 'Transferencia registrada correctamente.' });
  } catch (error) {
    await conn.rollback();
    logLine('SQL: ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al registrar la transferencia.' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    const db = await initDb();
    app.locals.db = db;
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
