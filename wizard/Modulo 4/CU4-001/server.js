const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU4-001';
const PORT = 3016;

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

function getSqlLines(raw) {
  return raw
    .split('\n')
    .filter((line) => line.includes('[SQL]') || line.includes('SQL:'))
    .map((line) => line.trim())
    .filter(Boolean);
}

function unwrapProcedureRows(rows) {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows || [];
}

function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/init', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const tipodocSalida = 'TRS';
      const tipodocEntrada = 'TRE';
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
        [tipodocSalida]
      );
      const vNumdocumentostockSalida = Number(row?.next || 1);
      const vNumdocumentostockEntrada = vNumdocumentostockSalida + 1;

      res.json({
        ok: true,
        data: {
          vFecha: getCurrentDate(),
          vTipodocumentostockSalida: tipodocSalida,
          vTipodocumentostockEntrada: tipodocEntrada,
          vNumdocumentostockSalida,
          vNumdocumentostockEntrada
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'INIT ERROR');
    res.status(500).json({ ok: false, message: 'INIT_ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_bases()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET BASES ERROR');
    res.status(500).json({ ok: false, message: 'GET_BASES_ERROR' });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_productos()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET PRODUCTOS ERROR');
    res.status(500).json({ ok: false, message: 'GET_PRODUCTOS_ERROR' });
  }
});

app.post('/api/transferencias', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha;
  const vTipodocumentostockSalida = payload.vTipodocumentostockSalida;
  const vTipodocumentostockEntrada = payload.vTipodocumentostockEntrada;
  const vNumdocumentostockSalida = Number(payload.vNumdocumentostockSalida);
  const vNumdocumentostockEntrada = Number(payload.vNumdocumentostockEntrada);
  const vCodigo_base = payload.vCodigo_base;
  const vCodigo_basedestino = payload.vCodigo_basedestino;
  const vDetalleTransferencia = Array.isArray(payload.vDetalleTransferencia) ? payload.vDetalleTransferencia : [];

  if (
    !vFecha ||
    !vTipodocumentostockSalida ||
    !vTipodocumentostockEntrada ||
    !vNumdocumentostockSalida ||
    !vNumdocumentostockEntrada ||
    !vCodigo_base ||
    !vCodigo_basedestino ||
    !vDetalleTransferencia.length
  ) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, codigo_basedestino) VALUES (?, ?, ?, ?, ?)',
      [vTipodocumentostockSalida, vNumdocumentostockSalida, vFecha, vCodigo_base, vCodigo_basedestino]
    );

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, codigo_basedestino) VALUES (?, ?, ?, ?, ?)',
      [vTipodocumentostockEntrada, vNumdocumentostockEntrada, vFecha, vCodigo_basedestino, vCodigo_base]
    );

    const [[rowSalida]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipodocumentostockSalida, vNumdocumentostockSalida]
    );

    const [[rowEntrada]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipodocumentostockEntrada, vNumdocumentostockEntrada]
    );

    let ordinalSalida = Number(rowSalida?.next || 1);
    let ordinalEntrada = Number(rowEntrada?.next || 1);

    for (const item of vDetalleTransferencia) {
      const codigoProducto = item.vcodigo_producto;
      const cantidad = Number(item.Vcantidad);
      if (!codigoProducto || Number.isNaN(cantidad)) {
        throw new Error('ITEM_INVALID');
      }

      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [ordinalSalida, vTipodocumentostockSalida, vNumdocumentostockSalida, codigoProducto, cantidad]
      );
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_base,
        codigoProducto,
        cantidad,
        vTipodocumentostockSalida,
        vNumdocumentostockSalida
      ]);

      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [ordinalEntrada, vTipodocumentostockEntrada, vNumdocumentostockEntrada, codigoProducto, cantidad]
      );
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_basedestino,
        codigoProducto,
        cantidad,
        vTipodocumentostockEntrada,
        vNumdocumentostockEntrada
      ]);

      ordinalSalida += 1;
      ordinalEntrada += 1;
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'TRANSFERENCIA ERROR');
    res.status(500).json({ ok: false, message: 'TRANSFERENCIA_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/sql-logs', (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, lines: [] });
    }
    const raw = fs.readFileSync(global.logFilePath, 'utf-8');
    const lines = getSqlLines(raw);
    res.json({ ok: true, lines });
  } catch (error) {
    logError(error, 'SQL LOGS ERROR');
    res.status(500).json({ ok: false, message: 'SQL_LOGS_ERROR' });
  }
});

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.pool = pool;
  app.listen(PORT, () => {
    logLine(`Servidor CU4001 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
