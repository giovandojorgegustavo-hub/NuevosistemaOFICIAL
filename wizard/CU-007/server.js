const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_YML = path.join(ROOT_DIR, '..', '..', 'erp.yml');
const PORT = process.env.PORT || 3007;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  const now = new Date();
  return now.toISOString();
}

function fileTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function nextLogFile() {
  ensureDir(LOG_DIR);
  const base = `CU-007-${fileTimestamp()}`;
  let suffix = 1;
  let filePath = '';
  while (true) {
    const seq = String(suffix).padStart(3, '0');
    filePath = path.join(LOG_DIR, `${base}-${seq}.log`);
    if (!fs.existsSync(filePath)) break;
    suffix += 1;
  }
  return filePath;
}

const logFile = nextLogFile();

function logLine(level, message, meta) {
  const entry = {
    ts: timestamp(),
    level,
    message,
    meta: meta || null
  };
  const line = JSON.stringify(entry);
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
}

function parseErpConfig() {
  const raw = fs.readFileSync(ERP_YML, 'utf8');
  const nameMatch = raw.match(/name:\s*"?([^"\n]+)"?/);
  const dsnMatch = raw.match(/dsn:\s*"?([^"\n]+)"?/);
  if (!dsnMatch) {
    throw new Error('No se encontró dsn en erp.yml');
  }
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    dsn: dsnMatch[1].trim()
  };
}

function parseDsn(dsn, nameOverride) {
  const regex = /^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/;
  const match = dsn.match(regex);
  if (!match) {
    throw new Error('DSN inválido en erp.yml');
  }
  const database = nameOverride || match[5];
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database
  };
}

const config = parseErpConfig();
const dbConfig = parseDsn(config.dsn, config.name);
const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  port: dbConfig.port,
  database: dbConfig.database,
  connectionLimit: 10
});

async function execQuery(connOrPool, sql, params) {
  logLine('sql', sql, { params });
  return connOrPool.query(sql, params);
}

function normalizeRows(result) {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0];
    }
    return result;
  }
  return [];
}

function sendJson(res, statusCode, payload) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json'
  });
  res.end(json);
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload demasiado grande'));
        req.socket.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function validateRecibo(payload) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const amountRegex = /^\d+(\.\d{1,2})?$/;
  const docRegex = /^\d{12}$/;

  if (!payload.codigo_cliente) return 'Código de cliente requerido';
  if (!payload.codigo_cuentabancaria) return 'Cuenta bancaria requerida';
  if (!payload.fecha_emision || !dateRegex.test(payload.fecha_emision)) return 'Fecha inválida';
  if (!payload.numero_documento || !docRegex.test(payload.numero_documento)) return 'Número de documento inválido';
  if (!payload.monto || !amountRegex.test(String(payload.monto))) return 'Monto inválido';
  const monto = Number(payload.monto);
  if (monto <= 0) return 'Monto debe ser mayor que 0';
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname } = parsedUrl;
  logLine('info', 'endpoint_invoked', { method: req.method, path: pathname });

  try {
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return sendFile(res, path.join(ROOT_DIR, 'index.html'), 'text/html');
    }
    if (req.method === 'GET' && pathname === '/styles.css') {
      return sendFile(res, path.join(ROOT_DIR, 'styles.css'), 'text/css');
    }
    if (req.method === 'GET' && pathname === '/app.js') {
      return sendFile(res, path.join(ROOT_DIR, 'app.js'), 'application/javascript');
    }

    if (req.method === 'GET' && pathname === '/api/clientes-pendientes') {
      const [result] = await execQuery(pool, 'CALL get_clientes_saldo_pendiente()', []);
      const rows = normalizeRows(result);
      const filtered = rows.filter((row) => Number(row.saldo_final || 0) > 0);
      return sendJson(res, 200, { data: filtered });
    }

    if (req.method === 'GET' && pathname === '/api/cuentas-bancarias') {
      const [result] = await execQuery(pool, 'CALL get_cuentasbancarias()', []);
      const rows = normalizeRows(result);
      return sendJson(res, 200, { data: rows });
    }

    if (req.method === 'GET' && pathname === '/api/next-numero-documento') {
      const [rows] = await execQuery(
        pool,
        "SELECT LPAD(COALESCE(MAX(numero_documento), 0) + 1, 12, '0') AS next FROM mov_contable WHERE tipo_documento = 'REC'",
        []
      );
      const next = rows && rows[0] ? rows[0].next : '000000000001';
      return sendJson(res, 200, { data: { next } });
    }

    if (req.method === 'POST' && pathname === '/api/recibos') {
      const payload = await parseBody(req);
      const error = validateRecibo(payload);
      if (error) {
        return sendJson(res, 400, { message: error });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const insertSql = `
          INSERT INTO mov_contable (
            fecha_emision,
            fecha_valor,
            fecha_vencimiento,
            tipo_documento,
            numero_documento,
            codigo_cliente,
            codigo_cuentabancaria,
            saldo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
          payload.fecha_emision,
          payload.fecha_emision,
          payload.fecha_emision,
          payload.tipo_documento,
          payload.numero_documento,
          payload.codigo_cliente,
          payload.codigo_cuentabancaria,
          payload.monto
        ];
        await execQuery(connection, insertSql, values);

        const spSql = 'CALL actualizarsaldosclientes(?, ?, ?)';
        await execQuery(connection, spSql, [payload.codigo_cliente, payload.tipo_documento, payload.monto]);

        await connection.commit();
        return sendJson(res, 200, { message: 'Recibo registrado' });
      } catch (err) {
        await connection.rollback();
        logLine('error', 'recibo_error', { error: err.message });
        return sendJson(res, 500, { message: 'Error al registrar el recibo' });
      } finally {
        connection.release();
      }
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch (error) {
    logLine('error', 'server_error', { error: error.message });
    sendJson(res, 500, { message: 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  logLine('info', 'server_started', { port: PORT, database: dbConfig.database });
});
