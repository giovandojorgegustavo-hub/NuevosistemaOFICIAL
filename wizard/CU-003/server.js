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
    filePath = path.join(LOG_DIR, `CU-003-${stamp}-${suffix}.log`);
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

async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  logLine(`Endpoint: ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/bases') {
      const [rows] = await execQuery(pool, 'CALL get_bases()');
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/viajes/next') {
      const [rows] = await execQuery(pool, 'SELECT IFNULL(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
      sendJson(res, 200, rows[0] || { next: 1 });
      return;
    }

    if (pathname === '/api/paquetes') {
      const estado = query.estado || 'empacado';
      const [rows] = await execQuery(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/logs/latest') {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      sendJson(res, 200, { file: path.basename(LOG_FILE), content });
      return;
    }

    if (pathname === '/api/viajes' && req.method === 'POST') {
      const body = await parseBody(req);
      const response = await registrarViaje(body);
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 404, { error: 'Endpoint no encontrado' });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    sendJson(res, 500, { error: error.message });
  }
}

async function registrarViaje(payload) {
  const codigoBase = payload.codigo_base;
  const nombreMotorizado = payload.nombre_motorizado;
  const paquetes = Array.isArray(payload.paquetes) ? payload.paquetes : [];

  if (!codigoBase || !nombreMotorizado || paquetes.length === 0) {
    throw new Error('Datos incompletos para registrar viaje');
  }

  const conn = await pool.getConnection();
  try {
    await execQuery(conn, 'START TRANSACTION');
    const [rows] = await execQuery(conn, 'SELECT IFNULL(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
    const codigoviaje = rows[0]?.next || 1;

    await execQuery(
      conn,
      `INSERT INTO viajes
        (codigoviaje, codigo_base, nombre_motorizado, numero_wsp, num_llamadas, num_yape, link, observacion, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        codigoviaje,
        codigoBase,
        nombreMotorizado,
        payload.numero_wsp || null,
        payload.num_llamadas || null,
        payload.num_yape || null,
        payload.link || null,
        payload.observacion || null,
      ]
    );

    for (const codigoPaquete of paquetes) {
      await execQuery(
        conn,
        `INSERT INTO detalleviaje
          (codigoviaje, tipo_documento, numero_documento, fecha_inicio, fecha_fin)
         VALUES (?, 'F', ?, NOW(), NOW())`,
        [codigoviaje, codigoPaquete]
      );

      const [detalleRows] = await execQuery(
        conn,
        `SELECT ordinal
         FROM mov_contable_detalle
         WHERE tipo_documento = 'F'
           AND numero_documento = ?
         ORDER BY ordinal`,
        [codigoPaquete]
      );

      for (const detalle of detalleRows) {
        await execQuery(
          conn,
          `INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, fecha_registro)
           VALUES (?, ?, 'en camino', NOW())
           ON DUPLICATE KEY UPDATE estado = VALUES(estado)`,
          [codigoPaquete, detalle.ordinal]
        );
      }

      await execQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, 'en camino']);
    }

    await execQuery(conn, 'COMMIT');
    return { codigoviaje, paquetes: paquetes.length };
  } catch (error) {
    await execQuery(conn, 'ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    throw error;
  } finally {
    conn.release();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    await handleApi(req, res);
    return;
  }

  const filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
  serveStatic(res, path.join(BASE_DIR, filePath));
});

const PORT = Number(process.env.PORT || 3002);
server.listen(PORT, () => {
  logLine(`Servidor iniciado en http://localhost:${PORT}`);
});
