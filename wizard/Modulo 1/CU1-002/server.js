const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 3002;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG_PATH = path.resolve(ROOT_DIR, '../../..', 'erp.yml');

function loadErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  const data = yaml.parse(content);
  const connection = data.connections && data.connections[0];
  if (!connection || !connection.dsn || !connection.name) {
    throw new Error('Invalid erp.yml: missing connections');
  }
  return {
    dsn: connection.dsn,
    name: connection.name,
    google_maps: data.google_maps
  };
}

function parseMysqlDsn(dsn, dbName) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('Invalid DSN format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: dbName
  };
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  let index = 1;
  let filename;
  do {
    const suffix = String(index).padStart(3, '0');
    filename = `CU002-${stamp}-${suffix}.log`;
    index += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));
  return path.join(LOG_DIR, filename);
}

const LOG_FILE = ensureLogFile();

function logLine(message, isError = false) {
  const line = `[${new Date().toISOString()}] ${message}`;
  if (isError) {
    console.error(line);
  } else {
    console.log(line);
  }
  fs.appendFileSync(LOG_FILE, `${line}\n`);
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

let pool;
let config;

async function initDb() {
  config = loadErpConfig();
  const dbConfig = parseMysqlDsn(config.dsn, config.name);
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10
  });
  logLine('DB pool created');
}

async function execQuery(sql, params = [], connection = pool) {
  logLine(`SQL: ${sql} | Params: ${JSON.stringify(params)}`);
  const [rows] = await connection.execute(sql, params);
  return rows;
}

app.use((req, res, next) => {
  logLine(`HTTP ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (req, res) => {
  res.json({ google_maps: config.google_maps });
});

app.get('/api/paquetes-pendientes', async (req, res) => {
  try {
    const rows = await execQuery('CALL get_paquetes_por_estado(?)', ['pendiente empacar']);
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR paquetes-pendientes: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/mov-contable-detalle', async (req, res) => {
  const tipo = req.query.tipo_documento;
  const numero = req.query.numero_documento;
  if (!tipo || !numero) {
    return res.status(400).json({ error: 'tipo_documento and numero_documento required' });
  }
  try {
    const rows = await execQuery('CALL get_mov_contable_detalle(?, ?)', [tipo, numero]);
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR mov-contable-detalle: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const rows = await execQuery('CALL get_bases()');
    res.json({ rows: rows[0] || [] });
  } catch (err) {
    logLine(`ERROR bases: ${err.stack || err.message}`, true);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/reasignar-base', async (req, res) => {
  const { vtipo_documento, vcodigo_paquete, vcodigo_base, vCodigo_base_nueva, vcodigo_usuario } = req.body || {};
  if (!vtipo_documento || !vcodigo_paquete || !vcodigo_base || !vCodigo_base_nueva || !vcodigo_usuario) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userRows = await execQuery(
      'SELECT 1 FROM usuarios WHERE codigo_usuario = ? LIMIT 1',
      [vcodigo_usuario]
    );
    if (!userRows || userRows.length === 0) {
      return res.status(400).json({ error: 'Código de usuario inválido.' });
    }
  } catch (err) {
    logLine(`ERROR validar usuario: ${err.stack || err.message}`, true);
    return res.status(500).json({ error: 'DB error' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await execQuery(
      'INSERT INTO Log_reasignacionBase (tipo_documento, numero_documento, codigo_base_actual, codigo_base_reasignada, codigo_usuario, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
      [vtipo_documento, vcodigo_paquete, vcodigo_base, vCodigo_base_nueva, vcodigo_usuario],
      connection
    );
    await execQuery('CALL get_actualizarbasespaquete(?, ?, ?)', [vtipo_documento, vcodigo_paquete, vCodigo_base_nueva], connection);
    await connection.commit();
    res.json({ ok: true });
  } catch (err) {
    await connection.rollback();
    logLine(`ERROR reasignar-base: ${err.stack || err.message}`, true);
    if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Código de usuario inválido.' });
    }
    res.status(500).json({ error: 'DB error' });
  } finally {
    connection.release();
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logLine(`CU002 server listening on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((err) => {
    logLine(`ERROR init: ${err.stack || err.message}`, true);
    process.exit(1);
  });
