const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU2-003';
const PORT = 3011;

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
    google: data.google_maps || null
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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/config', (req, res) => {
  try {
    const config = parseErpConfig();
    res.json({
      ok: true,
      google: config.google
        ? {
            key: config.google.api_key,
            center: config.google.default_center,
            zoom: config.google.default_zoom
          }
        : null
    });
  } catch (error) {
    logError(error, 'CONFIG ERROR');
    res.status(500).json({ ok: false, message: 'CONFIG_ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_bases()');
      res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'BASES ERROR');
    res.status(500).json({ ok: false, message: 'BASES_ERROR' });
  }
});

app.get('/api/paquetes-empacados', async (req, res) => {
  try {
    const codigoBase = req.query.codigo_base;
    if (!codigoBase) {
      return res.json({ ok: true, data: [] });
    }
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', ['empacado']);
      const data = (rows[0] || []).filter((row) => String(row.codigo_base) === String(codigoBase));
      res.json({ ok: true, data });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES EMPACADOS ERROR');
    res.status(500).json({ ok: false, message: 'PAQUETES_EMPACADOS_ERROR' });
  }
});

app.get('/api/next-viaje', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(conn, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
      res.json({ ok: true, vcodigoviaje: row?.next ?? 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT VIAJE ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_VIAJE_ERROR' });
  }
});


app.post('/api/guardar-viaje', async (req, res) => {
  const payload = req.body || {};
  const vCodigoBase = payload.vcodigo_base;
  const vNombreMotorizado = payload.vnombre_motorizado;
  const vLink = payload.vlink;
  const paquetes = Array.isArray(payload.paquetes) ? payload.paquetes : [];

  if (!vCodigoBase || !vNombreMotorizado || !vLink || paquetes.length === 0) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    const [[viajeRow]] = await runQuery(conn, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
    const vCodigoViaje = viajeRow?.next ?? 1;

    await runQuery(
      conn,
      'INSERT INTO viajes (codigoviaje, codigo_base, nombre_motorizado, numero_wsp, num_llamadas, num_yape, link, observacion, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        vCodigoViaje,
        vCodigoBase,
        vNombreMotorizado,
        payload.vnumero_wsp || null,
        payload.vnum_llamadas || null,
        payload.vnum_yape || null,
        vLink,
        payload.vobservacion || null,
        payload.vfecha ? new Date(payload.vfecha) : new Date()
      ]
    );

    for (let index = 0; index < paquetes.length; index += 1) {
      const paquete = paquetes[index];
      const codigoPaquete = paquete.vcodigo_paquete;
      const [[countRow]] = await runQuery(
        conn,
        "SELECT COUNT(*) AS total FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigoPaquete]
      );

      let ordinal = index + 1;
      if (Number(countRow?.total) > 0) {
        const [[ordinalRow]] = await runQuery(
          conn,
          "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
          [codigoPaquete]
        );
        ordinal = ordinalRow?.next ?? ordinal;
      }

      await runQuery(
        conn,
        'INSERT INTO detalleviaje (codigoviaje, numero_documento, tipo_documento, fecha_inicio) VALUES (?, ?, ?, NOW())',
        [vCodigoViaje, codigoPaquete, 'FAC']
      );

      await runQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?)',
        [codigoPaquete, ordinal, 'en camino', 'FAC']
      );

      await runQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, 'en camino']);
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true, vcodigoviaje: vCodigoViaje });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'GUARDAR VIAJE ERROR');
    res.status(500).json({ ok: false, message: 'GUARDAR_VIAJE_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.pool = await initDb();
    app.listen(PORT, () => {
      logLine(`SERVIDOR INICIADO EN PUERTO ${PORT}`);
    });
  } catch (error) {
    logError(error, 'INIT ERROR');
    process.exit(1);
  }
}

start();
