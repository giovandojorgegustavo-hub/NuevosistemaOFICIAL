const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-007';
const PORT = Number(process.env.PORT || getUseCasePort('CU1-007'));

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const base = `${LOG_PREFIX}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  global.logFileName = filename;
  global.logFilePath = path.join(LOG_DIR, filename);
  global.logStream = fs.createWriteStream(global.logFilePath, { flags: 'a' });
  logLine(`LOG FILE: ${filename}`);
}

function logLine(message, level = 'INFO') {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (global.logStream) {
    global.logStream.write(`${line}\n`);
  }
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  const message = context ? `${context} | ${detail}` : detail;
  logLine(message, 'ERROR');
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
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const data = yaml.parse(raw);
  if (!data || !Array.isArray(data.connections) || !data.connections.length) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }
  const connection = data.connections[0];
  if (!connection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }
  return {
    name: connection.name || '',
    dsn: connection.dsn,
    google: data.google_maps || null
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return mysql.createPool({
    ...dbConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

// OTP_GATE_ENABLED_START
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
  if (!codigoUsuario || !otp) {
    return false;
  }
  if (codigoUsuario.length > 36 || otp.length > 6) {
    return false;
  }
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
  if (app.locals && app.locals.db && app.locals.db.pool) return app.locals.db.pool;
  if (app.locals && app.locals.pool && typeof app.locals.pool.getConnection === 'function') return app.locals.pool;
  if (typeof dbState !== 'undefined' && dbState && dbState.pool) return dbState.pool;
  if (typeof pool !== 'undefined' && pool && typeof pool.getConnection === 'function') return pool;
  return null;
}

async function validarOtp(poolRef, codigoUsuario, otp) {
  const conn = await poolRef.getConnection();
  try {
    if (typeof runQuery === 'function') {
      await runQuery(conn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
      const [rows] = await runQuery(conn, 'SELECT @p_resultado AS resultado');
      return extractFirstInteger(rows);
    }

    if (typeof execQuery === 'function') {
      await execQuery('CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp], conn);
      const rows = await execQuery('SELECT @p_resultado AS resultado', [], conn);
      return extractFirstInteger(rows);
    }

    await conn.query('CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
    const [rows] = await conn.query('SELECT @p_resultado AS resultado');
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
// OTP_GATE_ENABLED_END

const app = express();
app.use(express.json({ limit: '1mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/maps-config', (req, res) => {
  try {
    const config = parseErpConfig();
    const google = config.google
      ? {
          apiKey: config.google.api_key || '',
          defaultCenter: config.google.default_center || null,
          defaultZoom: config.google.default_zoom || 12
        }
      : null;
    return res.json({ ok: true, data: google });
  } catch (error) {
    logError(error, 'MAPS CONFIG ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_clientes()');
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CLIENTES ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/paquetes', async (req, res) => {
  const estado = req.query.estado || 'llegado';
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', [estado]);
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/next-numero-documento', async (req, res) => {
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'"
      );
      const nextValue = rows && rows[0] ? rows[0].next : 1;
      return res.json({ ok: true, next: nextValue });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT NUMERO ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/detalle-factura', async (req, res) => {
  const codigoPaquete = req.query.codigo_paquete;
  if (!codigoPaquete) {
    return res.status(400).json({ ok: false, message: 'MISSING_PAQUETE' });
  }
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigoPaquete]);
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'DETALLE FACTURA ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/factura-cabecera', async (req, res) => {
  const codigoPaquete = req.query.codigo_paquete;
  if (!codigoPaquete) {
    return res.status(400).json({ ok: false, message: 'MISSING_PAQUETE' });
  }
  try {
    const pool = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        `SELECT
           mc.fecha_emision,
           pe.concatenarpuntoentrega AS lugar_entrega
         FROM mov_contable mc
         LEFT JOIN puntos_entrega pe
           ON pe.codigo_puntoentrega = mc.codigo_puntoentrega
          AND pe.codigo_cliente_puntoentrega = mc.codigo_cliente_puntoentrega
         WHERE mc.tipo_documento = 'FAC'
           AND mc.numero_documento = ?
         LIMIT 1`,
        [codigoPaquete]
      );
      return res.json({ ok: true, data: rows[0] || null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CABECERA FACTURA ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/emitir-nota-credito', async (req, res) => {
  const payload = req.body || {};
  const detalle = Array.isArray(payload.detalle) ? payload.detalle : [];
  const tipoNotaRaw = payload.vTipo_nota || (detalle.length ? 'PRODUCTO' : 'DINERO');
  const tipoNota = String(tipoNotaRaw).toUpperCase();
  const totalNota = Number(payload.vTotalNota || 0);
  if (!payload.vFecha_emision || !payload.vTipo_documento || !payload.vNumero_documento) {
    return res.status(400).json({ ok: false, message: 'MISSING_HEADER' });
  }
  if (!payload.vCodigo_cliente || !payload.vCodigo_base) {
    return res.status(400).json({ ok: false, message: 'MISSING_CLIENT' });
  }
  if (tipoNota === 'PRODUCTO' && !payload.vCodigo_paquete) {
    return res.status(400).json({ ok: false, message: 'MISSING_PAQUETE' });
  }
  if (tipoNota === 'PRODUCTO' && !detalle.length) {
    return res.status(400).json({ ok: false, message: 'MISSING_DETAIL' });
  }
  if (!Number.isFinite(totalNota) || totalNota <= 0) {
    return res.status(400).json({ ok: false, message: 'INVALID_TOTAL' });
  }

  const pool = app.locals.db;
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    let codigoPedidoOrigen = null;
    if (payload.vCodigo_paquete) {
      const [facturaRows] = await runQuery(
        conn,
        "SELECT codigo_pedido, codigo_cliente, estado FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = ?",
        [payload.vCodigo_paquete]
      );
      const facturaOrigen = facturaRows && facturaRows[0] ? facturaRows[0] : null;
      if (!facturaOrigen) {
        return res.status(400).json({ ok: false, message: 'INVOICE_NOT_FOUND' });
      }
      if (String(facturaOrigen.estado || '').toLowerCase() === 'anulado') {
        return res.status(409).json({ ok: false, message: 'INVOICE_CANCELED' });
      }
      if (String(facturaOrigen.codigo_cliente) !== String(payload.vCodigo_cliente)) {
        return res.status(409).json({ ok: false, message: 'CLIENT_MISMATCH' });
      }
      codigoPedidoOrigen = facturaOrigen.codigo_pedido || null;
    }

    await conn.beginTransaction();
    transactionStarted = true;

    await runQuery(
      conn,
      'INSERT INTO mov_contable (codigo_pedido, fecha_emision, tipo_documento, numero_documento, codigo_cliente, codigo_base, monto, saldo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        codigoPedidoOrigen,
        payload.vFecha_emision,
        payload.vTipo_documento,
        payload.vNumero_documento,
        payload.vCodigo_cliente,
        payload.vCodigo_base,
        totalNota,
        totalNota
      ]
    );

    if (detalle.length) {
      for (const item of detalle) {
        await runQuery(
          conn,
          'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            payload.vTipo_documento,
            payload.vNumero_documento,
            item.vOrdinalDetMovCont,
            item.vCodigo_producto,
            item.vCantidad,
            item.vSaldo,
            item.vPrecio_total
          ]
        );

        await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
          payload.vCodigo_base,
          item.vCodigo_producto,
          item.vCantidad,
          payload.vTipo_documento,
          payload.vNumero_documento
        ]);

        await runQuery(conn, 'CALL aplicar_devolucion_partidas(?, ?, ?, ?, ?, ?)', [
          'FAC',
          payload.vCodigo_paquete,
          payload.vTipo_documento,
          payload.vNumero_documento,
          item.vCodigo_producto,
          item.vCantidad
        ]);
      }
    }

    if (tipoNota === 'PRODUCTO' && detalle.length && codigoPedidoOrigen) {
      await runQuery(conn, 'CALL revertir_salidaspedidos(?, ?)', [payload.vTipo_documento, payload.vNumero_documento]);
    }

    // Aplicar NTC a la factura especifica (si aun tiene saldo).
    if (payload.vCodigo_paquete && totalNota > 0) {
      await runQuery(conn, 'CALL aplicar_nota_credito_a_factura(?, ?, ?, ?, ?)', [
        payload.vTipo_documento,
        payload.vNumero_documento,
        'FAC',
        payload.vCodigo_paquete,
        totalNota
      ]);
    }

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
      payload.vCodigo_cliente,
      payload.vTipo_documento,
      totalNota
    ]);

    await conn.commit();
    logLine(`Nota de credito emitida: ${payload.vTipo_documento}-${payload.vNumero_documento}`);
    return res.json({ ok: true });
  } catch (error) {
    if (transactionStarted) {
      await conn.rollback();
    }
    logError(error, 'EMITIR NOTA CREDITO ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.db = pool;
  app.listen(PORT, '127.0.0.1', () => {
    logLine(`Servidor CU007 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
