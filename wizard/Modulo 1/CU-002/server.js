const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU-002';

function timestamp() {
  return new Date().toISOString();
}

function formatFileDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const baseName = `${LOG_PREFIX}-${formatFileDate(new Date())}`;
  let suffix = 1;
  let filePath;
  do {
    const suffixStr = String(suffix).padStart(3, '0');
    filePath = path.join(LOG_DIR, `${baseName}-${suffixStr}.log`);
    suffix += 1;
  } while (fs.existsSync(filePath));
  fs.writeFileSync(filePath, '', 'utf8');
  return filePath;
}

const logFile = ensureLogFile();

function logLine(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function parseErpConfig() {
  const configPath = path.join(ROOT_DIR, '..', '..', 'erp.yml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const nameMatch = raw.match(/name:\s*"?([^"\n]+)"?/);
  const dsnMatch = raw.match(/dsn:\s*"?([^"\n]+)"?/);
  if (!nameMatch || !dsnMatch) {
    throw new Error('No se encontro la configuracion en erp.yml');
  }
  return { name: nameMatch[1].trim(), dsn: dsnMatch[1].trim() };
}

function parseMysqlDsn(dsn) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('Formato DSN no valido');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5],
  };
}

const { name, dsn } = parseErpConfig();
const dbConfig = parseMysqlDsn(dsn);
if (dbConfig.database !== name) {
  logLine('INFO', `DB en DSN (${dbConfig.database}) ajustada a ${name} segun erp.yml`);
}
dbConfig.database = name;

logLine('INFO', `Iniciando servidor CU-002 usando DB: ${name}`);

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

async function queryDb(connection, sql, params = []) {
  logLine('SQL', `${sql} | params: ${JSON.stringify(params)}`);
  return connection.query(sql, params);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType =
    ext === '.css' ? 'text/css' :
    ext === '.js' ? 'application/javascript' :
    'text/html';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const route = parsed.pathname;

  logLine('INFO', `ENDPOINT: ${method} ${route}`);

  if (method === 'GET' && route === '/') {
    return sendFile(res, path.join(ROOT_DIR, 'index.html'));
  }

  if (method === 'GET' && (route.endsWith('.css') || route.endsWith('.js'))) {
    return sendFile(res, path.join(ROOT_DIR, route));
  }

  if (method === 'GET' && route === '/api/paquetes') {
    const estado = parsed.query.estado || 'pendiente empacar';
    logLine('INFO', `ENDPOINT: GET /api/paquetes?estado=${estado}`);
    try {
      const [rows] = await queryDb(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logLine('ERROR', error.message);
      return sendJson(res, 500, { message: 'Error al obtener paquetes.' });
    }
  }

  if (method === 'GET' && route === '/api/paquetes/detalle') {
    const codigo = parsed.query.codigo;
    const tipo = parsed.query.tipo || 'FAC';
    logLine('INFO', `ENDPOINT: GET /api/paquetes/detalle?codigo=${codigo}&tipo=${tipo}`);

    if (!codigo) {
      return sendJson(res, 400, { message: 'Codigo requerido.' });
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_mov_contable_detalle(?, ?)', [tipo, codigo]);
      const [ordinalRows] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo]
      );
      const ordinal = ordinalRows[0]?.next || 1;
      return sendJson(res, 200, { detalle: rows[0] || [], ordinal });
    } catch (error) {
      logLine('ERROR', error.message);
      return sendJson(res, 500, { message: 'Error al obtener detalle.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'POST' && route === '/api/empacar') {
    logLine('INFO', 'ENDPOINT: POST /api/empacar');
    let payload;
    try {
      payload = await parseBody(req);
    } catch (error) {
      logLine('ERROR', error.message);
      return sendJson(res, 400, { message: 'Payload invalido.' });
    }

    const { codigo_paquete } = payload || {};
    const codeRegex = /^[0-9A-Za-z-]+$/;

    if (!codigo_paquete || !codeRegex.test(codigo_paquete)) {
      return sendJson(res, 400, { message: 'Codigo de paquete invalido.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [ordinalRows] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo_paquete]
      );
      const ordinal = ordinalRows[0]?.next || 1;

      await queryDb(
        connection,
        "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, 'empacado', 'FAC')",
        [codigo_paquete, ordinal]
      );

      await queryDb(connection, 'CALL cambiar_estado_paquete(?, ?)', [codigo_paquete, 'empacado']);
      await queryDb(connection, 'CALL get_actualizarsaldostock(?, ?)', ['FAC', codigo_paquete]);

      await connection.commit();
      return sendJson(res, 200, { codigo_paquete, ordinal });
    } catch (error) {
      await connection.rollback();
      logLine('ERROR', error.stack || error.message);
      return sendJson(res, 500, { message: 'Error al registrar empaque.' });
    } finally {
      connection.release();
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
