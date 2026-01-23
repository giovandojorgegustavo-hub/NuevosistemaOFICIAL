const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = path.resolve(__dirname);
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_YML_PATH = path.resolve(__dirname, '..', '..', 'erp.yml');

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
  const base = `CU-004-${datePart}-${timePart}`;
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

async function initPool() {
  const configText = fs.readFileSync(ERP_YML_PATH, 'utf8');
  const { name, dsn } = parseErpYaml(configText);
  if (!name || !dsn) {
    throw new Error('No se pudo leer la configuracion de erp.yml');
  }
  writeLog('CONFIG', `DB name=${name}`);
  const pool = mysql.createPool({ uri: dsn, waitForConnections: true, connectionLimit: 10 });
  await pool.query('USE ??', [name]);
  return { pool, dbName: name };
}

function logSql(sql, params = []) {
  writeLog('SQL', `${sql} | params=${JSON.stringify(params)}`);
}

async function execQuery(pool, sql, params = []) {
  logSql(sql, params);
  return pool.query(sql, params);
}

async function callProcedure(pool, sql, params = []) {
  const [rows] = await execQuery(pool, sql, params);
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

function getRouteSegments(reqUrl) {
  return reqUrl.split('?')[0].split('/').filter(Boolean);
}

async function startServer() {
  const { pool } = await initPool();
  writeLog('SERVER', 'Inicio del servidor');

  const server = http.createServer(async (req, res) => {
    try {
      const parsed = url.parse(req.url, true);
      const pathname = parsed.pathname || '/';
      writeLog('ENDPOINT', `${req.method} ${pathname}`);

      if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(ROOT_DIR, 'index.html'));
      }
      if (pathname === '/styles.css') {
        return serveStatic(res, path.join(ROOT_DIR, 'styles.css'));
      }
      if (pathname === '/app.js') {
        return serveStatic(res, path.join(ROOT_DIR, 'app.js'));
      }

      if (pathname.startsWith('/api/')) {
        const segments = getRouteSegments(pathname);

        if (req.method === 'GET' && pathname === '/api/paquetes-en-camino') {
          const rows = await callProcedure(pool, 'CALL get_paquetes_por_estado(?)', ['en camino']);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && segments[0] === 'api' && segments[1] === 'paquete' && segments[2]) {
          const codigo = decodeURIComponent(segments[2]);
          const viaje = await callProcedure(pool, 'CALL get_viaje_por_documento(?)', [codigo]);
          const detalle = await callProcedure(pool, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
          const [ordinalRows] = await execQuery(
            pool,
            "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
            [codigo]
          );
          const ordinal = ordinalRows?.[0]?.next || 1;
          return sendJson(res, 200, {
            viaje: Array.isArray(viaje) ? viaje[0] || {} : viaje || {},
            detalle: detalle || [],
            ordinal,
          });
        }

        if (
          req.method === 'POST' &&
          segments[0] === 'api' &&
          segments[1] === 'paquete' &&
          segments[2] &&
          segments[3] === 'estado'
        ) {
          const codigo = decodeURIComponent(segments[2]);
          let body = {};
          try {
            body = await parseBody(req);
          } catch (error) {
            return sendJson(res, 400, { message: 'JSON invalido' });
          }
          const estado = body.estado;
          const allowed = new Set(['robado', 'devuelto', 'standby', 'llegado']);
          if (!allowed.has(estado)) {
            return sendJson(res, 400, { message: 'Estado no permitido' });
          }

          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            logSql('CALL cambiar_estado_paquete(?, ?)', [codigo, estado]);
            await conn.query('CALL cambiar_estado_paquete(?, ?)', [codigo, estado]);

            logSql(
              "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
              [codigo]
            );
            const [ordinalRows] = await conn.query(
              "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
              [codigo]
            );
            const ordinal = ordinalRows?.[0]?.next || 1;

            logSql(
              "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, 'FAC')",
              [codigo, ordinal, estado]
            );
            await conn.query(
              "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, 'FAC')",
              [codigo, ordinal, estado]
            );

            if (['robado', 'devuelto', 'llegado'].includes(estado)) {
              logSql('UPDATE detalleviaje SET fecha_fin = NOW() WHERE codigo_paquete = ?', [codigo]);
              await conn.query('UPDATE detalleviaje SET fecha_fin = NOW() WHERE codigo_paquete = ?', [codigo]);
            }

            await conn.commit();
            return sendJson(res, 200, { ok: true, ordinal });
          } catch (error) {
            await conn.rollback();
            writeLog('ERROR', error.stack || error.message);
            return sendJson(res, 500, { message: 'Error al guardar la operacion' });
          } finally {
            conn.release();
          }
        }

        if (req.method === 'GET' && pathname === '/api/logs/latest') {
          const content = fs.readFileSync(logFilePath, 'utf8');
          return sendJson(res, 200, { content });
        }

        return sendJson(res, 404, { message: 'Endpoint no encontrado' });
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (error) {
      writeLog('ERROR', error.stack || error.message);
      sendJson(res, 500, { message: 'Error interno del servidor' });
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
