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
  const base = `CU-007-${datePart}-${timePart}`;
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
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
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

function normalizeDsn(dsn) {
  if (!dsn) return dsn;
  const match = dsn.match(/^(mysql:\/\/[^@]+)@tcp\(([^)]+)\)(\/.+)$/i);
  if (match) {
    return `${match[1]}@${match[2]}${match[3]}`;
  }
  return dsn;
}

async function initPool() {
  const configText = fs.readFileSync(ERP_YML_PATH, 'utf8');
  const { name, dsn } = parseErpYaml(configText);
  if (!name || !dsn) {
    throw new Error('No se pudo leer la configuracion de erp.yml');
  }
  writeLog('CONFIG', `DB name=${name}`);
  const normalizedDsn = normalizeDsn(dsn);
  const pool = mysql.createPool({ uri: normalizedDsn, waitForConnections: true, connectionLimit: 10 });
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

async function execQueryConn(conn, sql, params = []) {
  logSql(sql, params);
  return conn.query(sql, params);
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

      if (pathname === '/api/logs') {
        const data = fs.readFileSync(logFilePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(data);
      }

      if (pathname === '/api/clientes-pendientes' && req.method === 'GET') {
        const rows = await callProcedure(pool, 'CALL get_clientes_saldo_pendiente()');
        const filtered = (rows || []).filter((row) => {
          const saldo = Number(row.saldo_final || row.vSaldoPendiente || row.vsaldo_final || row.saldo || 0);
          return saldo > 0;
        });
        return sendJson(res, 200, filtered);
      }

      if (pathname === '/api/cuentas-bancarias' && req.method === 'GET') {
        const rows = await callProcedure(pool, 'CALL get_cuentasbancarias()');
        return sendJson(res, 200, rows || []);
      }

      if (pathname === '/api/numero-documento' && req.method === 'GET') {
        const [rows] = await execQuery(
          pool,
          "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'REC'"
        );
        return sendJson(res, 200, { next: rows?.[0]?.next || 1 });
      }

      if (pathname === '/api/recibos' && req.method === 'POST') {
        const body = await parseBody(req);
        const {
          fecha_emision,
          tipo_documento,
          numero_documento,
          codigo_cliente,
          codigo_cuentabancaria,
          monto,
        } = body;

        if (!fecha_emision || !tipo_documento || !numero_documento || !codigo_cliente || !codigo_cuentabancaria || !monto) {
          return sendJson(res, 400, { error: 'Datos incompletos' });
        }

        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await execQueryConn(
            conn,
            `INSERT INTO mov_contable
            (fecha_emision, fecha_valor, fecha_vencimiento, tipo_documento, numero_documento, codigo_cliente, codigo_cuentabancaria, saldo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ,
            [
              fecha_emision,
              fecha_emision,
              fecha_emision,
              tipo_documento,
              numero_documento,
              codigo_cliente,
              codigo_cuentabancaria,
              monto,
            ]
          );

          await execQueryConn(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [codigo_cliente, tipo_documento, monto]);
          await execQueryConn(conn, 'CALL aplicar_pago_cliente(?, ?)', [tipo_documento, numero_documento]);

          await conn.commit();
          return sendJson(res, 200, { ok: true });
        } catch (error) {
          await conn.rollback();
          writeLog('ERROR', error.stack || error.message || String(error));
          return sendJson(res, 500, { error: 'Error al registrar recibo' });
        } finally {
          conn.release();
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      writeLog('ERROR', error.stack || error.message || String(error));
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Server error' }));
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    writeLog('SERVER', `Servidor escuchando en puerto ${PORT}`);
  });
}

startServer().catch((error) => {
  writeLog('ERROR', error.stack || error.message || String(error));
});
