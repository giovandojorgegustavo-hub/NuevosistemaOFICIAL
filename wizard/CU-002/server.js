const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', 'erp.yml');

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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
  const pad = (n) => String(n).padStart(2, '0');
  const base = `CU-002-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
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

function parseErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const dsnMatch = raw.match(/dsn:\s*"([^"]+)"/);
  const nameMatch = raw.match(/name:\s*"([^"]+)"/);
  if (!dsnMatch) throw new Error('No se encontró DSN en erp.yml');
  return {
    name: nameMatch ? nameMatch[1] : 'default',
    dsn: dsnMatch[1]
  };
}

async function initDb() {
  const config = parseErpConfig();
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  const pool = mysql.createPool({
    uri: config.dsn,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/html';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`);
}

async function handleRequest(req, res, db) {
  const parsed = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const route = parsed.pathname;

  logLine(`ENDPOINT: ${method} ${route}`);

  if (method === 'GET' && route === '/') {
    return sendFile(res, path.join(ROOT_DIR, 'index.html'));
  }

  if (method === 'GET' && (route.endsWith('.css') || route.endsWith('.js'))) {
    return sendFile(res, path.join(ROOT_DIR, route));
  }

  if (method === 'GET' && route === '/api/paquetes') {
    const estado = parsed.query.estado || 'pendiente empacar';
    const sql = 'CALL get_paquetes_por_estado(?)';
    logSql(sql, [estado]);
    try {
      const [resultSets] = await db.query(sql, [estado]);
      const rows = Array.isArray(resultSets) ? resultSets[0] || [] : [];
      return sendJson(res, 200, rows);
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar paquetes.' });
    }
  }

  if (method === 'GET' && route === '/api/mov-detalle') {
    const tipo = parsed.query.tipo || 'FAC';
    const num = parsed.query.num;
    if (!num) return sendJson(res, 400, { message: 'Falta numero de documento.' });
    const sql = 'CALL get_mov_contable_detalle(?, ?)';
    logSql(sql, [tipo, num]);
    try {
      const [resultSets] = await db.query(sql, [tipo, num]);
      const rows = Array.isArray(resultSets) ? resultSets[0] || [] : [];
      return sendJson(res, 200, rows);
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar detalle.' });
    }
  }

  if (method === 'GET' && route === '/api/ordinal') {
    const codigo = parsed.query.codigo;
    if (!codigo) return sendJson(res, 400, { message: 'Falta codigo_paquete.' });
    const sql = "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'";
    logSql(sql, [codigo]);
    try {
      const [rows] = await db.query(sql, [codigo]);
      const next = rows && rows[0] ? rows[0].next : 1;
      return sendJson(res, 200, { next });
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al calcular ordinal.' });
    }
  }

  if (method === 'POST' && route === '/api/empacar') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const codigo = payload.codigo_paquete;
        if (!codigo) return sendJson(res, 400, { message: 'codigo_paquete es requerido.' });

        const selectSql = "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'";
        logSql(selectSql, [codigo]);

        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();
          const [rows] = await connection.query(selectSql, [codigo]);
          const ordinal = rows && rows[0] ? rows[0].next : 1;

          const insertSql = "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, 'empacado', 'FAC')";
          logSql(insertSql, [codigo, ordinal]);
          await connection.query(insertSql, [codigo, ordinal]);

          const updateSql = 'CALL cambiar_estado_paquete(?, ?)';
          logSql(updateSql, [codigo, 'empacado']);
          await connection.query(updateSql, [codigo, 'empacado']);

          const saldoSql = 'CALL get_actualizarsaldostock(?, ?)';
          logSql(saldoSql, ['FAC', codigo]);
          await connection.query(saldoSql, ['FAC', codigo]);

          await connection.commit();
          connection.release();
          return sendJson(res, 200, { message: 'Empaque registrado correctamente.', ordinal });
        } catch (error) {
          await connection.rollback();
          connection.release();
          logLine(`ERROR: ${error.message}`);
          return sendJson(res, 500, { message: 'Error al registrar empaque.' });
        }
      } catch (error) {
        logLine(`ERROR: ${error.message}`);
        return sendJson(res, 400, { message: 'Payload invalido.' });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

async function start() {
  ensureLogFile();
  const db = await initDb();
  const server = http.createServer((req, res) => {
    handleRequest(req, res, db);
  });
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    logLine(`SERVER STARTED: http://localhost:${port}`);
  });
}

start().catch((error) => {
  logLine(`FATAL: ${error.message}`);
  process.exit(1);
});
