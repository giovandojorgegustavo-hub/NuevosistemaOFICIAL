const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU009';
const PORT = Number(process.env.PORT || getUseCasePort('CU1-009'));

let logStream;

function pad(v) {
  return String(v).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function logLine(message, level = 'INFO') {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (logStream) {
    logStream.write(`${line}\n`);
  }
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  const message = context ? `${context} | ${detail}` : detail;
  logLine(message, 'ERROR');
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const now = new Date();
  const baseName = `${LOG_PREFIX}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let counter = 1;
  let filename;
  do {
    filename = `${baseName}-${String(counter).padStart(3, '0')}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  logStream = fs.createWriteStream(path.join(LOG_DIR, filename), { flags: 'a' });
  logLine(`LOG FILE: ${filename}`);
}

function logSql(sql, params) {
  logLine(`SQL: ${sql} | params=${JSON.stringify(params || [])}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function parseDsn(dsn) {
  const tcpMatch = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (tcpMatch) {
    return {
      user: decodeURIComponent(tcpMatch[1]),
      password: decodeURIComponent(tcpMatch[2]),
      host: tcpMatch[3],
      port: Number(tcpMatch[4]),
      database: tcpMatch[5]
    };
  }

  const parsed = new URL(dsn);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    database: parsed.pathname.replace('/', '')
  };
}

function parseErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const data = yaml.parse(content);

  if (!data || !Array.isArray(data.connections) || data.connections.length === 0) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }

  const firstConnection = data.connections[0];
  if (!firstConnection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }

  return {
    name: firstConnection.name || '',
    dsn: firstConnection.dsn
  };
}

async function initDb() {
  const cfg = parseErpConfig();
  const dbFromDsn = parseDsn(cfg.dsn);
  const selectedDatabase = cfg.name ? cfg.name : dbFromDsn.database;

  logLine(`DB CONFIG: name=${cfg.name} dsn=${cfg.dsn}`);
  return mysql.createPool({
    ...dbFromDsn,
    database: selectedDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function createAppError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.isAppError = true;
  return error;
}

function extractFirstInteger(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = extractFirstInteger(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const parsed = extractFirstInteger(value[key]);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return null;
}

function extractAuthParams(source) {
  const codigoUsuarioRaw = source?.vUsuario ?? source?.Codigo_usuario ?? source?.codigo_usuario;
  const otpRaw = source?.vOTP ?? source?.OTP ?? source?.otp;
  const codigoUsuario = String(codigoUsuarioRaw ?? '').trim();
  const otp = String(otpRaw ?? '').trim();
  return { codigoUsuario, otp };
}

function hasValidAuthFormat(codigoUsuario, otp) {
  if (!codigoUsuario || !otp) return false;
  if (codigoUsuario.length > 36 || otp.length > 6) return false;
  return true;
}

function unauthorizedHtml() {
  const text = 'Warning ACCESO NO AUTORIZADO !!!';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Acceso no autorizado</title></head><body><script>alert(' +
    JSON.stringify(text) +
    ');try{window.open("","_self");window.close();}catch(e){}setTimeout(function(){location.replace("about:blank");},120);</script></body></html>';
}

function resolvePoolReference() {
  if (app.locals && app.locals.db && typeof app.locals.db.getConnection === 'function') return app.locals.db;
  return null;
}

async function validarOtp(poolRef, codigoUsuario, otp) {
  const conn = await poolRef.getConnection();
  try {
    await runQuery(conn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
    const [rows] = await runQuery(conn, 'SELECT @p_resultado AS resultado');
    return extractFirstInteger(rows);
  } finally {
    conn.release();
  }
}

async function authorizeAndServeIndex(req, res) {
  const { codigoUsuario, otp } = extractAuthParams(req.query || {});
  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  const poolRef = resolvePoolReference();
  if (!poolRef) {
    res.status(503).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  try {
    const resultado = await validarOtp(poolRef, codigoUsuario, otp);
    if (resultado !== 1) {
      res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
      return;
    }
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (error) {
    logError(error, 'INDEX OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/pedidos-pendientes', async (req, res) => {
  try {
    const pool = app.locals.db;
    const vClienteFiltro = String(req.query.vClienteFiltro || '').trim().toLowerCase();
    const vFechaFiltro = String(req.query.vFechaFiltro || '').trim();

    if (vFechaFiltro && !/^\d{4}-\d{2}-\d{2}$/.test(vFechaFiltro)) {
      throw createAppError('INVALID_DATE_FILTER', 400);
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_pedidospendientes()');
      let vPedidosPendientes = rows[0] || [];

      if (vClienteFiltro) {
        vPedidosPendientes = vPedidosPendientes.filter((row) => {
          const vNombre = String(row.nombre_cliente || '').toLowerCase();
          const vNumero = String(row.numero_cliente || '').toLowerCase();
          const vCodigo = String(row.codigo_cliente || '').toLowerCase();
          return vNombre.includes(vClienteFiltro) || vNumero.includes(vClienteFiltro) || vCodigo.includes(vClienteFiltro);
        });
      }

      if (vFechaFiltro) {
        vPedidosPendientes = vPedidosPendientes.filter((row) => {
          const vFecha = row.fecha ? new Date(row.fecha) : null;
          if (!vFecha || Number.isNaN(vFecha.getTime())) return false;
          const vIso = `${vFecha.getFullYear()}-${pad(vFecha.getMonth() + 1)}-${pad(vFecha.getDate())}`;
          return vIso === vFechaFiltro;
        });
      }

      return res.json({ ok: true, data: vPedidosPendientes });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PEDIDOS_PENDIENTES_ERROR');
    if (error.isAppError) {
      return res.status(error.status).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/pedido-detalle', async (req, res) => {
  try {
    const pool = app.locals.db;
    const vCodigo_pedido = String(req.query.vCodigo_pedido || '').trim();

    if (!/^\d+$/.test(vCodigo_pedido)) {
      throw createAppError('INVALID_CODIGO_PEDIDO', 400);
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_pedido_detalle_por_pedido(?)', [vCodigo_pedido]);
      const vPedidoDetalle = (rows[0] || []).map((row) => {
        const vCantidadSaldo = Number(row.saldo) || 0;
        const vPrecioUnitario = Number(row.precio_unitario) || 0;
        return {
          ...row,
          vPrecioTotal: Number((vCantidadSaldo * vPrecioUnitario).toFixed(6))
        };
      });

      return res.json({ ok: true, data: vPedidoDetalle });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PEDIDO_DETALLE_ERROR');
    if (error.isAppError) {
      return res.status(error.status).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/anular-pedido', async (req, res) => {
  const pool = app.locals.db;
  const payload = req.body || {};

  try {
    const vCodigo_pedido = String(payload.vCodigo_pedido || '').trim();
    if (!/^\d+$/.test(vCodigo_pedido)) {
      throw createAppError('INVALID_CODIGO_PEDIDO', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [vPedidoRows] = await runQuery(
        conn,
        'SELECT codigo_pedido, codigo_cliente, fecha, estado, created_at FROM pedidos WHERE codigo_pedido = ? FOR UPDATE',
        [vCodigo_pedido]
      );

      if (!vPedidoRows || !vPedidoRows.length) {
        throw createAppError('PEDIDO_NOT_FOUND', 404);
      }

      const vPedido = vPedidoRows[0];
      if (String(vPedido.estado || '').toLowerCase() === 'anulado') {
        throw createAppError('PEDIDO_ALREADY_CANCELED', 409);
      }

      const [vSaldoRows] = await runQuery(
        conn,
        'SELECT COUNT(*) AS vLineasSaldo FROM pedido_detalle WHERE codigo_pedido = ? AND saldo > 0 FOR UPDATE',
        [vCodigo_pedido]
      );

      const vLineasSaldo = Number(vSaldoRows[0]?.vLineasSaldo || 0);
      if (vLineasSaldo <= 0) {
        throw createAppError('PEDIDO_WITHOUT_PENDING_BALANCE', 409);
      }

      const [vUpdateResult] = await runQuery(
        conn,
        "UPDATE pedidos SET estado = 'anulado' WHERE codigo_pedido = ? AND estado <> 'anulado'",
        [vCodigo_pedido]
      );

      if (!vUpdateResult || Number(vUpdateResult.affectedRows || 0) !== 1) {
        throw createAppError('PEDIDO_UPDATE_FAILED', 409);
      }

      await conn.commit();
      logLine(`Pedido anulado: codigo_pedido=${vCodigo_pedido} lineas_saldo=${vLineasSaldo}`);

      return res.json({
        ok: true,
        data: {
          vCodigo_pedido,
          vCodigo_cliente: vPedido.codigo_cliente,
          vFecha_pedido: vPedido.fecha,
          vCreated_at: vPedido.created_at,
          vLineasSaldo
        }
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'ANULAR_PEDIDO_ERROR');
    if (error.isAppError) {
      return res.status(error.status).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

async function start() {
  ensureLogFile();
  const db = await initDb();
  app.locals.db = db;

  app.listen(PORT, '127.0.0.1', () => {
    logLine(`SERVER STARTED: http://localhost:${PORT}`);
  });
}

process.on('exit', () => {
  if (logStream) {
    logStream.end();
  }
});

start().catch((error) => {
  logError(error, 'FATAL_STARTUP_ERROR');
  process.exit(1);
});
