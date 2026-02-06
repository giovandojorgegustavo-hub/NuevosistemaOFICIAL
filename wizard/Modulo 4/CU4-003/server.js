const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU4-003';
const PORT = 3018;

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

function extractRows(result) {
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

app.get('/api/facturas-pendientes', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_facturascompras_pendientes()');
    const rows = extractRows(result);
    const facturas = [];

    for (const row of rows) {
      if (row.tipo_documento_compra !== 'FCC') {
        continue;
      }
      const [detalleResult] = await runQuery(
        conn,
        'CALL get_detalle_compra_por_documento(?, ?, ?)',
        [row.tipo_documento_compra, row.num_documento_compra, row.codigo_provedor]
      );
      const detalleRows = extractRows(detalleResult);
      const hasPendiente = detalleRows.some(
        (item) => Number(item.cantidad_entregada) < Number(item.cantidad)
      );
      if (hasPendiente) {
        facturas.push(row);
      }
    }

    res.json({ ok: true, facturas });
  } catch (error) {
    logError(error, 'FACTURAS_PENDIENTES_ERROR');
    res.status(500).json({ ok: false, message: 'FACTURAS_PENDIENTES_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/bases', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_bases()');
    const rows = extractRows(result);
    res.json({ ok: true, bases: rows });
  } catch (error) {
    logError(error, 'BASES_ERROR');
    res.status(500).json({ ok: false, message: 'BASES_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/remito-meta', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const vTipo_documento_compra_remito = 'REM';
    const [[numRow]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
      [vTipo_documento_compra_remito]
    );
    const vNum_documento_compra_remito = numRow ? numRow.next : 1;
    const [[ordRow]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipo_documento_compra_remito, vNum_documento_compra_remito]
    );
    const vOrdinal = ordRow ? ordRow.next : 1;

    res.json({
      ok: true,
      vTipo_documento_compra_remito,
      vNum_documento_compra_remito,
      vOrdinal
    });
  } catch (error) {
    logError(error, 'REMITO_META_ERROR');
    res.status(500).json({ ok: false, message: 'REMITO_META_ERROR' });
  } finally {
    conn.release();
  }
});

app.post('/api/detalle-compra', async (req, res) => {
  const payload = req.body || {};
  const vTipo = payload.vTipo_documento_compra;
  const vNum = payload.vNum_documento_compra;
  const vCodigo = payload.vCodigo_provedor;

  if (!vTipo || !vNum || !vCodigo) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(
      conn,
      'CALL get_detalle_compra_por_documento(?, ?, ?)',
      [vTipo, vNum, vCodigo]
    );
    const rows = extractRows(result);
    res.json({ ok: true, detalle: rows });
  } catch (error) {
    logError(error, 'DETALLE_COMPRA_ERROR');
    res.status(500).json({ ok: false, message: 'DETALLE_COMPRA_ERROR' });
  } finally {
    conn.release();
  }
});

app.post('/api/registrar-remito', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha;
  const vCodigo_base = payload.vCodigo_base;
  const vTipo_documento_compra_origen = payload.vTipo_documento_compra_origen;
  const vNum_documento_compra_origen = payload.vNum_documento_compra_origen;
  const vCodigo_provedor = payload.vCodigo_provedor;
  const vDetalleRemitoCompra = Array.isArray(payload.vDetalleRemitoCompra)
    ? payload.vDetalleRemitoCompra
    : [];

  if (!vFecha || !vCodigo_base || !vTipo_documento_compra_origen || !vNum_documento_compra_origen || !vCodigo_provedor) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  if (!vDetalleRemitoCompra.length) {
    return res.status(400).json({ ok: false, message: 'DETALLE_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    const vTipo_documento_compra_remito = 'REM';
    const [[numRow]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
      [vTipo_documento_compra_remito]
    );
    const vNum_documento_compra_remito = numRow ? numRow.next : 1;

    const [detalleResult] = await runQuery(
      conn,
      'CALL get_detalle_compra_por_documento(?, ?, ?)',
      [vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor]
    );
    const detalleRows = extractRows(detalleResult);
    const detalleMap = new Map();
    detalleRows.forEach((row) => {
      detalleMap.set(String(row.ordinal), row);
    });

    const [[ordRow]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipo_documento_compra_remito, vNum_documento_compra_remito]
    );
    let nextOrdinal = ordRow ? ordRow.next : 1;

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, tipo_documento_compra, num_documento_compra, codigo_provedor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        vTipo_documento_compra_remito,
        vNum_documento_compra_remito,
        vFecha,
        vCodigo_base,
        vTipo_documento_compra_origen,
        vNum_documento_compra_origen,
        vCodigo_provedor
      ]
    );

    for (const item of vDetalleRemitoCompra) {
      const ordinalCompra = item.vOrdinalCompra;
      const codigoProducto = item.vcodigo_producto;
      const cantidadRaw = item.vCantidadDisponible;
      const cantidad = Number(String(cantidadRaw).replace(',', '.'));

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error('CANTIDAD_INVALIDA');
      }

      const detalle = detalleMap.get(String(ordinalCompra));
      if (!detalle) {
        throw new Error('DETALLE_NO_ENCONTRADO');
      }

      const maxDisponible = Number(detalle.cantidad) - Number(detalle.cantidad_entregada);
      if (cantidad > maxDisponible) {
        throw new Error('CANTIDAD_SUPERA_DISPONIBLE');
      }

      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (tipodocumentostock, numdocumentostock, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [vTipo_documento_compra_remito, vNum_documento_compra_remito, nextOrdinal, codigoProducto, cantidad]
      );
      nextOrdinal += 1;

      await runQuery(
        conn,
        'CALL aplicar_entrega_compra(?, ?, ?, ?, ?)',
        [vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor, ordinalCompra, cantidad]
      );

      await runQuery(
        conn,
        'CALL upd_stock_bases(?, ?, ?, ?, ?)',
        [vCodigo_base, codigoProducto, cantidad, vTipo_documento_compra_remito, vNum_documento_compra_remito]
      );
    }

    logSql('COMMIT');
    await conn.commit();

    res.json({ ok: true, vNum_documento_compra_remito });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'REGISTRAR_REMITO_ERROR');
    res.status(500).json({ ok: false, message: 'REGISTRAR_REMITO_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  try {
    ensureLogFile();
    app.locals.pool = await initDb();
    app.listen(PORT, () => {
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER_START_ERROR');
    process.exit(1);
  }
}

start();
