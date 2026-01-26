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
    const rows = normalizeRows(resultSets);
    const filtered = rows.filter((row) => {
      const tipo = (row.tipo_documento_compra || row.vtipo_documento_compra || '').toString();
      const cantidadRaw = row.cantidad ?? row.cantidad_compra ?? row.vcantidad;
      const entregadaRaw = row.cantidad_entregada ?? row.vcantidad_entregada;
      const cantidad = cantidadRaw !== undefined ? Number(cantidadRaw) : NaN;
      const entregada = entregadaRaw !== undefined ? Number(entregadaRaw) : NaN;
      const isFcc = tipo ? tipo === 'FCC' : true;
      const hasAvail = Number.isFinite(cantidad) && Number.isFinite(entregada) ? entregada < cantidad : true;
      return isFcc && hasAvail;
    });
    res.json(filtered);
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

app.post('/api/remitos', async (req, res) => {
  const payload = req.body || {};
  const detalles = Array.isArray(payload.vDetalleRemitoCompra) ? payload.vDetalleRemitoCompra : [];

  if (
    !payload.vTipo_documento_compra_remito ||
    !payload.vNum_documento_compra_remito ||
    !payload.vFecha ||
    !payload.vCodigo_base ||
    !payload.vTipo_documento_compra_origen ||
    !payload.vNum_documento_compra_origen ||
    !payload.vCodigo_provedor
  ) {
    return res.status(400).json({ message: 'Datos incompletos para registrar remito.' });
  }

  if (!detalles.length) {
    return res.status(400).json({ message: 'Debe registrar al menos un item en el remito.' });
  }

  const conn = await req.app.locals.db.getConnection();
  try {
    await conn.beginTransaction();
    logLine('SQL: BEGIN TRANSACTION');

    const insertMovSql = `INSERT INTO movimiento_stock
      (tipodocumentostock, numdocumentostock, fecha, codigo_base, tipo_documento_compra, num_documento_compra, codigo_provedor)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await runQuery(conn, insertMovSql, [
      payload.vTipo_documento_compra_remito,
      payload.vNum_documento_compra_remito,
      payload.vFecha,
      payload.vCodigo_base,
      payload.vTipo_documento_compra_origen,
      payload.vNum_documento_compra_origen,
      payload.vCodigo_provedor
    ]);

    const ordinalSql =
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?';
    const [ordinalRows] = await runQuery(conn, ordinalSql, [
      payload.vTipo_documento_compra_remito,
      payload.vNum_documento_compra_remito
    ]);
    let ordinal = ordinalRows[0]?.next || 1;

    const insertDetalleSql = `INSERT INTO detalle_movimiento_stock
      (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad)
      VALUES (?, ?, ?, ?, ?)`;

    const callSql = 'CALL aplicar_entrega_compra(?, ?, ?, ?, ?)';

    for (const item of detalles) {
      await runQuery(conn, insertDetalleSql, [
        ordinal,
        payload.vTipo_documento_compra_remito,
        payload.vNum_documento_compra_remito,
        item.vcodigo_producto,
        item.vCantidadDisponible
      ]);

      await runQuery(conn, callSql, [
        payload.vTipo_documento_compra_origen,
        payload.vNum_documento_compra_origen,
        payload.vCodigo_provedor,
        item.vOrdinalCompra,
        item.vCantidadDisponible
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
