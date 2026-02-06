const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-003';
const PORT = 3003;

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
    dsn: connection.dsn,
    googleMaps: data.google_maps || null
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return {
    pool: mysql.createPool({
      ...dbConfig,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }),
    googleMaps: config.googleMaps
  };
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

app.get('/api/config', (req, res) => {
  const { googleMaps } = app.locals.db;
  res.json({ google_maps: googleMaps });
});

app.get('/api/paquetes', async (req, res) => {
  const estado = req.query.estado || 'en camino';
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', [estado]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES ERROR');
    res.status(500).json({ ok: false, message: 'PAQUETES_ERROR' });
  }
});

app.get('/api/viaje/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_viaje_por_documento(?)', [codigo]);
      const data = rows[0] && rows[0][0] ? rows[0][0] : null;
      res.json({ ok: true, row: data });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'VIAJE ERROR');
    res.status(500).json({ ok: false, message: 'VIAJE_ERROR' });
  }
});

app.get('/api/detalle/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'DETALLE ERROR');
    res.status(500).json({ ok: false, message: 'DETALLE_ERROR' });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, content: '' });
    }
    const content = fs.readFileSync(global.logFilePath, 'utf-8');
    return res.json({ ok: true, content });
  } catch (error) {
    logError(error, 'LOGS ERROR');
    return res.status(500).json({ ok: false, message: 'LOGS_ERROR' });
  }
});

app.post('/api/confirmar', async (req, res) => {
  const paquetes = Array.isArray(req.body.paquetes) ? req.body.paquetes : [];
  const estado = String(req.body.estado || '').trim().toLowerCase();
  if (!paquetes.length) {
    return res.status(400).json({ ok: false, message: 'PAQUETES_REQUERIDOS' });
  }
  if (!['robado', 'standby', 'llegado'].includes(estado)) {
    return res.status(400).json({ ok: false, message: 'ESTADO_INVALIDO' });
  }

  const { pool } = app.locals.db;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    for (const codigo of paquetes) {
      const [[ordinalRow]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo]
      );
      const ordinal = ordinalRow?.next || 1;

      await runQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?) ',
        [codigo, ordinal, estado, 'FAC']
      );

      if (estado === 'robado' || estado === 'llegado') {
        await runQuery(
          conn,
          'UPDATE detalleviaje SET fecha_fin = NOW() WHERE codigo_paquete = ?',
          [codigo]
        );
      }

      if (estado === 'robado') {
        const [[ntcRow]] = await runQuery(
          conn,
          "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'",
          []
        );
        const correlativo = ntcRow?.next || 1;

        const [[facturaRow]] = await runQuery(
          conn,
          "SELECT codigo_pedido, codigo_cliente, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio, monto FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = ?",
          [codigo]
        );

        if (!facturaRow) {
          throw new Error(`Factura no encontrada para paquete ${codigo}`);
        }

        await runQuery(
          conn,
          'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, saldo, tipo_documento, numero_documento, costoenvio) VALUES (?, NOW(), NOW(), NOW(), ?, ?, ?, ?, ?, ?)',
          [
            facturaRow.codigo_pedido,
            facturaRow.codigo_cliente,
            facturaRow.monto,
            facturaRow.monto,
            'NTC',
            correlativo,
            facturaRow.costoenvio
          ]
        );

        await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
          facturaRow.codigo_cliente,
          'NTC',
          facturaRow.monto
        ]);
      }

      await runQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigo, estado]);
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'CONFIRMAR ERROR');
    res.status(500).json({ ok: false, message: 'CONFIRMAR_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const db = await initDb();
  app.locals.db = db;
  app.listen(PORT, () => {
    logLine(`Servidor CU-003 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
