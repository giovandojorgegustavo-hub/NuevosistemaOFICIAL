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
    filePath = path.join(LOG_DIR, `CU-002-${stamp}-${suffix}.log`);
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
  connectionLimit: 6,
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

async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  logLine(`Endpoint: ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/paquetes') {
      const estado = query.estado || 'pendiente empacar';
      const [rows] = await execQuery(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/mov-contable-detalle') {
      const tipo = query.tipo || 'FAC';
      const numero = query.numero;
      if (!numero) {
        sendJson(res, 400, { error: 'Numero requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_mov_contable_detalle(?, ?)', [tipo, numero]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/paquete/next-ordinal') {
      const codigo = query.codigo;
      if (!codigo) {
        sendJson(res, 400, { error: 'Codigo requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo]
      );
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/empacar' && req.method === 'POST') {
      const body = await parseBody(req);
      const codigo = body.codigo_paquete;
      const ordinal = body.ordinal;
      if (!codigo || !ordinal) {
        sendJson(res, 400, { error: 'Datos incompletos' });
        return;
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await execQuery(
          conn,
          'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?)',
          [codigo, ordinal, 'empacado', 'FAC']
        );
        await execQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigo, 'empacado']);
        await execQuery(conn, 'CALL get_actualizarsaldostock(?, ?)', ['FAC', codigo]);
        await conn.commit();
        sendJson(res, 200, { status: 'ok' });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    sendJson(res, 500, { error: 'Error interno del servidor' });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }

  const filePath = parsedUrl.pathname === '/' ? path.join(BASE_DIR, 'index.html') : path.join(BASE_DIR, parsedUrl.pathname);
  serveStatic(res, filePath);
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  logLine(`Server iniciado en puerto ${PORT}`);
});
