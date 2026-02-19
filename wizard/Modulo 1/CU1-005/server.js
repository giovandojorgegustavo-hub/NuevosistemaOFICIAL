const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU005';
const PORT = Number(process.env.PORT || 3005);

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
    maps: data.google_maps || {}
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
    maps: config.maps
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
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return result;
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

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
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
  logLine(`ENDPOINT: ${req.method} ${req.path} ip=${getClientIp(req)}`);
  next();
});

let dbState = null;

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/maps-config', (req, res) => {
  res.json({
    ok: true,
    apiKey: dbState?.maps?.api_key || '',
    defaultCenter: dbState?.maps?.default_center || null,
    defaultZoom: dbState?.maps?.default_zoom || 12
  });
});

app.get('/api/pedidos', async (req, res) => {
  const cliente = String(req.query.cliente || '').trim().toLowerCase();
  const fecha = String(req.query.fecha || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_pedidospendientes()');
      let rows = unwrapRows(result);
      if (cliente) {
        rows = rows.filter((row) => {
          const nombre = String(row.nombre_cliente || '').toLowerCase();
          const codigo = String(row.codigo_cliente || '').toLowerCase();
          const numero = String(row.numero_cliente || '').toLowerCase();
          return nombre.includes(cliente) || codigo.includes(cliente) || numero.includes(cliente);
        });
      }
      if (fecha) {
        rows = rows.filter((row) => String(row.fecha || '').slice(0, 10) === fecha);
      }
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar pedidos');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/pedido-detalle/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_pedido_detalle_por_pedido(?)', [codigo]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar detalle de pedido');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_bases()');
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar bases');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/puntos-entrega', async (req, res) => {
  const cliente = String(req.query.cliente || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_puntos_entrega(?)', [cliente]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar puntos de entrega');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/numrecibe', async (req, res) => {
  const cliente = String(req.query.cliente || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_numrecibe(?)', [cliente]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar numrecibe');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/ubigeo/departamentos', async (req, res) => {
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_ubigeo_departamentos()');
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar departamentos');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/ubigeo/provincias', async (req, res) => {
  const codDep = String(req.query.cod_dep || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_ubigeo_provincias(?)', [codDep]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar provincias');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/ubigeo/distritos', async (req, res) => {
  const codDep = String(req.query.cod_dep || '').trim();
  const codProv = String(req.query.cod_prov || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_ubigeo_distritos(?, ?)', [codDep, codProv]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar distritos');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/cuentas-bancarias', async (req, res) => {
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [result] = await runQuery(conn, 'CALL get_cuentasbancarias()');
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar cuentas bancarias');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/next-documento', async (req, res) => {
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
      );
      res.json({ ok: true, next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al obtener correlativo factura');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/next-documento-pago', async (req, res) => {
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
      );
      res.json({ ok: true, next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al obtener correlativo recibo');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/saldo-favor', async (req, res) => {
  const cliente = Number(req.query.cliente || 0);
  if (!cliente) {
    return res.status(400).json({ ok: false, message: 'CLIENTE_REQUIRED' });
  }
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_saldo_favor_cliente(?)', [cliente]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al obtener saldo favor');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/next-numrecibe', async (req, res) => {
  const cliente = String(req.query.cliente || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [cliente]
      );
      res.json({ ok: true, next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al obtener ordinal numrecibe');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/next-punto-entrega', async (req, res) => {
  const cliente = String(req.query.cliente || '').trim();
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [cliente]
      );
      res.json({ ok: true, next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al obtener codigo punto entrega');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.post('/api/bases-candidatas', async (req, res) => {
  const rawItems = req.body?.items ?? req.body?.vProdFactura ?? [];
  const fechaP = String(req.body?.fechaP ?? req.body?.vFechaP ?? '').trim();
  const payload = typeof rawItems === 'string' ? rawItems : JSON.stringify(rawItems || []);
  try {
    const conn = await dbState.pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_bases_candidatas(?, ?)', [payload, fechaP]);
      const rows = pickResultset(result, (row) => 'latitud' in row || 'longitud' in row || 'LATITUD' in row);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar bases candidatas');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.post('/api/distance-matrix', async (req, res) => {
  const apiKey = dbState?.maps?.api_key || '';
  const origin = req.body?.origin;
  const originAddress = String(req.body?.originAddress || '').trim();
  const destinations = Array.isArray(req.body?.destinations) ? req.body.destinations : [];
  if (!apiKey) {
    return res.status(500).json({ ok: false, message: 'NO_API_KEY' });
  }
  if (typeof fetch !== 'function') {
    return res.status(500).json({ ok: false, message: 'FETCH_NOT_AVAILABLE' });
  }
  if (!originAddress && (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number')) {
    return res.status(400).json({ ok: false, message: 'INVALID_ORIGIN' });
  }
  if (!destinations.length) {
    return res.json({ ok: true, rows: [] });
  }

  try {
    const destinationsParam = destinations.map((item) => `${item.lat},${item.lng}`).join('|');
    const originsParam = originAddress || `${origin.lat},${origin.lng}`;
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

app.get('/api/logs', (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, content: '' });
    }
    const content = fs.readFileSync(global.logFilePath, 'utf-8');
    const lines = content.split('\n');
    const tail = lines.slice(-200).join('\n');
    res.json({ ok: true, content: tail });
  } catch (error) {
    logError(error, 'Error al leer logs');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.post('/api/emitir-factura', async (req, res) => {
  const payload = req.body || {};
  const pedido = payload.pedido || {};
  const factura = payload.factura || {};
  const entrega = payload.entrega || {};
  const recibe = payload.recibe || {};
  const pagos = Array.isArray(payload.pagos) ? payload.pagos : [];
  const saldoFavorUsado = Number(factura.saldo_favor_usado || 0) || 0;
  const codigoBase = Number(factura.codigo_base);
  const fechaReferenciaHorario = String(factura.fechaP || '').trim();

  if (!Number.isFinite(codigoBase) || !fechaReferenciaHorario) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const conn = await dbState.pool.getConnection();
  try {
    await conn.beginTransaction();
    await runQuery(conn, 'CALL reservar_cupo_base_horario(?, ?)', [codigoBase, fechaReferenciaHorario]);

    if (entrega.modo === 'nuevo') {
      await runQuery(
        conn,
        `INSERT INTO puntos_entrega (
          ubigeo,
          codigo_puntoentrega,
          codigo_cliente_puntoentrega,
          direccion_linea,
          referencia,
          nombre,
          dni,
          agencia,
          observaciones,
          region_entrega,
          concatenarpuntoentrega,
          latitud,
          longitud
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entrega.ubigeo || null,
          entrega.codigo_puntoentrega || null,
          entrega.codigo_cliente_puntoentrega || null,
          entrega.direccion_linea || null,
          entrega.referencia || null,
          entrega.nombre || null,
          entrega.dni || null,
          entrega.agencia || null,
          entrega.observaciones || null,
          entrega.region_entrega || null,
          entrega.concatenarpuntoentrega || null,
          entrega.latitud || null,
          entrega.longitud || null
        ]
      );
    }

    if (recibe.modo === 'nuevo' && entrega.region_entrega === 'LIMA') {
      await runQuery(
        conn,
        `INSERT INTO numrecibe (
          ordinal_numrecibe,
          numero,
          nombre,
          codigo_cliente_numrecibe,
          concatenarnumrecibe
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          recibe.ordinal_numrecibe || null,
          recibe.numero || null,
          recibe.nombre || null,
          pedido.codigo_cliente || null,
          recibe.concatenarnumrecibe || null
        ]
      );
    }

    const montoDetalleProductos = Number(factura.monto || 0);
    const costoEnvio = Number(factura.costo_envio || 0);
    const montoFactura = montoDetalleProductos + costoEnvio;
    const saldoFactura = montoFactura;

    const usaRecibe = entrega.region_entrega === 'LIMA';
    const codigoClienteNumrecibe = usaRecibe ? pedido.codigo_cliente || null : null;
    const ordinalNumrecibe = usaRecibe ? recibe.ordinal_numrecibe || null : null;

    await runQuery(
      conn,
      `INSERT INTO mov_contable (
        codigo_pedido,
        fecha_emision,
        fecha_vencimiento,
        fecha_valor,
        codigo_cliente,
        tipo_documento,
        numero_documento,
        codigo_base,
        codigo_cliente_numrecibe,
        ordinal_numrecibe,
        codigo_cliente_puntoentrega,
        codigo_puntoentrega,
        costoenvio,
        montodetalleproductos,
        monto,
        saldo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pedido.codigo_pedido || null,
        factura.fechaP || null,
        factura.fechaP || null,
        factura.fechaP || null,
        pedido.codigo_cliente || null,
        factura.tipo_documento || 'FAC',
        factura.numero_documento || null,
        codigoBase,
        codigoClienteNumrecibe,
        ordinalNumrecibe,
        pedido.codigo_cliente || null,
        entrega.codigo_puntoentrega || null,
        costoEnvio,
        montoDetalleProductos,
        montoFactura,
        saldoFactura
      ]
    );

    const detalles = Array.isArray(factura.detalles) ? factura.detalles : [];
    let movOrdinal = 1;
    for (const item of detalles) {
      await runQuery(
        conn,
        `INSERT INTO mov_contable_detalle (
          tipo_documento,
          numero_documento,
          ordinal,
          codigo_producto,
          cantidad,
          saldo,
          precio_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          factura.tipo_documento || 'FAC',
          factura.numero_documento || null,
          movOrdinal,
          item.codigo_producto,
          item.cantidad,
          item.cantidad,
          item.precio_total
        ]
      );
      movOrdinal += 1;
    }

    await runQuery(
      conn,
      'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
      [factura.numero_documento || null, factura.tipo_documento || 'FAC', 'pendiente empacar']
    );

    const [paqueteRows] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(ordinal), 0) AS max_ordinal FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [factura.numero_documento || null]
    );
    let paqueteOrdinal = (paqueteRows[0]?.max_ordinal || 0) + 1;

    for (let index = 0; index < detalles.length; index += 1) {
      await runQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
        [factura.numero_documento || null, factura.tipo_documento || 'FAC', paqueteOrdinal, 'pendiente empacar']
      );
      paqueteOrdinal += 1;
    }

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
      pedido.codigo_cliente || null,
      factura.tipo_documento || 'FAC',
      saldoFactura
    ]);

    if (saldoFavorUsado > 0) {
      await runQuery(conn, 'CALL aplicar_saldo_favor_a_factura(?, ?, ?)', [
        pedido.codigo_cliente || null,
        factura.numero_documento || null,
        saldoFavorUsado
      ]);
    }

    if (pagos.length) {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
      );
      let nextDocumento = rows[0]?.next || 1;

      for (const pago of pagos) {
        await runQuery(
          conn,
          `INSERT INTO mov_contable (
            codigo_cliente,
            tipo_documento,
            numero_documento,
            fecha_emision,
            fecha_vencimiento,
            fecha_valor,
            codigo_cuentabancaria,
            monto,
            saldo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pedido.codigo_cliente || null,
            'RCP',
            nextDocumento,
            factura.fechaP || null,
            factura.fechaP || null,
            factura.fechaP || null,
            pago.codigo_cuentabancaria,
            pago.monto,
            pago.monto
          ]
        );

        await runQuery(conn, 'CALL aplicar_recibo_a_facturas(?, ?, ?)', [
          pedido.codigo_cliente || null,
          nextDocumento,
          pago.monto
        ]);

        await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
          pedido.codigo_cliente || null,
          'RCP',
          pago.monto
        ]);

        nextDocumento += 1;
      }
    }

    await runQuery(conn, 'CALL salidaspedidos(?, ?)', [
      factura.tipo_documento || 'FAC',
      factura.numero_documento || null
    ]);

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    logError(error, 'Error al emitir factura');
    res.status(500).json({ ok: false, message: 'ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  try {
    ensureLogFile();
    dbState = await initDb();
    app.listen(PORT, () => {
      logLine(`SERVER STARTED: http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    logError(error, 'No se pudo iniciar el servidor');
    process.exit(1);
  }
}

start();
