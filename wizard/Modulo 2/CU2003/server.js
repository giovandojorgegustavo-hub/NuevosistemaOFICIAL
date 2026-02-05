const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3011;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU2003';

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
    database: match[5]
  };
}

const { name, dsn } = parseErpConfig();
const dbConfig = parseMysqlDsn(dsn);
if (dbConfig.database !== name) {
  logLine('INFO', `DB en DSN (${dbConfig.database}) ajustada a ${name} segun erp.yml`);
}
dbConfig.database = name;

logLine('INFO', `Iniciando servidor CU2003 usando DB: ${name}`);

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10
});

async function queryDb(connection, sql, params = []) {
  logLine('SQL', `${sql} | params: ${JSON.stringify(params)}`);
  return connection.query(sql, params);
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

  if (method === 'GET' && route === '/api/bases') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_bases()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar bases.' });
    } finally {
      connection.release();
    }
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

  if (method === 'GET' && route === '/api/viajes/next-codigo') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
      return sendJson(res, 200, { next: rows[0]?.next || '' });
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular codigo de viaje.' });
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
      return sendJson(res, 500, { message: 'No se pudo leer logs.' });
    }
  }

  if (method === 'POST' && route === '/api/asignar-viaje') {
    let payload;
    try {
      payload = await parseBody(req);
    } catch (error) {
      logError(error);
      return sendJson(res, 400, { message: 'Body invalido.' });
    }

    const viaje = payload.viaje || {};
    const paquetes = Array.isArray(payload.paquetes) ? payload.paquetes : [];

    if (!viaje.codigo_base || !viaje.nombre_motorizado || !viaje.link || !viaje.fecha) {
      return sendJson(res, 400, { message: 'Faltan datos requeridos del viaje.' });
    }
    if (paquetes.length === 0) {
      return sendJson(res, 400, { message: 'Selecciona al menos un paquete.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let codigoViaje = String(viaje.codigo_viaje || '').trim();
      if (!viaje.es_existente) {
        const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
        codigoViaje = String(rows[0]?.next || '').trim();
      }

      if (!codigoViaje) {
        throw new Error('Codigo de viaje invalido.');
      }

      await queryDb(
        connection,
        'INSERT INTO viajes (codigoviaje, codigo_base, nombre_motorizado, numero_wsp, num_llamadas, num_yape, link, observacion, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          codigoViaje,
          viaje.codigo_base,
          viaje.nombre_motorizado,
          viaje.numero_wsp || null,
          viaje.num_llamadas || null,
          viaje.num_yape || null,
          viaje.link,
          viaje.observacion || null,
          viaje.fecha
        ]
      );

      for (const item of paquetes) {
        const codigoPaquete = item.codigo_paquete;
        if (!codigoPaquete) continue;

        let ordinal = 1;
        const [countRows] = await queryDb(
          connection,
          "SELECT COUNT(*) AS total FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
          [codigoPaquete]
        );
        if ((countRows?.[0]?.total || 0) > 0) {
          const [ordinalRows] = await queryDb(
            connection,
            "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
            [codigoPaquete]
          );
          ordinal = ordinalRows[0]?.next || 1;
        } else {
          ordinal = Number(item.index || 0) + 1;
        }

        await queryDb(
          connection,
          'INSERT INTO detalleviaje (codigoviaje, numero_documento, tipo_documento, fecha_inicio) VALUES (?, ?, ?, NOW())',
          [codigoViaje, codigoPaquete, 'FAC']
        );

        await queryDb(
          connection,
          'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?)',
          [codigoPaquete, ordinal, 'en camino', 'FAC']
        );

        await queryDb(connection, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, 'en camino']);
      }

      await connection.commit();
      return sendJson(res, 200, { codigoviaje: codigoViaje });
    } catch (error) {
      await connection.rollback();
      logError(error);
      return sendJson(res, 500, { message: 'Error al asignar viaje.' });
    } finally {
      connection.release();
    }
  }

  sendJson(res, 404, { message: 'Not found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logError(error);
    sendJson(res, 500, { message: 'Error interno.' });
  });
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
