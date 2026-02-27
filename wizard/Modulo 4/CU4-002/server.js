const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU4-002';
const PORT = Number(process.env.PORT || getUseCasePort('CU4-002'));

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

function getSqlLines(raw) {
  return raw
    .split('\n')
    .filter((line) => line.includes('[SQL]') || line.includes('SQL:'))
    .map((line) => line.trim())
    .filter(Boolean);
}

function unwrapProcedureRows(rows) {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows || [];
}

function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

app.get('/api/init', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[rowAJE]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJE'"
      );
      const [[rowAJS]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJS'"
      );

      await runQuery(
        conn,
        "INSERT INTO provedores (codigo_provedor, nombre) SELECT 0, 'PROVEEDOR GENERICO' FROM dual WHERE NOT EXISTS (SELECT 1 FROM provedores WHERE codigo_provedor = 0)"
      );

      res.json({
        ok: true,
        data: {
          vFecha: getCurrentDate(),
          vNumdocumentostock_AJE: Number(rowAJE?.next || 1),
          vNumdocumentostock_AJS: Number(rowAJS?.next || 1),
          vCodigo_provedor: 0
        }
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'INIT ERROR');
    res.status(500).json({ ok: false, message: 'INIT_ERROR' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_bases()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET BASES ERROR');
    res.status(500).json({ ok: false, message: 'GET_BASES_ERROR' });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_productos()');
      res.json({ ok: true, data: unwrapProcedureRows(rows) });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET PRODUCTOS ERROR');
    res.status(500).json({ ok: false, message: 'GET_PRODUCTOS_ERROR' });
  }
});

app.get('/api/productos-stock', async (req, res) => {
  const codigoBase = req.query.codigo_base;
  if (!codigoBase) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        `SELECT p.codigo_producto,
                p.nombre,
                COALESCE(ss.saldo_actual, 0) AS saldo_actual
         FROM saldo_stock ss
         INNER JOIN productos p
           ON p.codigo_producto = ss.codigo_producto
         WHERE ss.codigo_base = ?
           AND COALESCE(ss.saldo_actual, 0) > 0
         ORDER BY p.nombre`,
        [codigoBase]
      );
      res.json({ ok: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET PRODUCTOS STOCK ERROR');
    res.status(500).json({ ok: false, message: 'GET_PRODUCTOS_STOCK_ERROR' });
  }
});

app.get('/api/saldo-stock', async (req, res) => {
  const codigoBase = req.query.codigo_base;
  const codigoProducto = req.query.codigo_producto;
  if (!codigoBase || !codigoProducto) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [[row]] = await runQuery(
        conn,
        'SELECT COALESCE(saldo_actual, 0) AS saldo_partidas FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ? LIMIT 1',
        [codigoBase, codigoProducto]
      );
      res.json({ ok: true, saldo: row ? Number(row.saldo_partidas) : 0 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET SALDO ERROR');
    res.status(500).json({ ok: false, message: 'GET_SALDO_ERROR' });
  }
});

app.get('/api/costo-ultimo', async (req, res) => {
  const codigoProducto = req.query.codigo_producto;
  if (!codigoProducto) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_ultimo_costo_producto(?)', [codigoProducto]);
      const data = unwrapProcedureRows(rows);
      const row = Array.isArray(data) && data.length ? data[0] : null;
      res.json({ ok: true, costo_unitario: row && row.costo_unitario !== null ? Number(row.costo_unitario) : null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET COSTO ULTIMO ERROR');
    res.status(500).json({ ok: false, message: 'GET_COSTO_ULTIMO_ERROR' });
  }
});

app.post('/api/ajustes', async (req, res) => {
  const payload = req.body || {};
  const vFecha = payload.vFecha || getCurrentDate();
  const vCodigo_base = payload.vCodigo_base;
  const vDetalleAjuste = Array.isArray(payload.vDetalleAjuste) ? payload.vDetalleAjuste : [];

  if (!vFecha || !vCodigo_base || !vDetalleAjuste.length) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    const [[prov]] = await runQuery(conn, 'SELECT codigo_provedor FROM provedores WHERE codigo_provedor = 0');
    if (!prov) {
      await runQuery(conn, 'INSERT INTO provedores (codigo_provedor, nombre) VALUES (0, ?)', ['PROVEEDOR GENERICO']);
    }

    const [[rowAJE]] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJE'"
    );
    const [[rowAJS]] = await runQuery(
      conn,
      "SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJS'"
    );

    const vNumdocumentostock_AJE = Number(rowAJE?.next || 1);
    const vNumdocumentostock_AJS = Number(rowAJS?.next || 1);
    const vCodigo_provedor = 0;

    const normalized = vDetalleAjuste.map((item) => {
      const cantidadSistema = Number(item.Vcantidad_sistema || 0);
      const cantidadReal = Number(item.Vcantidad_real || 0);
      const cantidad = Number(item.Vcantidad || cantidadReal - cantidadSistema);
      const monto = Number(item.Vmonto || 0);
      return {
        vcodigo_producto: item.vcodigo_producto,
        Vcantidad: cantidad,
        Vcantidad_real: cantidadReal,
        Vcantidad_sistema: cantidadSistema,
        Vmonto: monto
      };
    });

    const lineasAJE = normalized.filter((item) => item.Vcantidad > 0);
    const lineasAJS = normalized.filter((item) => item.Vcantidad < 0);
    const lineasCero = normalized.filter((item) => item.Vcantidad === 0);

    if (lineasAJS.length || lineasCero.length) {
      await runQuery(
        conn,
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)',
        ['AJS', vNumdocumentostock_AJS, vFecha, vCodigo_base]
      );

      const [[rowOrdinalAJS]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
        ['AJS', vNumdocumentostock_AJS]
      );
      let ordinalAJS = Number(rowOrdinalAJS?.next || 1);

      for (const item of [...lineasAJS, ...lineasCero]) {
        if (!item.vcodigo_producto) {
          throw new Error('ITEM_INVALID');
        }
        await runQuery(
          conn,
          'INSERT INTO detalle_movimiento_stock (ordinal, tipodocumentostock, numdocumentostock, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)',
          [ordinalAJS, 'AJS', vNumdocumentostock_AJS, item.vcodigo_producto, Math.abs(item.Vcantidad)]
        );

        if (item.Vcantidad < 0) {
          await runQuery(conn, 'CALL aplicar_salida_partidas(?, ?, ?, ?)', [
            'AJS',
            vNumdocumentostock_AJS,
            item.vcodigo_producto,
            Math.abs(item.Vcantidad)
          ]);
          await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
            vCodigo_base,
            item.vcodigo_producto,
            Math.abs(item.Vcantidad),
            'AJS',
            vNumdocumentostock_AJS
          ]);
        }

        ordinalAJS += 1;
      }
    }

    if (lineasAJE.length) {
      await runQuery(
        conn,
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)',
        ['AJE', vNumdocumentostock_AJE, vFecha, vCodigo_base]
      );

      const totalMonto = lineasAJE.reduce((acc, item) => acc + Number(item.Vmonto || 0), 0);
      await runQuery(
        conn,
        'INSERT INTO mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, fecha, monto) VALUES (?, ?, ?, ?, ?)',
        ['AJE', vNumdocumentostock_AJE, vCodigo_provedor, vFecha, totalMonto]
      );

      const [[rowOrdinalAJE]] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = ? AND num_documento_compra = ? AND codigo_provedor = ?',
        ['AJE', vNumdocumentostock_AJE, vCodigo_provedor]
      );
      let ordinalAJE = Number(rowOrdinalAJE?.next || 1);

      for (const item of lineasAJE) {
        if (!item.vcodigo_producto) {
          throw new Error('ITEM_INVALID');
        }
        await runQuery(
          conn,
          'INSERT INTO detalle_mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_base, ordinal, codigo_producto, cantidad, cantidad_entregada, saldo, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'AJE',
            vNumdocumentostock_AJE,
            vCodigo_provedor,
            vCodigo_base,
            ordinalAJE,
            item.vcodigo_producto,
            item.Vcantidad,
            item.Vcantidad,
            item.Vcantidad,
            item.Vmonto
          ]
        );

        await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
          vCodigo_base,
          item.vcodigo_producto,
          Math.abs(item.Vcantidad),
          'AJE',
          vNumdocumentostock_AJE
        ]);

        ordinalAJE += 1;
      }
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true, vNumdocumentostock_AJE, vNumdocumentostock_AJS });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'AJUSTE ERROR');
    res.status(500).json({ ok: false, message: error?.message || 'AJUSTE_ERROR' });
  } finally {
    conn.release();
  }
});

app.get('/api/sql-logs', (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, lines: [] });
    }
    const raw = fs.readFileSync(global.logFilePath, 'utf-8');
    res.json({ ok: true, lines: getSqlLines(raw) });
  } catch (error) {
    logError(error, 'SQL LOGS ERROR');
    res.status(500).json({ ok: false, message: 'SQL_LOGS_ERROR' });
  }
});

async function start() {
  ensureLogFile();
  try {
    app.locals.pool = await initDb();
    app.listen(PORT, '127.0.0.1', () => {
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER INIT ERROR');
    process.exit(1);
  }
}

start();
