const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, '..', '..', 'Modulo 2', 'CU2-004', 'logs');
const LOG_PREFIX = 'CU2-004';
const PORT = 3020;

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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
    dsn: connection.dsn
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

function extractRows(result) {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function ensureGenericProveedor(conn) {
  const [rows] = await runQuery(conn, 'SELECT codigo_provedor FROM provedores WHERE codigo_provedor = 0');
  if (!rows || rows.length === 0) {
    await runQuery(conn, "INSERT INTO provedores (codigo_provedor, nombre) VALUES (0, 'PROVEEDOR GENERICO')");
  }
}

async function getNextNumero(conn, sql, params) {
  const [rows] = await runQuery(conn, sql, params);
  if (rows && rows[0] && rows[0].next !== undefined) {
    return Number(rows[0].next) || 1;
  }
  return 1;
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
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.get('/api/metadata', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const vTipoDocumentoStockInsumo = 'FBI';
    const vTipoDocumentoStockProduccion = 'FBF';
    const vTipoDocumentoGasto = 'GAS';
    const vCodigo_provedor = 0;

    await ensureGenericProveedor(conn);

    const vNumDocumentoStockInsumo = await getNextNumero(
      conn,
      'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
      [vTipoDocumentoStockInsumo]
    );

    const vNumDocumentoStockProduccion = await getNextNumero(
      conn,
      'SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ? AND codigo_provedor = ?',
      [vTipoDocumentoStockProduccion, vCodigo_provedor]
    );

    const vNumDocumentoGasto = await getNextNumero(
      conn,
      'SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_contable_gasto WHERE tipodocumento = ?',
      [vTipoDocumentoGasto]
    );

    res.json({
      ok: true,
      data: {
        vFecha: formatDate(new Date()),
        vTipoDocumentoStockInsumo,
        vNumDocumentoStockInsumo,
        vTipoDocumentoStockProduccion,
        vNumDocumentoStockProduccion,
        vTipoDocumentoGasto,
        vNumDocumentoGasto,
        vCodigo_provedor
      }
    });
  } catch (error) {
    logError(error, 'METADATA_ERROR');
    res.status(500).json({ ok: false, message: 'METADATA_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/bases', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_bases()');
    const rows = extractRows(result);
    res.json({ ok: true, bases: rows });
  } catch (error) {
    logError(error, 'BASES_ERROR');
    res.status(500).json({ ok: false, message: 'BASES_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/productos', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_productos()');
    const rows = extractRows(result);
    res.json({ ok: true, productos: rows });
  } catch (error) {
    logError(error, 'PRODUCTOS_ERROR');
    res.status(500).json({ ok: false, message: 'PRODUCTOS_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/cuentas', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_cuentasbancarias()');
    const rows = extractRows(result);
    res.json({ ok: true, cuentas: rows });
  } catch (error) {
    logError(error, 'CUENTAS_ERROR');
    res.status(500).json({ ok: false, message: 'CUENTAS_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/etiquetas-gastos', async (req, res) => {
  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    const [result] = await runQuery(conn, 'CALL get_etiquetas_gastos()');
    const rows = extractRows(result);
    res.json({ ok: true, etiquetas: rows });
  } catch (error) {
    logError(error, 'ETIQUETAS_GASTOS_ERROR');
    res.status(500).json({ ok: false, message: 'ETIQUETAS_GASTOS_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, log: '', filename: global.logFileName || '' });
    }
    const content = fs.readFileSync(global.logFilePath, 'utf-8');
    const lines = content.trim().split('\n');
    const tail = lines.slice(-300).join('\n');
    return res.json({ ok: true, log: tail, filename: global.logFileName || '' });
  } catch (error) {
    logError(error, 'LOGS_ERROR');
    return res.status(500).json({ ok: false, message: 'LOGS_ERROR' });
  }
});

app.post('/api/fabricacion', async (req, res) => {
  const payload = req.body || {};
  const insumos = Array.isArray(payload.vDetalleInsumos) ? payload.vDetalleInsumos : [];
  const gastos = Array.isArray(payload.vDetalleGastos) ? payload.vDetalleGastos : [];
  const produccion = Array.isArray(payload.vDetalleProduccion) ? payload.vDetalleProduccion : [];

  const decimalRegex = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

  if (!payload.vCodigo_base || !insumos.length || !produccion.length || !gastos.length) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_ERROR' });
  }

  const invalidInsumo = insumos.some(
    (item) =>
      !item.vcodigo_producto_insumo ||
      !decimalRegex.test(String(item.vcantidad_insumo)) ||
      Number(item.vcantidad_insumo) <= 0
  );
  const invalidGasto = gastos.some(
    (item) =>
      !item.vcodigoetiquetagasto ||
      !item.vcodigo_cuentabancaria ||
      !decimalRegex.test(String(item.vmonto_gasto)) ||
      Number(item.vmonto_gasto) <= 0
  );
  const invalidProd = produccion.some(
    (item) =>
      !item.vcodigo_producto_producido ||
      !decimalRegex.test(String(item.vcantidad_producida)) ||
      Number(item.vcantidad_producida) <= 0
  );

  if (invalidInsumo || invalidGasto || invalidProd) {
    return res.status(400).json({ ok: false, message: 'VALIDATION_ERROR' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const vFecha = payload.vFecha || formatDate(new Date());
    const vCodigo_base = payload.vCodigo_base;
    const vCodigo_provedor = 0;

    const vTipoDocumentoStockInsumo = payload.vTipoDocumentoStockInsumo || 'FBI';
    const vTipoDocumentoStockProduccion = payload.vTipoDocumentoStockProduccion || 'FBF';
    const vTipoDocumentoGasto = payload.vTipoDocumentoGasto || 'GAS';

    await ensureGenericProveedor(conn);

    const vNumDocumentoStockInsumo = payload.vNumDocumentoStockInsumo ||
      (await getNextNumero(
        conn,
        'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',
        [vTipoDocumentoStockInsumo]
      ));

    const vNumDocumentoStockProduccion = payload.vNumDocumentoStockProduccion ||
      (await getNextNumero(
        conn,
        'SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ? AND codigo_provedor = ?',
        [vTipoDocumentoStockProduccion, vCodigo_provedor]
      ));

    const vNumDocumentoGasto = payload.vNumDocumentoGasto ||
      (await getNextNumero(
        conn,
        'SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_contable_gasto WHERE tipodocumento = ?',
        [vTipoDocumentoGasto]
      ));
    let nextNumDocumentoGasto = Number(vNumDocumentoGasto);

    await runQuery(
      conn,
      'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)',
      [vTipoDocumentoStockInsumo, vNumDocumentoStockInsumo, vFecha, vCodigo_base]
    );

    const [insumoOrdRows] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
      [vTipoDocumentoStockInsumo, vNumDocumentoStockInsumo]
    );
    let vOrdinalInsumo = insumoOrdRows && insumoOrdRows[0] ? Number(insumoOrdRows[0].next) : 1;

    for (const item of insumos) {
      const cantidad = Number(item.vcantidad_insumo);
      await runQuery(
        conn,
        'INSERT INTO detalle_movimiento_stock (tipodocumentostock, numdocumentostock, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
        [
          vTipoDocumentoStockInsumo,
          vNumDocumentoStockInsumo,
          vOrdinalInsumo,
          item.vcodigo_producto_insumo,
          cantidad
        ]
      );

      await runQuery(conn, 'CALL aplicar_salida_partidas(?, ?, ?, ?)', [
        vTipoDocumentoStockInsumo,
        vNumDocumentoStockInsumo,
        item.vcodigo_producto_insumo,
        cantidad
      ]);

      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_base,
        item.vcodigo_producto_insumo,
        cantidad,
        vTipoDocumentoStockInsumo,
        vNumDocumentoStockInsumo
      ]);

      vOrdinalInsumo += 1;
    }

    await runQuery(
      conn,
      'INSERT INTO mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, fecha, monto) VALUES (?, ?, ?, ?, ?)',
      [vTipoDocumentoStockProduccion, vNumDocumentoStockProduccion, vCodigo_provedor, vFecha, 0]
    );

    const [prodOrdRows] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = ? AND num_documento_compra = ? AND codigo_provedor = ?',
      [vTipoDocumentoStockProduccion, vNumDocumentoStockProduccion, vCodigo_provedor]
    );
    let vOrdinalProduccion = prodOrdRows && prodOrdRows[0] ? Number(prodOrdRows[0].next) : 1;

    for (const item of produccion) {
      const cantidad = Number(item.vcantidad_producida);
      const monto = 0;
      await runQuery(
        conn,
        'INSERT INTO detalle_mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_base, ordinal, codigo_producto, cantidad, cantidad_entregada, saldo, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          vTipoDocumentoStockProduccion,
          vNumDocumentoStockProduccion,
          vCodigo_provedor,
          vCodigo_base,
          vOrdinalProduccion,
          item.vcodigo_producto_producido,
          cantidad,
          cantidad,
          cantidad,
          monto
        ]
      );

      await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
        vCodigo_base,
        item.vcodigo_producto_producido,
        cantidad,
        vTipoDocumentoStockProduccion,
        vNumDocumentoStockProduccion
      ]);

      vOrdinalProduccion += 1;
    }

    for (const item of gastos) {
      const numDocumentoGasto = nextNumDocumentoGasto;
      nextNumDocumentoGasto += 1;
      const descripcion = String(item.vnombre_etiquetagasto || 'Gasto fabricacion').slice(0, 60);

      await runQuery(
        conn,
        'INSERT INTO mov_contable_gasto (tipodocumento, numdocumento, tipo_documento_compra, num_documento_compra, codigo_provedor, fecha, descripcion, monto, codigo_cuentabancaria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          vTipoDocumentoGasto,
          numDocumentoGasto,
          vTipoDocumentoStockProduccion,
          vNumDocumentoStockProduccion,
          vCodigo_provedor,
          vFecha,
          descripcion,
          Number(item.vmonto_gasto),
          item.vcodigo_cuentabancaria
        ]
      );

      await runQuery(
        conn,
        'INSERT INTO mov_contable_gasto_detalle (tipodocumento, numdocumento, ordinal, codigoetiquetagasto) VALUES (?, ?, ?, ?)',
        [vTipoDocumentoGasto, numDocumentoGasto, 1, item.vcodigoetiquetagasto]
      );
    }

    await runQuery(conn, 'CALL aplicar_costo_fabricacion(?, ?, ?, ?, ?)', [
      vTipoDocumentoStockInsumo,
      vNumDocumentoStockInsumo,
      vTipoDocumentoStockProduccion,
      vNumDocumentoStockProduccion,
      vCodigo_provedor
    ]);

    await conn.commit();
    res.json({
      ok: true,
      vNumDocumentoStockInsumo,
      vNumDocumentoStockProduccion,
      vNumDocumentoGasto
    });
  } catch (error) {
    await conn.rollback();
    logError(error, 'FABRICACION_ERROR');
    res.status(500).json({ ok: false, message: 'FABRICACION_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.pool = await initDb();
    app.listen(PORT, () => {
      logLine(`SERVER_START: http://localhost:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER_START_ERROR');
    process.exit(1);
  }
}

start();
