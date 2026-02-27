const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU3-003';
const PORT = Number(process.env.PORT || getUseCasePort('CU3-003'));
const DECIMAL_2_REGEX = /^(?:0|[1-9]\d*)(?:[\.,]\d{1,2})?$/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

let logStream;
let pool;

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function compactDate(now) {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}

function createExecutionLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const base = `${LOG_PREFIX}-${compactDate(new Date())}`;
  let suffix = 1;
  let filename;
  do {
    filename = `${base}-${String(suffix).padStart(3, '0')}.log`;
    suffix += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  return path.join(LOG_DIR, filename);
}

function logLine(level, message) {
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

function logInfo(message) {
  logLine('INFO', message);
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  logLine('ERROR', context ? `${context} | ${detail}` : detail);
}

function logSql(sql, params) {
  const serializedParams = Array.isArray(params) ? JSON.stringify(params) : '[]';
  logLine('SQL', `${sql} | params=${serializedParams}`);
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

function getConnectionFromConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const config = yaml.parse(raw);

  if (!config || !Array.isArray(config.connections) || config.connections.length === 0) {
    throw new Error('No se encontro connections en erp.yml');
  }

  const selected = config.connections[0];
  if (!selected.dsn) {
    throw new Error('No se encontro {dsn} en erp.yml');
  }

  return {
    name: selected.name || '',
    dsn: selected.dsn
  };
}

async function initDbPool() {
  const connection = getConnectionFromConfig();
  const parsed = parseDsn(connection.dsn);
  const database = connection.name || parsed.database;

  logInfo(`DB CONFIG | name=${connection.name} dsn=${connection.dsn}`);

  return mysql.createPool({
    ...parsed,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

async function runQuery(conn, sql, params = []) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function todayYmd() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentHms() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function normalizeSqlDateTime(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (DATE_ONLY_REGEX.test(raw)) {
    return `${raw} ${currentHms()}`;
  }

  const match = raw.match(DATETIME_REGEX);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = '00'] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseNonNegativeInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

function parsePositiveDecimal(value) {
  const raw = String(value).trim();
  if (!DECIMAL_2_REGEX.test(raw)) {
    return null;
  }

  const normalized = raw.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

async function resolveUniqueBaseFromRemitos(conn, codigoProvedor, tipoDocumentoOrigen, numDocumentoOrigen, codigoProducto) {
  if (!codigoProvedor || !codigoProducto) {
    return null;
  }

  if (tipoDocumentoOrigen && numDocumentoOrigen) {
    const [rowsOrigen] = await runQuery(
      conn,
      `SELECT
        CASE
          WHEN COUNT(DISTINCT d.codigo_base) = 1 THEN MIN(d.codigo_base)
          ELSE NULL
        END AS codigo_base_unica
      FROM mov_contable_prov m
      INNER JOIN detalle_mov_contable_prov d
        ON d.tipo_documento_compra = m.tipo_documento_compra
       AND d.num_documento_compra = m.num_documento_compra
       AND d.codigo_provedor = m.codigo_provedor
      WHERE m.tipo_documento_compra = 'REM'
        AND m.codigo_provedor = ?
        AND m.tipo_documento_compra_origen = ?
        AND m.num_documento_compra_origen = ?
        AND m.codigo_provedor_origen = ?
        AND d.codigo_producto = ?
        AND d.codigo_base IS NOT NULL`,
      [codigoProvedor, tipoDocumentoOrigen, numDocumentoOrigen, codigoProvedor, codigoProducto]
    );
    const baseDesdeOrigen = parsePositiveInt(rowsOrigen?.[0]?.codigo_base_unica);
    if (baseDesdeOrigen) {
      return baseDesdeOrigen;
    }
  }

  const [rowsProveedorProducto] = await runQuery(
    conn,
    `SELECT
      CASE
        WHEN COUNT(DISTINCT d.codigo_base) = 1 THEN MIN(d.codigo_base)
        ELSE NULL
      END AS codigo_base_unica
    FROM detalle_mov_contable_prov d
    WHERE d.tipo_documento_compra = 'REM'
      AND d.codigo_provedor = ?
      AND d.codigo_producto = ?
      AND d.codigo_base IS NOT NULL`,
    [codigoProvedor, codigoProducto]
  );

  const baseDesdeRemitos = parsePositiveInt(rowsProveedorProducto?.[0]?.codigo_base_unica);
  if (baseDesdeRemitos) {
    return baseDesdeRemitos;
  }

  // Fallback: algunos flujos historicos (AJE/FBF/FCC) pudieron registrar base en detalle.
  const [rowsHistorico] = await runQuery(
    conn,
    `SELECT
      CASE
        WHEN COUNT(DISTINCT d.codigo_base) = 1 THEN MIN(d.codigo_base)
        ELSE NULL
      END AS codigo_base_unica
    FROM detalle_mov_contable_prov d
    INNER JOIN mov_contable_prov m
      ON m.tipo_documento_compra = d.tipo_documento_compra
     AND m.num_documento_compra = d.num_documento_compra
     AND m.codigo_provedor = d.codigo_provedor
    WHERE d.codigo_provedor = ?
      AND d.codigo_producto = ?
      AND d.codigo_base IS NOT NULL
      AND d.tipo_documento_compra IN ('AJE', 'FBF', 'REM')`,
    [codigoProvedor, codigoProducto]
  );

  return parsePositiveInt(rowsHistorico?.[0]?.codigo_base_unica);
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
  logInfo(`ENDPOINT ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/api/bootstrap', async (req, res) => {
  try {
    const [proveedoresResult] = await runQuery(pool, 'CALL get_proveedores()');
    const [productosResult] = await runQuery(pool, 'CALL get_productos()');
    const [basesResult] = await runQuery(pool, 'CALL get_bases()');
    const [facturasResult] = await runQuery(
      pool,
      `SELECT
        m.tipo_documento_compra,
        m.num_documento_compra,
        m.codigo_provedor,
        p.nombre AS nombre_provedor,
        SUM(COALESCE(d.saldo, 0)) AS saldo_pendiente_total,
        COALESCE(
          NULLIF(m.monto, 0),
          SUM(COALESCE(d.monto, 0)),
          0
        ) AS monto_total,
        m.fecha
      FROM mov_contable_prov m
      INNER JOIN provedores p
        ON p.codigo_provedor = m.codigo_provedor
      LEFT JOIN detalle_mov_contable_prov d
        ON d.tipo_documento_compra = m.tipo_documento_compra
       AND d.num_documento_compra = m.num_documento_compra
       AND d.codigo_provedor = m.codigo_provedor
      WHERE m.tipo_documento_compra = 'FCC'
        AND m.codigo_provedor > 0
      GROUP BY
        m.tipo_documento_compra,
        m.num_documento_compra,
        m.codigo_provedor,
        p.nombre,
        m.monto,
        m.fecha
      HAVING SUM(COALESCE(d.saldo, 0)) > 0
      ORDER BY m.fecha DESC, m.num_documento_compra DESC`
    );
    const [nextResult] = await runQuery(
      pool,
      'SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ?',
      ['NCC']
    );

    const vFacturasFCC = (facturasResult || []).filter(
      (row) => String(row.tipo_documento_compra || '').toUpperCase() === 'FCC'
    );

    res.json({
      ok: true,
      data: {
        vFecha: todayYmd(),
        vFechaDisplay: timestamp(),
        vTipo_documento_compra: 'NCC',
        vNum_documento_compra: nextResult?.[0]?.next || 1,
        vProveedores: proveedoresResult?.[0] || [],
        vProductos: productosResult?.[0] || [],
        vBases: basesResult?.[0] || [],
        vFacturasFCC
      }
    });
  } catch (error) {
    logError(error, 'BOOTSTRAP_ERROR');
    res.status(500).json({ ok: false, message: 'ERROR_BOOTSTRAP' });
  }
});

app.post('/api/fcc-detalle', async (req, res) => {
  const payload = req.body || {};
  const vTipo = String(payload.vTipo_documento_compra || '').trim();
  const vNum = parsePositiveInt(payload.vNum_documento_compra);
  const vCodigo = parsePositiveInt(payload.vCodigo_provedor);

  if (!vTipo || !vNum || !vCodigo) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  try {
    const [rows] = await runQuery(
      pool,
      `SELECT
        d.ordinal,
        COALESCE(
          d.codigo_base,
          (
            SELECT
              CASE
                WHEN COUNT(DISTINCT dr.codigo_base) = 1 THEN MIN(dr.codigo_base)
                ELSE NULL
              END
            FROM mov_contable_prov mr
            INNER JOIN detalle_mov_contable_prov dr
              ON dr.tipo_documento_compra = mr.tipo_documento_compra
             AND dr.num_documento_compra = mr.num_documento_compra
             AND dr.codigo_provedor = mr.codigo_provedor
            WHERE mr.tipo_documento_compra = 'REM'
              AND mr.tipo_documento_compra_origen = d.tipo_documento_compra
              AND mr.num_documento_compra_origen = d.num_documento_compra
              AND mr.codigo_provedor_origen = d.codigo_provedor
              AND dr.codigo_producto = d.codigo_producto
              AND dr.codigo_base IS NOT NULL
          ),
          (
            SELECT
              CASE
                WHEN COUNT(DISTINCT dr2.codigo_base) = 1 THEN MIN(dr2.codigo_base)
                ELSE NULL
              END
            FROM detalle_mov_contable_prov dr2
            WHERE dr2.tipo_documento_compra = 'REM'
              AND dr2.codigo_provedor = d.codigo_provedor
              AND dr2.codigo_producto = d.codigo_producto
              AND dr2.codigo_base IS NOT NULL
          ),
          (
            SELECT
              CASE
                WHEN COUNT(DISTINCT dh.codigo_base) = 1 THEN MIN(dh.codigo_base)
                ELSE NULL
              END
            FROM detalle_mov_contable_prov dh
            INNER JOIN mov_contable_prov mh
              ON mh.tipo_documento_compra = dh.tipo_documento_compra
             AND mh.num_documento_compra = dh.num_documento_compra
             AND mh.codigo_provedor = dh.codigo_provedor
            WHERE dh.codigo_provedor = d.codigo_provedor
              AND dh.codigo_producto = d.codigo_producto
              AND dh.codigo_base IS NOT NULL
              AND dh.tipo_documento_compra IN ('AJE', 'FBF', 'REM')
          )
        ) AS codigo_base,
        d.codigo_producto,
        p.nombre AS nombre_producto,
        d.cantidad,
        d.cantidad_entregada,
        d.saldo AS saldo_disponible,
        ROUND(
          CASE
            WHEN COALESCE(d.cantidad, 0) = 0 THEN 0
            ELSE COALESCE(d.monto, 0) / d.cantidad
          END,
          6
        ) AS costo_unitario,
        ROUND(
          CASE
            WHEN COALESCE(d.cantidad, 0) = 0 THEN 0
            ELSE (COALESCE(d.monto, 0) / d.cantidad) * COALESCE(d.saldo, 0)
          END,
          2
        ) AS monto_disponible
      FROM detalle_mov_contable_prov d
      INNER JOIN productos p ON p.codigo_producto = d.codigo_producto
      WHERE d.tipo_documento_compra = ?
        AND d.num_documento_compra = ?
        AND d.codigo_provedor = ?
        AND COALESCE(d.saldo, 0) > 0
      ORDER BY d.ordinal`,
      [vTipo, vNum, vCodigo]
    );

    const detalle = Array.isArray(rows) ? rows : [];
    res.json({ ok: true, detalle });
  } catch (error) {
    logError(error, 'FCC_DETALLE_ERROR');
    res.status(500).json({ ok: false, message: 'FCC_DETALLE_ERROR' });
  }
});

app.post('/api/nota-credito-proveedor', async (req, res) => {
  const payload = req.body || {};

  const vFecha = normalizeSqlDateTime(payload.vFecha);
  const vTipo_documento_compra = String(payload.vTipo_documento_compra || 'NCC').trim();
  const vTipo_nota_credito = String(payload.vTipo_nota_credito || 'PRODUCTO').trim().toUpperCase();
  const vCodigo_provedor = parsePositiveInt(payload.vCodigo_provedor);
  const vTipo_documento_compra_origen = String(payload.vTipo_documento_compra_origen || '').trim();
  const vNum_documento_compra_origen = parsePositiveInt(payload.vNum_documento_compra_origen);
  const vMonto_dinero = parsePositiveDecimal(payload.vMonto_dinero);
  const vDetalleNotaCredito = Array.isArray(payload.vDetalleNotaCredito) ? payload.vDetalleNotaCredito : [];

  if (!vTipo_documento_compra || !vCodigo_provedor) {
    return res.status(400).json({ ok: false, message: 'DATOS_INCOMPLETOS' });
  }
  if (!vFecha) {
    return res.status(400).json({ ok: false, message: 'FECHA_INVALIDA' });
  }
  if (vTipo_documento_compra !== 'NCC') {
    return res.status(400).json({ ok: false, message: 'TIPO_DOCUMENTO_INVALIDO' });
  }
  if (!['PRODUCTO', 'DINERO'].includes(vTipo_nota_credito)) {
    return res.status(400).json({ ok: false, message: 'TIPO_NCC_INVALIDO' });
  }
  if (vTipo_documento_compra_origen !== 'FCC' || !vNum_documento_compra_origen) {
    return res.status(400).json({ ok: false, message: 'FCC_ORIGEN_REQUERIDA' });
  }
  if (vTipo_nota_credito === 'PRODUCTO' && !vDetalleNotaCredito.length) {
    return res.status(400).json({ ok: false, message: 'DETALLE_REQUERIDO' });
  }
  if (vTipo_nota_credito === 'DINERO' && !vMonto_dinero) {
    return res.status(400).json({ ok: false, message: 'MONTO_DINERO_INVALIDO' });
  }

  const detalleNormalizado = [];
  if (vTipo_nota_credito === 'PRODUCTO') {
    for (let i = 0; i < vDetalleNotaCredito.length; i += 1) {
      const item = vDetalleNotaCredito[i] || {};
      const codigo_base = parseNonNegativeInt(item.codigo_base);
      const codigo_producto = parsePositiveInt(item.codigo_producto);
      const cantidad = parsePositiveDecimal(item.cantidad);
      const monto = parsePositiveDecimal(item.monto);

      if (codigo_base === null || !codigo_producto || !cantidad || !monto) {
        return res.status(400).json({ ok: false, message: 'DETALLE_INVALIDO' });
      }

      detalleNormalizado.push({
        ordinal: i + 1,
        codigo_base: codigo_base > 0 ? codigo_base : null,
        codigo_producto,
        cantidad,
        saldo: 0,
        monto
      });
    }
  }

  const vTotal_nota = Number((vTipo_nota_credito === 'DINERO'
    ? vMonto_dinero
    : detalleNormalizado.reduce((acc, item) => acc + item.monto, 0)).toFixed(2));
  if (vTotal_nota <= 0) {
    return res.status(400).json({ ok: false, message: 'TOTAL_INVALIDO' });
  }

  let conn;
  let vNum_documento_compra;

  try {
    conn = await pool.getConnection();
    logSql('BEGIN', []);
    await conn.beginTransaction();

    // Reserva numero NCC dentro de la transaccion y reintenta si hay colision de PK.
    let insertado = false;
    const MAX_RETRIES = 5;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      const [nextRows] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = ?',
        [vTipo_documento_compra]
      );
      const nextNumber = parsePositiveInt(nextRows?.[0]?.next) || 1;

      try {
        await runQuery(
          conn,
          `INSERT INTO mov_contable_prov (
            tipo_documento_compra,
            num_documento_compra,
            codigo_provedor,
            tipo_documento_compra_origen,
            num_documento_compra_origen,
            codigo_provedor_origen,
            fecha,
            monto,
            saldo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vTipo_documento_compra,
            nextNumber,
            vCodigo_provedor,
            vTipo_documento_compra_origen,
            vNum_documento_compra_origen,
            vCodigo_provedor,
            vFecha,
            vTotal_nota,
            vTotal_nota
          ]
        );
        vNum_documento_compra = nextNumber;
        insertado = true;
        break;
      } catch (insertError) {
        if (insertError && insertError.code === 'ER_DUP_ENTRY' && attempt < MAX_RETRIES) {
          logInfo(`NCC DUPLICADA detectada en intento ${attempt}. Reintentando numeracion...`);
          continue;
        }
        throw insertError;
      }
    }

    if (!insertado) {
      throw new Error('NCC_SEQUENCE_CONFLICT');
    }

    if (vTipo_nota_credito === 'PRODUCTO') {
      for (const item of detalleNormalizado) {
        if (!(item.codigo_base > 0)) {
          item.codigo_base = await resolveUniqueBaseFromRemitos(
            conn,
            vCodigo_provedor,
            vTipo_documento_compra_origen,
            vNum_documento_compra_origen,
            item.codigo_producto
          );
        }

        if (!(item.codigo_base > 0)) {
          throw new Error('BASE_STOCK_REQUERIDA');
        }

        await runQuery(
          conn,
          `INSERT INTO detalle_mov_contable_prov (
            tipo_documento_compra,
            num_documento_compra,
            codigo_provedor,
            codigo_base,
            ordinal,
            codigo_producto,
            cantidad,
            cantidad_entregada,
            saldo,
            monto
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [
            vTipo_documento_compra,
            vNum_documento_compra,
            vCodigo_provedor,
            item.codigo_base,
            item.ordinal,
            item.codigo_producto,
            item.cantidad,
            item.cantidad,
            item.monto
          ]
        );
      }

      for (const item of detalleNormalizado) {
        await runQuery(conn, 'CALL aplicar_nota_credito_partidas_prov(?, ?, ?, ?, ?)', [
          vTipo_documento_compra,
          vNum_documento_compra,
          vCodigo_provedor,
          item.codigo_producto,
          item.cantidad
        ]);
      }

      for (const item of detalleNormalizado) {
        if (item.codigo_base > 0) {
          await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
            item.codigo_base,
            item.codigo_producto,
            item.cantidad,
            vTipo_documento_compra,
            vNum_documento_compra
          ]);
        }
      }
    }

    await runQuery(conn, 'CALL aplicar_nota_credito_a_facturas_prov(?, ?, ?)', [
      vCodigo_provedor,
      vNum_documento_compra,
      vTotal_nota
    ]);

    await runQuery(conn, 'CALL actualizarsaldosprovedores(?, ?, ?)', [
      vCodigo_provedor,
      vTipo_documento_compra,
      vTotal_nota
    ]);

    logSql('COMMIT', []);
    await conn.commit();

    res.json({ ok: true, data: { vTotal_nota } });
  } catch (error) {
    if (conn) {
      logSql('ROLLBACK', []);
      await conn.rollback();
    }
    logError(error, 'REGISTRAR_NCC_ERROR');
    const isDataError = [
      'BASE_STOCK_REQUERIDA',
      'NCC_SIN_DOCUMENTO_ORIGEN',
      'FCC_ORIGEN_NO_ENCONTRADA',
      'SALDO_FCC_ORIGEN_INSUFICIENTE'
    ].includes(String(error?.message || ''));
    res.status(isDataError ? 400 : 500).json({ ok: false, message: isDataError ? error.message : 'ERROR_REGISTRAR_NCC' });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

async function startServer() {
  const logPath = createExecutionLogFile();
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logInfo(`LOG FILE ${path.basename(logPath)}`);

  pool = await initDbPool();

  app.listen(PORT, '127.0.0.1', () => {
    logInfo(`SERVER STARTED http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  logError(error, 'STARTUP_FATAL');
  process.exit(1);
});
