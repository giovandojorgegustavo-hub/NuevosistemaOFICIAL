const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function logLine(message) {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  if (global.logStream) {
    global.logStream.write(`${line}\n`);
  }
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const base = `CU4002-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
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
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
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
  logLine(`SQL: ${formatted}`);
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function normalizeRows(resultSets) {
  if (Array.isArray(resultSets)) {
    return resultSets[0] || [];
  }
  return [];
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(String(value).replace(',', '.'));
}

async function getNextNumber(conn, sql, params) {
  const [rows] = await runQuery(conn, sql, params);
  if (Array.isArray(rows) && rows.length) {
    return Number(rows[0].next || 1);
  }
  return 1;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.use(express.static(ROOT_DIR));

app.get('/api/bases', async (req, res) => {
  const sql = 'CALL get_bases()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar bases.' });
  }
});

app.get('/api/productos', async (req, res) => {
  const sql = 'CALL get_productos()';
  try {
    const [resultSets] = await runQuery(req.app.locals.db, sql);
    res.json(normalizeRows(resultSets));
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar productos.' });
  }
});

app.get('/api/saldo-stock', async (req, res) => {
  const { base, producto } = req.query;
  if (!base || !producto) {
    return res.status(400).json({ message: 'Faltan parametros de base o producto.' });
  }
  const sql =
    'SELECT COALESCE(saldo_actual, 0) AS saldo_actual FROM saldo_stock WHERE codigo_base = ? AND codigo_producto = ?';
  try {
    const [rows] = await runQuery(req.app.locals.db, sql, [base, producto]);
    res.json(rows[0] || { saldo_actual: 0 });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al cargar saldo de stock.' });
  }
});

app.get('/api/next-numdocumentostock', async (req, res) => {
  const tipo = req.query.tipo;
  if (!tipo) {
    return res.status(400).json({ message: 'Falta tipodocumentostock.' });
  }
  const sql =
    'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?';
  try {
    const next = await getNextNumber(req.app.locals.db, sql, [tipo]);
    res.json({ next });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al calcular numero de documento.' });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const content = fs.existsSync(global.logFilePath) ? fs.readFileSync(global.logFilePath, 'utf-8') : '';
    res.json({ filename: global.logFileName || '', content });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'No se pudo leer el log.' });
  }
});

app.post('/api/ajuste', async (req, res) => {
  const payload = req.body || {};
  const detalle = Array.isArray(payload.vDetalleAjuste) ? payload.vDetalleAjuste : [];

  if (!payload.vFecha || !payload.vCodigo_base) {
    return res.status(400).json({ message: 'Faltan datos generales del ajuste.' });
  }
  if (!detalle.length) {
    return res.status(400).json({ message: 'Debe incluir al menos una linea de ajuste.' });
  }

  const vCodigoBase = Number(payload.vCodigo_base);
  const vFecha = payload.vFecha;
  const vCodigoProvedor = 0;
  if (Number.isNaN(vCodigoBase)) {
    return res.status(400).json({ message: 'Codigo de base invalido.' });
  }

  const detalleNormalizado = detalle.map((item) => {
    const cantidadSistema = toNumber(item.vCantidad_sistema);
    const cantidadReal = toNumber(item.vCantidad_real);
    const cantidad = Number.isNaN(cantidadReal) ? NaN : cantidadReal - (Number.isNaN(cantidadSistema) ? 0 : cantidadSistema);
    const monto = toNumber(item.vMonto);
    return {
      vCodigo_producto: item.vCodigo_producto,
      vNombreProducto: item.vNombreProducto,
      vCantidad_sistema: cantidadSistema,
      vCantidad_real: cantidadReal,
      vCantidad: cantidad,
      vMonto: monto
    };
  });

  for (const item of detalleNormalizado) {
    if (!item.vCodigo_producto) {
      return res.status(400).json({ message: 'Todas las lineas deben tener producto.' });
    }
    if (Number.isNaN(item.vCantidad_real)) {
      return res.status(400).json({ message: 'Cantidad real invalida.' });
    }
    if (Number.isNaN(item.vCantidad)) {
      return res.status(400).json({ message: 'Cantidad de ajuste invalida.' });
    }
    if (item.vCantidad > 0 && (Number.isNaN(item.vMonto) || item.vMonto < 0)) {
      return res.status(400).json({ message: 'Monto invalido para ajustes de entrada.' });
    }
  }

  const hasAje = detalleNormalizado.some((item) => item.vCantidad > 0);
  const hasAjs = detalleNormalizado.some((item) => item.vCantidad <= 0);

  const conn = await req.app.locals.db.getConnection();
  try {
    await conn.beginTransaction();
    logLine('SQL: BEGIN TRANSACTION');

    const checkProveedorSql = 'SELECT codigo_provedor FROM provedores WHERE codigo_provedor = ?';
    const [proveedorRows] = await runQuery(conn, checkProveedorSql, [vCodigoProvedor]);
    if (!Array.isArray(proveedorRows) || !proveedorRows.length) {
      const insertProveedorSql = 'INSERT INTO provedores (codigo_provedor, nombre) VALUES (?, ?)';
      await runQuery(conn, insertProveedorSql, [vCodigoProvedor, 'PROVEEDOR GENERICO']);
    }

    let vNumdocumentostockAje = null;
    let vNumdocumentostockAjs = null;

    if (hasAje) {
      vNumdocumentostockAje = await getNextNumber(
        conn,
        'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',[
          'AJE'
        ]
      );
    }

    if (hasAjs) {
      vNumdocumentostockAjs = await getNextNumber(
        conn,
        'SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = ?',[
          'AJS'
        ]
      );
    }

    if (hasAje) {
      const totalMonto = detalleNormalizado
        .filter((item) => item.vCantidad > 0)
        .reduce((acc, item) => acc + (Number.isNaN(item.vMonto) ? 0 : item.vMonto), 0);

      const insertMovProvSql =
        'INSERT INTO mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, fecha, monto) VALUES (?, ?, ?, ?, ?)';
      await runQuery(conn, insertMovProvSql, ['AJE', vNumdocumentostockAje, vCodigoProvedor, vFecha, totalMonto]);

      const insertMovStockSql =
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base, tipo_documento_compra, num_documento_compra, codigo_provedor) VALUES (?, ?, ?, ?, ?, ?, ?)';
      await runQuery(conn, insertMovStockSql, [
        'AJE',
        vNumdocumentostockAje,
        vFecha,
        vCodigoBase,
        'AJE',
        vNumdocumentostockAje,
        vCodigoProvedor
      ]);
    }

    if (hasAjs) {
      const insertMovStockSql =
        'INSERT INTO movimiento_stock (tipodocumentostock, numdocumentostock, fecha, codigo_base) VALUES (?, ?, ?, ?)';
      await runQuery(conn, insertMovStockSql, ['AJS', vNumdocumentostockAjs, vFecha, vCodigoBase]);
    }

    if (hasAjs) {
      let ordinalAjs = await getNextNumber(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = ? AND numdocumentostock = ?',
        ['AJS', vNumdocumentostockAjs]
      );
      for (const item of detalleNormalizado) {
        if (item.vCantidad <= 0) {
          const cantidadAbs = Math.abs(item.vCantidad);
          const insertDetalleSql =
            'INSERT INTO detalle_movimiento_stock (tipodocumentostock, numdocumentostock, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)';
          await runQuery(conn, insertDetalleSql, [
            'AJS',
            vNumdocumentostockAjs,
            ordinalAjs,
            item.vCodigo_producto,
            cantidadAbs
          ]);
          ordinalAjs += 1;

          if (item.vCantidad < 0) {
            const aplicarSql = 'CALL aplicar_salida_partidas(?, ?, ?, ?)';
            await runQuery(conn, aplicarSql, ['AJS', vNumdocumentostockAjs, item.vCodigo_producto, cantidadAbs]);
          }
        }
      }
    }

    if (hasAje) {
      let ordinalAje = await getNextNumber(
        conn,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = ? AND num_documento_compra = ? AND codigo_provedor = ?',
        ['AJE', vNumdocumentostockAje, vCodigoProvedor]
      );
      for (const item of detalleNormalizado) {
        if (item.vCantidad > 0) {
          const insertDetalleAjeSql =
            'INSERT INTO detalle_mov_contable_prov (tipo_documento_compra, num_documento_compra, codigo_provedor, ordinal, codigo_producto, cantidad, cantidad_entregada, saldo, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
          await runQuery(conn, insertDetalleAjeSql, [
            'AJE',
            vNumdocumentostockAje,
            vCodigoProvedor,
            ordinalAje,
            item.vCodigo_producto,
            item.vCantidad,
            item.vCantidad,
            item.vCantidad,
            item.vMonto
          ]);
          ordinalAje += 1;
        }
      }
    }

    for (const item of detalleNormalizado) {
      const tipodoc = item.vCantidad > 0 ? 'AJE' : 'AJS';
      const numdoc = item.vCantidad > 0 ? vNumdocumentostockAje : vNumdocumentostockAjs;
      const cantidadAbs = Math.abs(item.vCantidad);
      const updSql = 'CALL upd_stock_bases(?, ?, ?, ?, ?)';
      await runQuery(conn, updSql, [vCodigoBase, item.vCodigo_producto, cantidadAbs, tipodoc, numdoc]);
    }

    await conn.commit();
    logLine('SQL: COMMIT');

    res.json({
      message: 'Ajuste registrado correctamente.',
      usedNumbers: {
        vNumdocumentostock_AJE: vNumdocumentostockAje,
        vNumdocumentostock_AJS: vNumdocumentostockAjs
      }
    });
  } catch (error) {
    await conn.rollback();
    logLine('SQL: ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    res.status(500).json({ message: 'Error al registrar ajuste.' });
  } finally {
    conn.release();
  }
});

async function start() {
  ensureLogFile();
  app.locals.db = await initDb();
  const port = process.env.PORT || 3017;
  app.listen(port, () => {
    logLine(`SERVER START: http://localhost:${port}`);
  });
}

start().catch((error) => {
  logLine(`ERROR: ${error.message}`);
  process.exit(1);
});
