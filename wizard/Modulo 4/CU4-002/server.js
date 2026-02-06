const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU4-002';
const PORT = 3017;

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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

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
        'SELECT saldo_actual FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ?',
        [codigoBase, codigoProducto]
      );
      res.json({ ok: true, saldo: row ? Number(row.saldo_actual) : 0 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'GET SALDO ERROR');
    res.status(500).json({ ok: false, message: 'GET_SALDO_ERROR' });
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
          'INSERT INTO detalle_mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, ordinal, codigo_producto, cantidad, cantidad_entregada, saldo, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'AJE',
            vNumdocumentostock_AJE,
            vCodigo_provedor,
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
    res.status(500).json({ ok: false, message: 'AJUSTE_ERROR' });
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
    app.listen(PORT, () => {
      logLine(`SERVER STARTED: http://localhost:${PORT}`);
    });
  } catch (error) {
    logError(error, 'SERVER INIT ERROR');
    process.exit(1);
  }
}

start();
