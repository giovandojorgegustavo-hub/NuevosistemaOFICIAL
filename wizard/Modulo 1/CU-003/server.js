const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = path.resolve(__dirname);
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_YML_PATH = path.resolve(__dirname, '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU-003';

function timestamp() {
  return new Date().toISOString();
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
    now.getSeconds()
  ).padStart(2, '0')}`;
  const base = `${LOG_PREFIX}-${datePart}-${timePart}`;
  let suffix = 1;
  let filename = `${base}-001.log`;
  while (fs.existsSync(path.join(LOG_DIR, filename))) {
    suffix += 1;
    filename = `${base}-${String(suffix).padStart(3, '0')}.log`;
  }
  return path.join(LOG_DIR, filename);
}

const logFilePath = ensureLogFile();

function writeLog(level, message) {
  const line = `[${timestamp()}] ${level} | ${message}`;
  console.log(line);
  fs.appendFileSync(logFilePath, `${line}\n`);
}

function parseErpYaml(content) {
  const nameMatch = content.match(/name:\s*"?([^"\n]+)"?/i);
  const dsnMatch = content.match(/dsn:\s*"?([^"\n]+)"?/i);
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    dsn: dsnMatch ? dsnMatch[1].trim() : null,
  };
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

async function initPool() {
  const configText = fs.readFileSync(ERP_YML_PATH, 'utf8');
  const { name, dsn } = parseErpYaml(configText);
  if (!name || !dsn) {
    throw new Error('No se pudo leer la configuracion de erp.yml');
  }
  const parsed = parseMysqlDsn(dsn);
  if (parsed.database !== name) {
    writeLog('CONFIG', `DB en DSN (${parsed.database}) ajustada a ${name}`);
  }
  writeLog('CONFIG', `DB name=${name}`);
  const pool = mysql.createPool({
    ...parsed,
    database: name,
    waitForConnections: true,
    connectionLimit: 10
  });
  return { pool, dbName: name };
}

function logSql(sql, params = []) {
  writeLog('SQL', `${sql} | params=${JSON.stringify(params)}`);
}

async function execQuery(conn, sql, params = []) {
  logSql(sql, params);
  return conn.query(sql, params);
}

async function callProcedure(conn, sql, params = []) {
  const [rows] = await execQuery(conn, sql, params);
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === '.html'
      ? 'text/html'
      : ext === '.css'
      ? 'text/css'
      : ext === '.js'
      ? 'application/javascript'
      : 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function startServer() {
  const { pool, dbName } = await initPool();
  writeLog('SERVER', `Iniciando servidor CU-003 usando DB: ${dbName}`);

  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const method = req.method.toUpperCase();

    writeLog('ENDPOINT', `${method} ${pathname}`);

    try {
      if (method === 'GET' && pathname === '/') {
        return serveStatic(res, path.join(ROOT_DIR, 'index.html'));
      }

      if (method === 'GET' && (pathname.endsWith('.css') || pathname.endsWith('.js'))) {
        return serveStatic(res, path.join(ROOT_DIR, pathname));
      }

      if (method === 'GET' && pathname === '/api/now') {
        const [rows] = await execQuery(pool, "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d') AS fecha, DATE_FORMAT(NOW(), '%H:%i:%s') AS hora");
        return sendJson(res, 200, rows[0] || {});
      }

      if (method === 'GET' && pathname === '/api/bases') {
        try {
          const rows = await callProcedure(pool, 'CALL get_bases()');
          return sendJson(res, 200, rows || []);
        } catch (error) {
          writeLog('ERROR', error.stack || error.message);
          return sendJson(res, 500, { message: 'Error al cargar bases.' });
        }
      }

      if (method === 'GET' && pathname === '/api/viajes/next') {
        try {
          const [rows] = await execQuery(pool, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
          return sendJson(res, 200, rows[0] || { next: 1 });
        } catch (error) {
          writeLog('ERROR', error.stack || error.message);
          return sendJson(res, 500, { message: 'Error al obtener codigo de viaje.' });
        }
      }

      if (method === 'GET' && pathname === '/api/paquetes') {
        const estado = parsed.query.estado || 'empacado';
        try {
          const rows = await callProcedure(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
          return sendJson(res, 200, rows || []);
        } catch (error) {
          writeLog('ERROR', error.stack || error.message);
          return sendJson(res, 500, { message: 'Error al cargar paquetes.' });
        }
      }

      if (method === 'GET' && pathname === '/api/logs/latest') {
        const content = fs.readFileSync(logFilePath, 'utf8');
        return sendJson(res, 200, { content });
      }

      if (method === 'POST' && pathname === '/api/viajes/assign') {
        let payload;
        try {
          payload = await parseBody(req);
        } catch (error) {
          writeLog('ERROR', error.stack || error.message);
          return sendJson(res, 400, { message: 'Payload invalido.' });
        }

        const {
          codigo_base,
          nombre_motorizado,
          numero_wsp,
          num_llamadas,
          num_yape,
          link,
          observacion,
          paquetes
        } = payload || {};

        const nameRegex = /^[A-Za-z0-9\s'.-]{2,}$/;
        const linkRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
        const phoneRegex = /^[0-9+()\s-]{6,20}$/;
        const codeRegex = /^[0-9A-Za-z-]+$/;

        if (!codigo_base) {
          return sendJson(res, 400, { message: 'Base requerida.' });
        }
        if (!nombre_motorizado || !nameRegex.test(nombre_motorizado.trim())) {
          return sendJson(res, 400, { message: 'Nombre motorizado invalido.' });
        }
        if (!link || !linkRegex.test(link.trim())) {
          return sendJson(res, 400, { message: 'Link invalido.' });
        }
        if (numero_wsp && !phoneRegex.test(numero_wsp.trim())) {
          return sendJson(res, 400, { message: 'Numero WhatsApp invalido.' });
        }
        if (num_llamadas && !phoneRegex.test(num_llamadas.trim())) {
          return sendJson(res, 400, { message: 'Numero llamadas invalido.' });
        }
        if (num_yape && !phoneRegex.test(num_yape.trim())) {
          return sendJson(res, 400, { message: 'Numero Yape invalido.' });
        }
        if (!Array.isArray(paquetes) || paquetes.length === 0) {
          return sendJson(res, 400, { message: 'Selecciona paquetes.' });
        }
        const invalid = paquetes.find((codigo) => !codeRegex.test(String(codigo || '')));
        if (invalid) {
          return sendJson(res, 400, { message: 'Codigo de paquete invalido.' });
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();

          const [nextRows] = await execQuery(conn, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
          const codigoviaje = nextRows[0]?.next || 1;

          await execQuery(
            conn,
            'INSERT INTO viajes (codigoviaje, codigo_base, nombre_motorizado, numero_wsp, num_llamadas, num_yape, link, observacion, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [
              codigoviaje,
              codigo_base,
              nombre_motorizado.trim(),
              numero_wsp ? numero_wsp.trim() : null,
              num_llamadas ? num_llamadas.trim() : null,
              num_yape ? num_yape.trim() : null,
              link.trim(),
              observacion ? observacion.trim() : null
            ]
          );

          for (const codigo of paquetes) {
            const codigoPaquete = String(codigo).trim();
            const [ordinalRows] = await execQuery(
              conn,
              "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
              [codigoPaquete]
            );
            const ordinal = ordinalRows[0]?.next || 1;

            await execQuery(
              conn,
              "INSERT INTO detalleviaje (codigoviaje, numero_documento, tipo_documento, fecha_inicio) VALUES (?, ?, 'FAC', NOW())",
              [codigoviaje, codigoPaquete]
            );

            await execQuery(
              conn,
              "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, 'en camino', 'FAC')",
              [codigoPaquete, ordinal]
            );

            await execQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, 'en camino']);
          }

          await conn.commit();
          return sendJson(res, 200, { codigoviaje, paquetes: paquetes.length });
        } catch (error) {
          await conn.rollback();
          writeLog('ERROR', error.stack || error.message);
          return sendJson(res, 500, { message: 'Error al guardar asignacion.' });
        } finally {
          conn.release();
        }
      }

      return sendJson(res, 404, { message: 'Endpoint no encontrado' });
    } catch (error) {
      writeLog('ERROR', error.stack || error.message);
      return sendJson(res, 500, { message: 'Error interno del servidor.' });
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    writeLog('SERVER', `Servidor escuchando en puerto ${PORT}`);
  });
}

startServer().catch((error) => {
  writeLog('ERROR', error.stack || error.message);
  process.exit(1);
});
