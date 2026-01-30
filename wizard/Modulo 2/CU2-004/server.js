const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const REMITO_TIPO = 'REM';

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
  const base = `CU2-004-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
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

app.get('/api/facturas-pendientes', async (req, res) => {
  const sql = 'CALL get_facturascompras_pendientes()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    const rows = normalizeRows(resultSets).filter((row) => row.tipo_documento_compra === 'FCC');
    res.json(rows);
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar facturas pendientes.' });
  }
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

app.get('/api/remito/next-num', async (req, res) => {
  const sql =
    'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?';
  try {
    const [rows] = await runQuery(req.app.locals.db, sql, [REMITO_TIPO]);
    res.json({ next: rows[0]?.next || 1 });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular numero de remito.' });
  }
});

app.get('/api/remito/next-ordinal', async (req, res) => {
  const num = req.query.num;
  if (!num) {
    return res.status(400).json({ message: 'Falta numero de remito.' });
  }
  const sql =
    'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?';
  try {
    const [rows] = await runQuery(req.app.locals.db, sql, [REMITO_TIPO, num]);
    res.json({ next: rows[0]?.next || 1 });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular ordinal.' });
  }
});

app.get('/api/detalle-compra', async (req, res) => {
  const tipo = req.query.tipo;
  const num = req.query.num;
  const proveedor = req.query.proveedor;
  if (!tipo || !num || !proveedor) {
    return res.status(400).json({ message: 'Faltan parametros para detalle de compra.' });
  }
  const sql = 'CALL get_detalle_compra_por_documento(?, ?, ?)';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql, [tipo, num, proveedor]);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar detalle de compra.' });
  }
});

app.post('/api/registrar-remito', async (req, res) => {
  const payload = req.body || {};
  const detalles = Array.isArray(payload.vDetalleRemitoCompra) ? payload.vDetalleRemitoCompra : [];
  const detallesValidos = detalles.filter(
    (item) => item.vcodigo_producto && item.vOrdinalCompra !== undefined && Number(item.vCantidadDisponible || 0) > 0
  );

  if (
    !payload.vNum_documento_compra_remito ||
    !payload.vFecha ||
    !payload.vCodigo_base ||
    !payload.vTipo_documento_compra_origen ||
    !payload.vNum_documento_compra_origen ||
    !payload.vCodigo_provedor ||
    !detallesValidos.length
  ) {
    return res.status(400).json({ message: 'Faltan datos para registrar el remito.' });
  }

  const conn = await req.app.locals.db.getConnection();
  try {
    logLine('SQL: START TRANSACTION');
    await conn.beginTransaction();

    const insertMovimientoSql = `INSERT INTO movimiento_stock
      (tipodocumentostock, numdocumentostock, fecha, codigo_base, tipo_documento_compra, num_documento_compra, codigo_provedor)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

    await runQuery(conn, insertMovimientoSql, [
      REMITO_TIPO,
      payload.vNum_documento_compra_remito,
      payload.vFecha,
      payload.vCodigo_base,
      payload.vTipo_documento_compra_origen,
      payload.vNum_documento_compra_origen,
      payload.vCodigo_provedor
    ]);

    const ordinalSql =
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?';
    const [ordinalRows] = await runQuery(conn, ordinalSql, [REMITO_TIPO, payload.vNum_documento_compra_remito]);
    let ordinal = ordinalRows[0]?.next || 1;

    const insertDetalleSql = `INSERT INTO detalle_movimiento_stock
      (tipodocumentostock, numdocumentostock, ordinal, codigo_producto, cantidad)
      VALUES (?, ?, ?, ?, ?)`;

    for (const item of detallesValidos) {
      const cantidad = Number(item.vCantidadDisponible || 0);
      await runQuery(conn, insertDetalleSql, [
        REMITO_TIPO,
        payload.vNum_documento_compra_remito,
        ordinal,
        item.vcodigo_producto,
        cantidad
      ]);

      const aplicarEntregaSql = 'CALL aplicar_entrega_compra(?, ?, ?, ?, ?)';
      await runQuery(conn, aplicarEntregaSql, [
        payload.vTipo_documento_compra_origen,
        payload.vNum_documento_compra_origen,
        payload.vCodigo_provedor,
        item.vOrdinalCompra,
        cantidad
      ]);

      const updStockSql = 'CALL upd_stock_bases(?, ?, ?, ?, ?)';
      await runQuery(conn, updStockSql, [
        payload.vCodigo_base,
        item.vcodigo_producto,
        cantidad,
        REMITO_TIPO,
        payload.vNum_documento_compra_remito
      ]);

      ordinal += 1;
    }

    await conn.commit();
    logLine('SQL: COMMIT');
    res.json({ message: 'Remito registrado correctamente.' });
  } catch (error) {
    await conn.rollback();
    logLine('SQL: ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al registrar el remito.' });
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
