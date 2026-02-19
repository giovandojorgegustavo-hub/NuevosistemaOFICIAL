const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-001';
const PORT = 3001;

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
    googleMaps: data.google_maps || null
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return {
    pool: mysql.createPool({
      ...dbConfig,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }),
    googleMaps: config.googleMaps
  };
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function unwrapRows(result) {
  const rows = result?.[0] ?? [];
  if (Array.isArray(rows) && rows.length && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows;
}

function pickResultset(result, predicate) {
  const rows = result?.[0] ?? [];
  if (!Array.isArray(rows)) return [];
  if (!rows.length) return rows;
  if (!Array.isArray(rows[0])) return rows;
  for (const set of rows) {
    if (Array.isArray(set) && set.length && predicate(set[0])) {
      return set;
    }
  }
  return rows[0] || [];
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
app.use(express.json({ limit: '2mb' }));
app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);
app.use(express.static(ROOT_DIR, { index: false }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/config', (req, res) => {
  const { googleMaps } = app.locals.db;
  res.json({ google_maps: googleMaps });
});

app.get('/api/clientes', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_clientes()');
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CLIENTES ERROR');
    res.status(500).json({ ok: false, message: 'CLIENTES_ERROR' });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_productos()');
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PRODUCTOS ERROR');
    res.status(500).json({ ok: false, message: 'PRODUCTOS_ERROR' });
  }
});

app.get('/api/puntos-entrega', async (req, res) => {
  const codigoCliente = req.query.cliente;
  if (!codigoCliente) {
    return res.json({ ok: true, rows: [] });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_puntos_entrega(?)', [codigoCliente]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PUNTOS ENTREGA ERROR');
    res.status(500).json({ ok: false, message: 'PUNTOS_ENTREGA_ERROR' });
  }
});

app.get('/api/ubigeo/departamentos', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_ubigeo_departamentos()');
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'UBIGEO DEP ERROR');
    res.status(500).json({ ok: false, message: 'UBIGEO_DEP_ERROR' });
  }
});

app.get('/api/ubigeo/provincias', async (req, res) => {
  const codDep = req.query.cod_dep;
  if (!codDep) {
    return res.status(400).json({ ok: false, message: 'COD_DEP_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_ubigeo_provincias(?)', [codDep]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'UBIGEO PROV ERROR');
    res.status(500).json({ ok: false, message: 'UBIGEO_PROV_ERROR' });
  }
});

app.get('/api/ubigeo/distritos', async (req, res) => {
  const codDep = req.query.cod_dep;
  const codProv = req.query.cod_prov;
  if (!codDep || !codProv) {
    return res.status(400).json({ ok: false, message: 'COD_DEP_PROV_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_ubigeo_distritos(?, ?)', [codDep, codProv]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'UBIGEO DIST ERROR');
    res.status(500).json({ ok: false, message: 'UBIGEO_DIST_ERROR' });
  }
});

app.get('/api/numrecibe', async (req, res) => {
  const codigoCliente = req.query.cliente;
  if (!codigoCliente) {
    return res.json({ ok: true, rows: [] });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_numrecibe(?)', [codigoCliente]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NUMRECIBE ERROR');
    res.status(500).json({ ok: false, message: 'NUMRECIBE_ERROR' });
  }
});

app.get('/api/cuentas', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_cuentasbancarias()');
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'CUENTAS ERROR');
    res.status(500).json({ ok: false, message: 'CUENTAS_ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_bases()');
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'BASES ERROR');
    res.status(500).json({ ok: false, message: 'BASES_ERROR' });
  }
});

app.post('/api/bases-candidatas', async (req, res) => {
  const rawItems = req.body?.vProdFactura ?? req.body?.items ?? [];
  const fechaFactura = req.body?.vFechaP ?? req.body?.fechaFactura ?? null;
  const payload = typeof rawItems === 'string' ? rawItems : JSON.stringify(rawItems || []);
  if (!fechaFactura) {
    return res.status(400).json({ ok: false, message: 'FECHA_FACTURA_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_bases_candidatas(?, ?)', [payload, fechaFactura]);
      const rows = pickResultset(result, (row) => 'latitud' in row || 'longitud' in row || 'LATITUD' in row);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'BASES CANDIDATAS ERROR');
    res.status(500).json({ ok: false, message: 'BASES_CANDIDATAS_ERROR' });
  }
});

app.post('/api/distance-matrix', async (req, res) => {
  const apiKey = app.locals.db?.googleMaps?.api_key || '';
  const origin = req.body?.origin;
  const destinations = Array.isArray(req.body?.destinations) ? req.body.destinations : [];
  if (!apiKey) {
    return res.status(500).json({ ok: false, message: 'NO_API_KEY' });
  }
  if (typeof fetch !== 'function') {
    return res.status(500).json({ ok: false, message: 'FETCH_NOT_AVAILABLE' });
  }
  if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
    return res.status(400).json({ ok: false, message: 'INVALID_ORIGIN' });
  }
  if (!destinations.length) {
    return res.json({ ok: true, rows: [] });
  }

  try {
    const destinationsParam = destinations.map((item) => `${item.lat},${item.lng}`).join('|');
    const originsParam = `${origin.lat},${origin.lng}`;
    const params = new URLSearchParams({
      origins: originsParam,
      destinations: destinationsParam,
      mode: 'driving',
      key: apiKey
    });
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    logLine(`DISTANCE_MATRIX: origins=${originsParam} destinations=${destinationsParam}`);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data?.status !== 'OK') {
      logError(JSON.stringify(data), 'Distance Matrix API error');
      return res.status(502).json({ ok: false, message: 'DISTANCE_MATRIX_ERROR' });
    }
    const rows = data?.rows?.[0]?.elements || [];
    const mapped = rows.map((element, index) => ({
      codigo_base: destinations[index]?.codigo_base,
      status: element.status,
      duration: element.duration || null,
      distance: element.distance || null
    }));
    res.json({ ok: true, rows: mapped });
  } catch (error) {
    logError(error, 'Error al consultar Distance Matrix');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/next/cliente', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(conn, 'SELECT COALESCE(MAX(codigo_cliente), 0) + 1 AS next FROM clientes');
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT CLIENTE ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_CLIENTE_ERROR' });
  }
});

app.get('/api/next/pedido', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(conn, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT PEDIDO ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_PEDIDO_ERROR' });
  }
});

app.get('/api/next/factura', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
      );
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT FACTURA ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_FACTURA_ERROR' });
  }
});

app.get('/api/next/punto-entrega', async (req, res) => {
  const codigoCliente = req.query.cliente;
  if (!codigoCliente) {
    return res.status(400).json({ ok: false, message: 'CLIENTE_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [codigoCliente]
      );
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT PUNTO ENTREGA ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_PUNTO_ENTREGA_ERROR' });
  }
});

app.get('/api/next/numrecibe', async (req, res) => {
  const codigoCliente = req.query.cliente;
  if (!codigoCliente) {
    return res.status(400).json({ ok: false, message: 'CLIENTE_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [codigoCliente]
      );
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT NUMRECIBE ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_NUMRECIBE_ERROR' });
  }
});

app.get('/api/next/recibo', async (req, res) => {
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
      );
      res.json({ ok: true, next: row?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'NEXT RECIBO ERROR');
    res.status(500).json({ ok: false, message: 'NEXT_RECIBO_ERROR' });
  }
});

app.get('/api/saldo-favor', async (req, res) => {
  const cliente = Number(req.query.cliente || 0);
  if (!cliente) {
    return res.status(400).json({ ok: false, message: 'CLIENTE_REQUIRED' });
  }
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_saldo_favor_cliente(?)', [cliente]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'SALDO_FAVOR ERROR');
    res.status(500).json({ ok: false, message: 'SALDO_FAVOR_ERROR' });
  }
});


app.post('/api/emitir', async (req, res) => {
  const payload = req.body || {};
  const cliente = payload.cliente || {};
  const pedido = payload.pedido || {};
  const factura = payload.factura || {};
  const entrega = payload.entrega || {};
  const recibe = payload.recibe || {};
  const pagos = Array.isArray(payload.pagos) ? payload.pagos : [];
  const saldoFavorUsado = Number(factura.saldo_favor_usado || 0) || 0;
  const base = payload.base || {};
  const codigoBase = Number(base.codigo);
  const fechaReferenciaHorario = String(factura.fecha || pedido.fecha || '').trim();

  if (!Number.isFinite(codigoBase) || !fechaReferenciaHorario) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const { pool } = app.locals.db;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();
    await runQuery(conn, 'CALL reservar_cupo_base_horario(?, ?)', [codigoBase, fechaReferenciaHorario]);

    if (cliente.tipo === 'nuevo') {
      await runQuery(
        conn,
        'INSERT INTO clientes (codigo_cliente, nombre, numero) VALUES (?, ?, ?)',
        [cliente.codigo, cliente.nombre, cliente.numero]
      );
    }

    await runQuery(conn, 'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)', [
      pedido.codigo,
      cliente.codigo,
      pedido.fecha
    ]);

    for (const item of pedido.items || []) {
      await runQuery(
        conn,
        'INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo) VALUES (?, ?, ?, ?, ?, ?)',
        [
          pedido.codigo,
          item.ordinal,
          item.codigo_producto,
          item.cantidad,
          item.precio_total,
          item.cantidad
        ]
      );
    }

    if (entrega.tipo === 'existe') {
      if (!entrega.codigo_puntoentrega && entrega.concatenado) {
        const [[foundEntrega]] = await runQuery(
          conn,
          'SELECT codigo_puntoentrega FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ? AND concatenarpuntoentrega = ?',
          [cliente.codigo, entrega.concatenado]
        );
        entrega.codigo_puntoentrega = foundEntrega?.codigo_puntoentrega || null;
      }
      if (!entrega.codigo_puntoentrega) {
        throw new Error('PUNTO_ENTREGA_NO_ENCONTRADO');
      }
    }

    if (entrega.tipo === 'nuevo') {
      const [[nextEntrega]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [cliente.codigo]
      );
      entrega.codigo_puntoentrega = nextEntrega?.next || 1;
    }

    if (entrega.tipo === 'nuevo') {
      await runQuery(
        conn,
        'INSERT INTO puntos_entrega (ubigeo, codigo_puntoentrega, codigo_cliente_puntoentrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          entrega.ubigeo,
          entrega.codigo_puntoentrega,
          cliente.codigo,
          entrega.direccion,
          entrega.referencia,
          entrega.nombre,
          entrega.dni,
          entrega.agencia,
          entrega.observaciones,
          entrega.region,
          entrega.concatenado,
          entrega.latitud || null,
          entrega.longitud || null
        ]
      );
    }

    if (entrega.tipo === 'existe') {
      entrega.codigo_puntoentrega = entrega.codigo_puntoentrega;
    }

    if (entrega.region === 'LIMA' && recibe.tipo === 'nuevo') {
      await runQuery(
        conn,
        'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?)',
        [recibe.ordinal, recibe.numero, recibe.nombre, cliente.codigo, recibe.concatenado]
      );
    }

    const montoDetalleProductos = Number(factura.monto || 0);
    const costoEnvio = Number(factura.costo_envio || 0);
    const montoFactura = montoDetalleProductos + costoEnvio;
    const saldoFactura = montoFactura;

    const usaRecibe = entrega.region === 'LIMA';
    const codigoClienteNumrecibe = usaRecibe ? cliente.codigo : null;
    const ordinalNumrecibe = usaRecibe ? recibe.ordinal : null;

    await runQuery(
      conn,
      'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio, montodetalleproductos, monto, saldo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        pedido.codigo,
        factura.fecha,
        factura.fecha,
        factura.fecha,
        cliente.codigo,
        'FAC',
        factura.numero,
        codigoBase,
        codigoClienteNumrecibe,
        ordinalNumrecibe,
        cliente.codigo,
        entrega.codigo_puntoentrega,
        costoEnvio,
        montoDetalleProductos,
        montoFactura,
        saldoFactura
      ]
    );

    for (const item of factura.items || []) {
      await runQuery(
        conn,
        'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          'FAC',
          factura.numero,
          item.ordinal,
          item.codigo_producto,
          item.cantidad,
          item.cantidad,
          item.precio_total
        ]
      );
    }

    await runQuery(
      conn,
      'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
      [factura.numero, 'FAC', 'pendiente empacar']
    );

    for (const item of factura.items || []) {
      await runQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
        [factura.numero, 'FAC', item.ordinal, 'pendiente empacar']
      );
    }

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [cliente.codigo, 'FAC', saldoFactura]);

    if (saldoFavorUsado > 0) {
      await runQuery(conn, 'CALL aplicar_saldo_favor_a_factura(?, ?, ?)', [
        cliente.codigo,
        factura.numero,
        saldoFavorUsado
      ]);
    }

    if (pagos.length) {
      for (const pago of pagos) {
        await runQuery(
          conn,
          'INSERT INTO mov_contable (codigo_cliente, tipo_documento, numero_documento, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cuentabancaria, monto, saldo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            cliente.codigo,
            'RCP',
            pago.numdocumento,
            factura.fecha,
            factura.fecha,
            factura.fecha,
            pago.cuentaCodigo,
            pago.monto,
            pago.monto
          ]
        );
        await runQuery(conn, 'CALL aplicar_recibo_a_facturas(?, ?, ?)', [cliente.codigo, pago.numdocumento, pago.monto]);
        await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [cliente.codigo, 'RCP', pago.monto]);
      }
    }

    await runQuery(conn, 'CALL salidaspedidos(?, ?)', ['FAC', factura.numero]);

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'EMITIR ERROR');
    res.status(500).json({ ok: false, message: 'EMITIR_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const db = await initDb();
  app.locals.db = db;
  app.listen(PORT, () => {
    logLine(`Servidor CU-001 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
