const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-007';
const PORT = 3007;

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

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/clientes', async (req, res) => {
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_clientes()');
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CLIENTES ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/paquetes', async (req, res) => {
  const estado = req.query.estado || 'llegado';
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', [estado]);
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/next-numero-documento', async (req, res) => {
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'"
      );
      const nextValue = rows && rows[0] ? rows[0].next : 1;
      return res.json({ ok: true, next: nextValue });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT NUMERO ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/detalle-factura', async (req, res) => {
  const codigoPaquete = req.query.codigo_paquete;
  if (!codigoPaquete) {
    return res.status(400).json({ ok: false, message: 'MISSING_PAQUETE' });
  }
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigoPaquete]);
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'DETALLE FACTURA ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/emitir-nota-credito', async (req, res) => {
  const payload = req.body || {};
  const detalle = Array.isArray(payload.detalle) ? payload.detalle : [];
  if (!payload.vFecha_emision || !payload.vTipo_documento || !payload.vNumero_documento) {
    return res.status(400).json({ ok: false, message: 'MISSING_HEADER' });
  }
  if (!payload.vCodigo_cliente || !payload.vCodigo_base) {
    return res.status(400).json({ ok: false, message: 'MISSING_CLIENT' });
  }
  if (!detalle.length) {
    return res.status(400).json({ ok: false, message: 'MISSING_DETAIL' });
  }

  const pool = app.locals.db;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await runQuery(
      conn,
      'INSERT INTO mov_contable (fecha_emision, tipo_documento, numero_documento, codigo_cliente, codigo_base, saldo) VALUES (?, ?, ?, ?, ?, ?)',
      [
        payload.vFecha_emision,
        payload.vTipo_documento,
        payload.vNumero_documento,
        payload.vCodigo_cliente,
        payload.vCodigo_base,
        payload.vTotalNota
      ]
    );

    for (const item of detalle) {
      await runQuery(
        conn,
        'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          payload.vTipo_documento,
          payload.vNumero_documento,
          item.vOrdinalDetMovCont,
          item.vCodigo_producto,
          item.vCantidad,
          item.vSaldo,
          item.vPrecio_total
        ]
      );

      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        payload.vCodigo_base,
        item.vCodigo_producto,
        item.vCantidad,
        payload.vTipo_documento,
        payload.vNumero_documento
      ]);

      await runQuery(conn, 'CALL aplicar_devolucion_partidas(?, ?, ?, ?, ?, ?)', [
        'FAC',
        payload.vCodigo_paquete,
        payload.vTipo_documento,
        payload.vNumero_documento,
        item.vCodigo_producto,
        item.vCantidad
      ]);
    }

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
      payload.vCodigo_cliente,
      payload.vTipo_documento,
      payload.vTotalNota
    ]);

    await conn.commit();
    logLine(`Nota de credito emitida: ${payload.vTipo_documento}-${payload.vNumero_documento}`);
    return res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    logError(error, 'EMITIR NOTA CREDITO ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.db = pool;
  app.listen(PORT, () => {
    logLine(`Servidor CU007 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
