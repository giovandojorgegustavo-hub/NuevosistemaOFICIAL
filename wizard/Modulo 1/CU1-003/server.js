const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-003';
const PORT = Number(process.env.PORT || getUseCasePort('CU1-003'));
const CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 2);

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
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn} connectionLimit=${CONNECTION_LIMIT}`);
  return {
    pool: mysql.createPool({
      ...dbConfig,
      database,
      waitForConnections: true,
      connectionLimit: CONNECTION_LIMIT,
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

async function anularFacturaPorDevolucion(conn, codigoPaquete) {
  const [facturaRows] = await runQuery(
    conn,
    "SELECT codigo_cliente, codigo_base, estado, monto FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = ? FOR UPDATE",
    [codigoPaquete]
  );
  const factura = facturaRows && facturaRows[0] ? facturaRows[0] : null;
  if (!factura) {
    throw new Error(`Factura no encontrada para paquete ${codigoPaquete}`);
  }
  if (String(factura.estado || '').toLowerCase() === 'anulado') {
    throw new Error(`Factura FAC-${codigoPaquete} ya se encuentra anulada`);
  }
  if (!factura.codigo_base) {
    throw new Error(`Factura FAC-${codigoPaquete} sin codigo_base`);
  }
  if (!factura.codigo_cliente) {
    throw new Error(`Factura FAC-${codigoPaquete} sin codigo_cliente`);
  }

  const [detalleRows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigoPaquete]);
  const detalleFactura = detalleRows[0] || [];
  const totalDetalle = detalleFactura.reduce((sum, row) => sum + (Number(row.precio_total) || 0), 0);
  const totalFactura = Number(factura.monto || 0) || totalDetalle;

  await runQuery(conn, 'CALL anular_documento_cliente(?, ?)', ['FAC', codigoPaquete]);

  await revertirPagosFacturaCliente(conn, 'FAC', codigoPaquete);

  for (const item of detalleFactura) {
    const cantidad = Number(item.cantidad) || 0;
    if (cantidad === 0) {
      continue;
    }

    await runQuery(conn, 'CALL upd_stock_bases(?, ?, ?, ?, ?)', [
      factura.codigo_base,
      item.codigo_producto,
      -cantidad,
      'FAC',
      codigoPaquete
    ]);
  }

  await runQuery(conn, 'CALL revertir_salida_partidas_documento(?, ?)', ['FAC', codigoPaquete]);
  await runQuery(conn, 'CALL revertir_salidaspedidos(?, ?)', ['FAC', codigoPaquete]);

  await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [factura.codigo_cliente, 'FAC', -totalFactura]);
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

app.get('/api/config', (req, res) => {
  const { googleMaps } = app.locals.db;
  res.json({ google_maps: googleMaps });
});

app.get('/api/paquetes', async (req, res) => {
  const estado = req.query.estado || 'en camino';
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_paquetes_por_estado(?)', [estado]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'PAQUETES ERROR');
    res.status(500).json({ ok: false, message: 'PAQUETES_ERROR' });
  }
});

app.get('/api/viaje/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_viaje_por_documento(?)', [codigo]);
      const data = rows[0] && rows[0][0] ? rows[0][0] : null;
      res.json({ ok: true, row: data });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'VIAJE ERROR');
    res.status(500).json({ ok: false, message: 'VIAJE_ERROR' });
  }
});

app.get('/api/detalle/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
      res.json({ ok: true, rows: rows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'DETALLE ERROR');
    res.status(500).json({ ok: false, message: 'DETALLE_ERROR' });
  }
});

app.get('/api/factura-resumen/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo || '').trim();
  if (!codigo) {
    return res.status(400).json({ ok: false, message: 'CODIGO_REQUERIDO' });
  }

  try {
    const { pool } = app.locals.db;
    const conn = await pool.getConnection();
    try {
      const [cabeceraRows] = await runQuery(
        conn,
        `SELECT
           numero_documento,
           codigo_cliente,
           codigo_base,
           codigo_packing,
           fecha_emision,
           monto,
           saldo,
           estado
         FROM mov_contable
         WHERE tipo_documento = 'FAC' AND numero_documento = ?
         LIMIT 1`,
        [codigo]
      );
      const cabecera = cabeceraRows && cabeceraRows[0] ? cabeceraRows[0] : null;
      const [detalleRows] = await runQuery(conn, 'CALL get_mov_contable_detalle(?, ?)', ['FAC', codigo]);
      return res.json({ ok: true, cabecera, detalle: detalleRows[0] || [] });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'FACTURA_RESUMEN_ERROR');
    return res.status(500).json({ ok: false, message: 'FACTURA_RESUMEN_ERROR' });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    if (!global.logFilePath || !fs.existsSync(global.logFilePath)) {
      return res.json({ ok: true, content: '' });
    }
    const content = fs.readFileSync(global.logFilePath, 'utf-8');
    return res.json({ ok: true, content });
  } catch (error) {
    logError(error, 'LOGS ERROR');
    return res.status(500).json({ ok: false, message: 'LOGS_ERROR' });
  }
});

app.post('/api/confirmar', async (req, res) => {
  const paquetes = Array.isArray(req.body.paquetes) ? req.body.paquetes : [];
  const estado = String(req.body.estado || '').trim().toLowerCase();
  if (!paquetes.length) {
    return res.status(400).json({ ok: false, message: 'PAQUETES_REQUERIDOS' });
  }
  if (!['robado', 'standby', 'llegado', 'devuelto'].includes(estado)) {
    return res.status(400).json({ ok: false, message: 'ESTADO_INVALIDO' });
  }

  const { pool } = app.locals.db;
  const conn = await pool.getConnection();
  try {
    logSql('BEGIN');
    await conn.beginTransaction();

    for (const codigo of paquetes) {
      const [[ordinalRow]] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [codigo]
      );
      const ordinal = ordinalRow?.next || 1;

      await runQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, ?) ',
        [codigo, ordinal, estado, 'FAC']
      );

      if (estado === 'robado' || estado === 'llegado') {
        const [viajeRows] = await runQuery(conn, 'CALL get_viaje_por_documento(?)', [codigo]);
        const viaje = viajeRows[0] && viajeRows[0][0] ? viajeRows[0][0] : null;
        if (viaje && viaje.codigoviaje) {
          await runQuery(
            conn,
            'UPDATE detalleviaje SET fecha_fin = NOW() WHERE codigoviaje = ? AND tipo_documento = ? AND numero_documento = ?',
            [viaje.codigoviaje, 'FAC', codigo]
          );
        }
      }

      if (estado === 'robado') {
        const [[ntcRow]] = await runQuery(
          conn,
          "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'",
          []
        );
        const correlativo = ntcRow?.next || 1;

        const [[facturaRow]] = await runQuery(
          conn,
          "SELECT codigo_pedido, codigo_cliente, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio, monto FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = ?",
          [codigo]
        );

        if (!facturaRow) {
          throw new Error(`Factura no encontrada para paquete ${codigo}`);
        }

        const totalNota = Number(facturaRow.monto || 0);
        await runQuery(
          conn,
          'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, saldo, tipo_documento, numero_documento, costoenvio) VALUES (?, NOW(), NOW(), NOW(), ?, ?, ?, ?, ?, ?)',
          [
            facturaRow.codigo_pedido,
            facturaRow.codigo_cliente,
            totalNota,
            totalNota,
            'NTC',
            correlativo,
            facturaRow.costoenvio
          ]
        );

        if (totalNota > 0) {
          await runQuery(conn, 'CALL aplicar_nota_credito_a_factura(?, ?, ?, ?, ?)', [
            'NTC',
            correlativo,
            'FAC',
            codigo,
            totalNota
          ]);
        }

        await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
          facturaRow.codigo_cliente,
          'NTC',
          totalNota
        ]);

        await runQuery(conn, 'CALL revertir_salidaspedidos(?, ?)', ['FAC', codigo]);
      }

      if (estado === 'devuelto') {
        await anularFacturaPorDevolucion(conn, codigo);
      }

      await runQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigo, estado]);
    }

    logSql('COMMIT');
    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    logSql('ROLLBACK');
    await conn.rollback();
    logError(error, 'CONFIRMAR ERROR');
    res.status(500).json({ ok: false, message: 'CONFIRMAR_ERROR' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  const db = await initDb();
  app.locals.db = db;
  app.listen(PORT, '127.0.0.1', () => {
    logLine(`Servidor CU-003 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
