const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const BASE_DIR = __dirname;
const ROOT_DIR = path.resolve(BASE_DIR, '..', '..');
const ERP_CONFIG_PATH = path.join(ROOT_DIR, 'erp.yml');
const LOG_DIR = path.join(BASE_DIR, 'logs');

function timestamp() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLogFilePath() {
  ensureDir(LOG_DIR);
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .replace(/\..+/, '');
  let counter = 1;
  let filePath;
  do {
    const suffix = String(counter).padStart(3, '0');
    filePath = path.join(LOG_DIR, `CU-005-${stamp}-${suffix}.log`);
    counter += 1;
  } while (fs.existsSync(filePath));
  return filePath;
}

const LOG_FILE = getLogFilePath();

function logLine(message) {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, `${line}\n`);
}

function logError(error) {
  const detail = error && error.stack ? error.stack : String(error);
  logLine(`ERROR: ${detail}`);
}

function parseErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  const dsnMatch = content.match(/dsn:\s*"([^"]+)"/);
  const nameMatch = content.match(/name:\s*"([^"]+)"/);
  if (!dsnMatch || !nameMatch) {
    throw new Error('No se encontro configuracion dsn/name en erp.yml');
  }
  return { dsn: dsnMatch[1], name: nameMatch[1] };
}

function parseDsn(dsn) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('DSN invalido');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5],
  };
}

const { dsn, name } = parseErpConfig();
const dbConfig = parseDsn(dsn);
if (dbConfig.database !== name) {
  dbConfig.database = name;
}

const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 5,
  decimalNumbers: true,
});

async function execQuery(conn, sql, params = []) {
  logLine(`SQL: ${sql} | params: ${JSON.stringify(params)}`);
  return conn.query(sql, params);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2e6) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function normalizeRows(resultRows) {
  if (!Array.isArray(resultRows)) return [];
  if (Array.isArray(resultRows[0])) {
    return resultRows[0];
  }
  return resultRows;
}

async function getPaquetesStandby() {
  const [rows] = await execQuery(pool, 'CALL get_paquetes_por_estado(?)', ['standby']);
  return normalizeRows(rows);
}

async function getMovDetalle(codigoPaquete) {
  const [rows] = await execQuery(pool, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigoPaquete]);
  return normalizeRows(rows);
}

async function getViajeDetalle(codigoPaquete) {
  const [rows] = await execQuery(pool, 'CALL get_viaje_por_documento(?)', [codigoPaquete]);
  const data = normalizeRows(rows);
  return data[0] || {};
}

async function getOrdinal(codigoPaquete) {
  const [rows] = await execQuery(
    pool,
    `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next
     FROM paquetedetalle
     WHERE codigo_paquete = ?
       AND tipo_documento = 'FAC'`,
    [codigoPaquete]
  );
  return rows && rows[0] ? rows[0].next : 1;
}

function getLatestLogFile() {
  ensureDir(LOG_DIR);
  const files = fs
    .readdirSync(LOG_DIR)
    .filter((file) => file.startsWith('CU-005-') && file.endsWith('.log'))
    .sort();
  if (!files.length) return null;
  return path.join(LOG_DIR, files[files.length - 1]);
}

async function confirmarEstado({ codigoPaquete, estado, ordinal }) {
  const conn = await pool.getConnection();
  try {
    await execQuery(conn, 'START TRANSACTION');
    await execQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, estado]);
    await execQuery(
      conn,
      `INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento)
       VALUES (?, ?, ?, 'FAC')`,
      [codigoPaquete, ordinal, estado]
    );
    await execQuery(
      conn,
      `UPDATE detalleviaje
       SET fecha_fin = NOW()
       WHERE tipo_documento = 'FAC'
         AND numero_documento = ?`,
      [codigoPaquete]
    );
    await execQuery(conn, 'COMMIT');
  } catch (error) {
    await execQuery(conn, 'ROLLBACK');
    throw error;
  } finally {
    conn.release();
  }
}

async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  logLine(`Endpoint: ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/paquetes' && req.method === 'GET') {
      const estado = String(query.estado || '').toLowerCase();
      if (estado !== 'standby') {
        sendJson(res, 400, { error: 'Estado invalido' });
        return;
      }
      const paquetes = await getPaquetesStandby();
      sendJson(res, 200, paquetes);
      return;
    }

    const detalleMatch = pathname.match(/^\/api\/paquetes\/(\d+)\/detalle$/);
    if (detalleMatch && req.method === 'GET') {
      const codigoPaquete = detalleMatch[1];
      const [movDetalle, ordinal] = await Promise.all([
        getMovDetalle(codigoPaquete),
        getOrdinal(codigoPaquete),
      ]);
      sendJson(res, 200, { movDetalle, ordinal });
      return;
    }

    const viajeMatch = pathname.match(/^\/api\/paquetes\/(\d+)\/viaje$/);
    if (viajeMatch && req.method === 'GET') {
      const codigoPaquete = viajeMatch[1];
      const viaje = await getViajeDetalle(codigoPaquete);
      sendJson(res, 200, viaje);
      return;
    }

    if (pathname === '/api/paquetes/confirmar' && req.method === 'POST') {
      const body = await parseBody(req);
      const codigoPaquete = String(body.codigo_paquete || '');
      const estado = String(body.estado || '').toLowerCase();
      const ordinal = Number(body.ordinal || 0);
      const estadoValido = ['robado', 'devuelto', 'empacado', 'llegado'].includes(estado);

      if (!/^\d+$/.test(codigoPaquete) || !estadoValido || !Number.isInteger(ordinal)) {
        sendJson(res, 400, { error: 'Datos invalidos' });
        return;
      }

      await confirmarEstado({ codigoPaquete, estado, ordinal });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/logs/latest') {
      const limit = Math.min(Number(query.limit || 200), 1000);
      const filePath = getLatestLogFile();
      if (!filePath) {
        sendJson(res, 200, { lines: [] });
        return;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split(/\r?\n/).slice(-limit);
      sendJson(res, 200, { lines });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    logError(error);
    sendJson(res, 500, { error: 'Error interno del servidor' });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }

  const safePath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const filePath = path.join(BASE_DIR, safePath);
  serveStatic(res, filePath);
});

server.listen(3005, () => {
  logLine('Servidor CU-005 iniciado en puerto 3005');
});
