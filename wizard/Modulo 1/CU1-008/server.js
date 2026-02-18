const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU008';
const PORT = 3008;

let logStream;

function pad(value) {
  return String(value).padStart(2, '0');
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
  const withParams = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${withParams}`, 'SQL');
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
    dsn: firstConnection.dsn,
    google: data.google_maps || null
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

const PAQUETE_ESTADOS_VALIDOS = new Set(['pendiente empacar', 'empacado', 'llegado']);
const PAQUETE_ESTADOS_DEFAULT = ['pendiente empacar', 'empacado', 'llegado'];

function parseEstadosPaquete(query) {
  const rawEstados = [];

  if (query && query.estados !== undefined && query.estados !== null) {
    rawEstados.push(...String(query.estados).split(','));
  }
  if (query && query.estado !== undefined && query.estado !== null) {
    rawEstados.push(String(query.estado));
  }

  const normalizados = rawEstados.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
  const seleccionados = normalizados.length ? normalizados : PAQUETE_ESTADOS_DEFAULT;
  const deduplicados = [];

  for (const estado of seleccionados) {
    if (!PAQUETE_ESTADOS_VALIDOS.has(estado)) {
      throw createAppError('INVALID_ESTADO', 400);
    }
    if (!deduplicados.includes(estado)) {
      deduplicados.push(estado);
    }
  }

  return deduplicados;
}

async function revertirPagosFacturaCliente(conn, tipoDocumento, numeroDocumento) {
  try {
    await runQuery(conn, 'CALL revertir_pagos_factura_cliente(?, ?)', [tipoDocumento, numeroDocumento]);
    return;
  } catch (error) {
    if (!error || error.code !== 'ER_SP_DOES_NOT_EXIST') {
      throw error;
    }
  }

  logLine('SP revertir_pagos_factura_cliente no existe; usando fallback SQL.');

  const [aplicaciones] = await runQuery(
    conn,
    `SELECT tipodocumento, numdocumento, SUM(monto_pagado) AS monto_pagado
     FROM Facturas_Pagadas
     WHERE tipo_documento_cli = ?
       AND numero_documento_cli = ?
     GROUP BY tipodocumento, numdocumento`,
    [tipoDocumento, numeroDocumento]
  );

  for (const aplicacion of aplicaciones || []) {
    const montoPagado = Number(aplicacion.monto_pagado) || 0;
    if (montoPagado <= 0) {
      continue;
    }

    await runQuery(
      conn,
      'UPDATE mov_contable SET saldo = saldo + ? WHERE tipo_documento = ? AND numero_documento = ?',
      [montoPagado, aplicacion.tipodocumento, aplicacion.numdocumento]
    );
  }

  await runQuery(conn, 'DELETE FROM Facturas_Pagadas WHERE tipo_documento_cli = ? AND numero_documento_cli = ?', [
    tipoDocumento,
    numeroDocumento
  ]);
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
  if (app.locals && app.locals.db && app.locals.db.pool) return app.locals.db.pool;
  if (app.locals && app.locals.db && typeof app.locals.db.getConnection === 'function') return app.locals.db;
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
  logLine(`ENDPOINT: ${req.method} ${req.originalUrl}`);
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
    logError(error, 'MAPS_CONFIG_ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/clientes', async (req, res) => {
  const pool = app.locals.db;
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_clientes()');
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CLIENTES_ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/paquetes', async (req, res) => {
  const pool = app.locals.db;
  let estados;

  try {
    estados = parseEstadosPaquete(req.query || {});
  } catch (error) {
    if (error && error.isAppError) {
      return res.status(error.status).json({ ok: false, message: error.message });
    }
    return res.status(400).json({ ok: false, message: 'INVALID_ESTADO' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      const merged = [];
      const seen = new Set();

      for (const estado of estados) {
        const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', [estado]);
        const data = rows[0] || [];

        for (const row of data) {
          const key = `${row.codigo_paquete}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          merged.push(row);
        }
      }

      merged.sort((a, b) => {
        const aTime = new Date(a.fecha_actualizado || 0).getTime();
        const bTime = new Date(b.fecha_actualizado || 0).getTime();
        if (bTime !== aTime) {
          return bTime - aTime;
        }
        return Number(b.codigo_paquete || 0) - Number(a.codigo_paquete || 0);
      });

      return res.json({ ok: true, data: merged });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES_ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/detalle-factura', async (req, res) => {
  const pool = app.locals.db;
  const vCodigo_paquete = req.query.codigo_paquete;

  if (!vCodigo_paquete) {
    return res.status(400).json({ ok: false, message: 'MISSING_PAQUETE' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', vCodigo_paquete]);
      return res.json({ ok: true, data: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'DETALLE_FACTURA_ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.get('/api/factura-cabecera', async (req, res) => {
  const vCodigo_paquete = req.query.codigo_paquete;
  if (!vCodigo_paquete) {
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
           pe.concatenarpuntoentrega AS lugar_entrega,
           mc.codigo_packing,
           pk.nombre AS nombre_packing
         FROM mov_contable mc
         LEFT JOIN puntos_entrega pe
           ON pe.codigo_puntoentrega = mc.codigo_puntoentrega
          AND pe.codigo_cliente_puntoentrega = mc.codigo_cliente_puntoentrega
         LEFT JOIN packing pk
           ON pk.codigo_packing = mc.codigo_packing
         WHERE mc.tipo_documento = 'FAC'
           AND mc.numero_documento = ?
         LIMIT 1`,
        [vCodigo_paquete]
      );
      return res.json({ ok: true, data: rows[0] || null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CABECERA_FACTURA_ERROR');
    return res.status(500).json({ ok: false, message: 'SERVER_ERROR' });
  }
});

app.post('/api/anular-factura', async (req, res) => {
  const pool = app.locals.db;
  const payload = req.body || {};

  try {
    const vFecha_emision = String(payload.vFecha_emision || '').trim();
    const vCodigo_cliente = String(payload.vCodigo_cliente || '').trim();
    const vCodigo_paquete = String(payload.vCodigo_paquete || '').trim();

    if (!vFecha_emision || !vCodigo_cliente || !vCodigo_paquete) {
      throw createAppError('MISSING_REQUIRED', 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vFecha_emision)) {
      throw createAppError('INVALID_DATE', 400);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [facturaRows] = await runQuery(
        conn,
        "SELECT codigo_cliente, codigo_base, estado FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = ? FOR UPDATE",
        [vCodigo_paquete]
      );

      if (!facturaRows || !facturaRows.length) {
        throw createAppError('INVOICE_NOT_FOUND', 404);
      }

      const factura = facturaRows[0];
      if (String(factura.estado).toLowerCase() === 'anulado') {
        throw createAppError('INVOICE_ALREADY_CANCELED', 409);
      }

      if (String(factura.codigo_cliente) !== vCodigo_cliente) {
        throw createAppError('CLIENT_MISMATCH', 409);
      }

      const vCodigo_base = factura.codigo_base || payload.vCodigo_base;
      if (!vCodigo_base) {
        throw createAppError('BASE_REQUIRED', 409);
      }

      const [detalleRows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', vCodigo_paquete]);
      const vDetalleFactura = detalleRows[0] || [];
      const vTotalFactura = vDetalleFactura.reduce((sum, row) => sum + (Number(row.precio_total) || 0), 0);

      await runQuery(conn, 'CALL anular_documento_cliente(?, ?)', ['FAC', vCodigo_paquete]);

      await revertirPagosFacturaCliente(conn, 'FAC', vCodigo_paquete);

      for (const row of vDetalleFactura) {
        const vCantidad = Number(row.cantidad) || 0;
        if (vCantidad === 0) {
          continue;
        }

        await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
          vCodigo_base,
          row.codigo_producto,
          -vCantidad,
          'FAC',
          vCodigo_paquete
        ]);
      }

      await runQuery(conn, 'CALL revertir_salida_partidas_documento(?, ?)', ['FAC', vCodigo_paquete]);
      await runQuery(conn, 'CALL revertir_salidaspedidos(?, ?)', ['FAC', vCodigo_paquete]);

      await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [factura.codigo_cliente, 'FAC', -vTotalFactura]);

      await conn.commit();
      logLine(`Factura anulada: FAC-${vCodigo_paquete} total=${vTotalFactura.toFixed(2)} items=${vDetalleFactura.length}`);

      return res.json({
        ok: true,
        vTipo_documento: 'FAC',
        vCodigo_paquete,
        vTotalFactura,
        vItems: vDetalleFactura.length
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'ANULAR_FACTURA_ERROR');
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

  app.listen(PORT, () => {
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
