const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3004;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU004';

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
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function logError(error) {
  logLine('ERROR', error && error.stack ? error.stack : error.message);
}

function parseErpConfig() {
  const configPath = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
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

logLine('INFO', `Iniciando servidor CU004 usando DB: ${name}`);

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
    const safePath = route.replace(/^\//, '');
    return sendFile(res, path.join(ROOT_DIR, safePath));
  }

  if (method === 'GET' && route === '/api/paquetes') {
    const estado = parsed.query.estado;
    if (!estado) {
      return sendJson(res, 400, { message: 'Estado requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_paquetes_por_estado(?)', [estado]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar paquetes.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/mov-detalle') {
    const tipo = parsed.query.tipo;
    const numero = parsed.query.numero;
    if (!tipo || !numero) {
      return sendJson(res, 400, { message: 'Parametros requeridos.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_mov_contable_detalle(?, ?)', [tipo, numero]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar detalle.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/viaje') {
    const numero = parsed.query.numero;
    if (!numero) {
      return sendJson(res, 400, { message: 'Numero requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_viaje_por_documento(?)', [numero]);
      return sendJson(res, 200, rows[0]?.[0] || null);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar viaje.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/paquetes/ordinal') {
    const codigo = parsed.query.codigo;
    const index = parsed.query.index;
    if (!codigo) {
      return sendJson(res, 400, { message: 'Codigo requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(ordinal), 0) AS max_ordinal, COUNT(*) AS total FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo]
      );
      const maxOrdinal = rows[0]?.max_ordinal || 0;
      const total = rows[0]?.total || 0;
      let next = maxOrdinal + 1;
      if (total === 0 && index !== undefined && !Number.isNaN(Number(index))) {
        next = Number(index) + 1;
      }
      return sendJson(res, 200, { next, exists: total > 0 });
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular ordinal.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/logs') {
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      return sendJson(res, 200, { content });
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'No se pudo leer el log.' });
    }
  }

  if (method === 'POST' && route === '/api/paquetes/estado') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      logError(error);
      return sendJson(res, 400, { message: 'JSON invalido.' });
    }

    const codigo = body.codigo_paquete;
    const estado = body.estado;
    const ordinal = body.ordinal;
    const codigoviaje = body.codigoviaje;

    if (!codigo || !estado || !ordinal) {
      return sendJson(res, 400, { message: 'Datos incompletos.' });
    }

    const estadoLower = String(estado).toLowerCase();
    const permitidos = ['robado', 'devuelto', 'empacado', 'llegado'];
    if (!permitidos.includes(estadoLower)) {
      return sendJson(res, 400, { message: 'Estado no permitido.' });
    }

    const requiereCierre = ['robado', 'devuelto', 'empacado', 'llegado'].includes(estadoLower);
    if (requiereCierre && !codigoviaje) {
      return sendJson(res, 400, { message: 'Codigo viaje requerido.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await queryDb(connection, 'CALL cambiar_estado_paquete(?, ?)', [codigo, estadoLower]);
      await queryDb(
        connection,
        'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?) ',
        [codigo, ordinal, estadoLower, 'FAC']
      );
      if (requiereCierre) {
        const [result] = await queryDb(
          connection,
          'UPDATE detalleviaje SET fecha_fin = NOW() WHERE codigoviaje = ? AND tipo_documento = ? AND numero_documento = ?',
          [codigoviaje, 'FAC', codigo]
        );
        if (result.affectedRows === 0) {
          await queryDb(
            connection,
            'INSERT INTO detalleviaje (codigoviaje, tipo_documento, numero_documento, fecha_inicio, fecha_fin) VALUES (?, ?, ?, NOW(), NOW())',
            [codigoviaje, 'FAC', codigo]
          );
        }
      }
      await connection.commit();
      return sendJson(res, 200, { message: 'OK' });
    } catch (error) {
      await connection.rollback();
      logError(error);
      return sendJson(res, 500, { message: 'Error al actualizar estado.' });
    } finally {
      connection.release();
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logError(error);
    sendJson(res, 500, { message: 'Internal server error.' });
  });
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
