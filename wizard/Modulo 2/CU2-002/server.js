const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU2-002';
const PORT = Number(process.env.PORT || 3010);

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

function normalizeUserCode(value) {
  return String(value ?? '').trim();
}

function hasValidUserCode(value) {
  return /^[A-Za-z0-9-]{1,36}$/.test(String(value || '').trim());
}

function normalizeBaseCode(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return /^\d+$/.test(raw) ? raw : '';
}

function extractCodigoUsuario(source) {
  const raw = source?.Codigo_usuario ?? source?.codigo_usuario ?? source?.vUsuario ?? source?.vCodigo_usuario;
  return normalizeUserCode(raw);
}

function mapPrivRow(row) {
  const values = Object.values(row || {});
  const base = row?.codigo_base ?? row?.base ?? values[0] ?? '';
  const priv = row?.privilegio ?? row?.priv ?? values[1] ?? '';
  const baseAux = row?.base_aux ?? row?.auxiliar ?? values[2] ?? '';

  return {
    vBase: normalizeBaseCode(base),
    vPriv: String(priv ?? '').trim().toUpperCase(),
    vBaseAux: baseAux === null || baseAux === undefined ? '' : String(baseAux).trim()
  };
}

async function loadPrivData(conn, codigoUsuario) {
  const [result] = await runQuery(conn, 'CALL get_priv_usuario(?)', [codigoUsuario]);
  const rows = unwrapRows(result);
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  return mapPrivRow(rows[0]);
}

function hasBaseAccess(privData, codigoBase) {
  if (!privData) return false;
  if (privData.vPriv === 'ALL') return true;
  return String(codigoBase || '') === String(privData.vBase || '');
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
app.use(express.json({ limit: '1mb' }));
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
    apiKey: dbState?.maps?.api_key || '',
    defaultCenter: dbState?.maps?.default_center || null,
    defaultZoom: dbState?.maps?.default_zoom || 12
  });
});

app.get('/api/paquetes-pendientes', async (req, res) => {
  const codigoUsuario = extractCodigoUsuario(req.query || {});
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  try {
    const conn = await dbState.pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuario);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }

      const [result] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', ['pendiente empacar']);
      const sourceRows = unwrapRows(result);
      const rows = (Array.isArray(sourceRows) ? sourceRows : []).filter((row) =>
        privData.vPriv === 'ALL' ? true : String(row.codigo_base || '') === String(privData.vBase)
      );

      res.json({
        ok: true,
        rows,
        vPriv: privData.vPriv,
        vBase: privData.vBase
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar paquetes pendientes');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/packings', async (req, res) => {
  const normalizeNumericId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return '';
    return String(Math.trunc(num));
  };

  const codigoBase = normalizeNumericId(req.query.codigo_base);
  const codigoCliente = normalizeNumericId(req.query.codigo_cliente);
  const codigoUsuario = extractCodigoUsuario(req.query || {});
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  const hasBase = Boolean(codigoBase);
  const hasCliente = Boolean(codigoCliente);
  if (!hasBase && !hasCliente) {
    return res.json({ ok: true, rows: [] });
  }

  try {
    const conn = await dbState.pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuario);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }

      if (privData.vPriv !== 'ALL' && (!hasBase || !hasBaseAccess(privData, codigoBase))) {
        return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
      }

      let sourceRows = [];

      if (hasBase) {
        const [result] = await runQuery(conn, 'CALL get_packingporbase(?)', [codigoBase]);
        sourceRows = unwrapRows(result);
      }

      // Fallback: si no hay base valida o no retorna resultados, usar cliente.
      if (!sourceRows.length && hasCliente) {
        const [rows] = await runQuery(
          conn,
          `SELECT DISTINCT p.codigo_packing, p.nombre, p.tipo
           FROM mov_contable mc
           INNER JOIN basespacking bp ON bp.codigo_base = mc.codigo_base
           INNER JOIN packing p ON p.codigo_packing = bp.codigo_packing
           WHERE mc.codigo_cliente = ?
           ORDER BY p.nombre, p.codigo_packing`,
          [codigoCliente]
        );
        sourceRows = rows || [];
      }

      const rows = sourceRows.map((row) => ({
        id: row.codigo_packing,
        name: row.nombre,
        tipo: row.tipo,
        observacion: row.observacion ?? row.descripcion ?? ''
      }));
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar packings');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/detalle/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  const codigoUsuario = extractCodigoUsuario(req.query || {});
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  try {
    const conn = await dbState.pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuario);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }

      if (privData.vPriv !== 'ALL') {
        const [pendientesResult] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', ['pendiente empacar']);
        const pendientes = unwrapRows(pendientesResult);
        const paquete = (Array.isArray(pendientes) ? pendientes : []).find(
          (row) => String(row.codigo_paquete || '').trim() === codigo
        );

        if (!paquete || !hasBaseAccess(privData, normalizeBaseCode(paquete.codigo_base))) {
          return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
        }
      }

      const [result] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
      const rows = unwrapRows(result);
      res.json({ ok: true, rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'Error al cargar detalle');
    res.status(500).json({ ok: false, message: 'ERROR' });
  }
});

app.get('/api/logs', async (req, res) => {
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

app.post('/api/empacar', async (req, res) => {
  const codigo = String(req.body.codigo_paquete || '').trim();
  const codigoPacking = String(req.body.codigo_packing || '').trim();
  const codigoUsuario = extractCodigoUsuario(req.body || {});
  const codigoRegex = /^\d+$/;
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }
  if (!codigo || !codigoRegex.test(codigo)) {
    return res.status(400).json({ ok: false, message: 'INVALID_INPUT' });
  }
  if (!codigoPacking || !codigoRegex.test(codigoPacking)) {
    return res.status(400).json({ ok: false, message: 'INVALID_PACKING' });
  }

  const conn = await dbState.pool.getConnection();
  let transactionStarted = false;
  try {
    const privData = await loadPrivData(conn, codigoUsuario);
    if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
      throw new Error('UNAUTHORIZED');
    }

    await conn.beginTransaction();
    transactionStarted = true;
    logSql('BEGIN');

    const [pendientesResult] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', ['pendiente empacar']);
    const pendientes = unwrapRows(pendientesResult);
    const paquete = pendientes.find((row) => String(row.codigo_paquete || '').trim() === codigo);
    if (!paquete) {
      throw new Error('PAQUETE_NOT_FOUND');
    }

    const codigoBase = normalizeBaseCode(paquete.codigo_base);
    if (!hasBaseAccess(privData, codigoBase)) {
      throw new Error('BASE_FORBIDDEN');
    }

    const [packingsResult] = await runQuery(conn, 'CALL get_packingporbase(?)', [codigoBase]);
    const packings = unwrapRows(packingsResult);
    const packingOk = packings.some((row) => String(row.codigo_packing) === codigoPacking);
    if (!packingOk) {
      throw new Error('PACKING_NOT_FOUND');
    }

    const [nextRows] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [codigo]
    );
    const nextOrdinal = nextRows[0]?.next || 1;

    await runQuery(
      conn,
      'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
      [codigo, 'FAC', nextOrdinal, 'empacado']
    );

    await runQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigo, 'empacado']);

    await runQuery(
      conn,
      "UPDATE mov_contable SET codigo_packing = ? WHERE tipo_documento = 'FAC' AND numero_documento = ?",
      [codigoPacking, codigo]
    );

    const [detalleResult] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
    const detalles = unwrapRows(detalleResult);

    for (const item of detalles) {
      const codigoProducto = item.codigo_producto;
      const cantidad = item.cantidad;
      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [codigoBase, codigoProducto, cantidad, 'FAC', codigo]);
      await runQuery(conn, 'CALL aplicar_salida_partidas(?, ?, ?, ?)', ['FAC', codigo, codigoProducto, cantidad]);
    }

    await conn.commit();
    logSql('COMMIT');

    res.json({ ok: true, ordinal: nextOrdinal, rows: detalles.length });
  } catch (error) {
    if (transactionStarted) {
      await conn.rollback();
      logSql('ROLLBACK');
    }
    logError(error, 'Error al registrar empaque');
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN') {
      return res.status(403).json({ ok: false, message: code });
    }
    if (code === 'PAQUETE_NOT_FOUND' || code === 'PACKING_NOT_FOUND') {
      return res.status(400).json({ ok: false, message: code });
    }
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
