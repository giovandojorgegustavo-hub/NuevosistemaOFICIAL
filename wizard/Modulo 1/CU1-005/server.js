const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_PREFIX = 'CU1-005';
const REQUEST_TIMEOUT_MS = 12000;

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
    mainPort: Number(data.main_port || 0),
    googleMaps: data.google_maps || {}
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
  if (!result) return [];
  if (Array.isArray(result)) {
    const [rows] = result;
    if (Array.isArray(rows)) {
      return rows;
    }
  }
  return [];
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

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(ROOT_DIR));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

ensureLogFile();

let pool;
let googleMaps = {};

initDb()
  .then((result) => {
    pool = result.pool;
    googleMaps = result.googleMaps || {};
    logLine('SERVER INIT OK');
  })
  .catch((error) => {
    logError(error, 'DB INIT FAILED');
  });

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/config', (req, res) => {
  res.json({
    apiKey: googleMaps.api_key || '',
    defaultCenter: googleMaps.default_center || { lat: -12.0464, lng: -77.0428 },
    defaultZoom: googleMaps.default_zoom || 12
  });
});

app.get('/api/pedidos-pendientes', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_pedidospendientes()');
      let rows = unwrapRows(result);
      const { cliente, fecha } = req.query;
      if (cliente) {
        rows = rows.filter((row) => String(row.nombre_cliente || '').toLowerCase().includes(String(cliente).toLowerCase()));
      }
      if (fecha) {
        rows = rows.filter((row) => String(row.fecha || '').startsWith(String(fecha)));
      }
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_pedidospendientes failed');
    res.status(500).json({ error: 'Failed to load pedidos' });
  }
});

app.get('/api/pedido-detalle/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_pedido_detalle_por_pedido(?)', [codigo]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_pedido_detalle_por_pedido failed');
    res.status(500).json({ error: 'Failed to load detalle' });
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_bases()');
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_bases failed');
    res.status(500).json({ error: 'Failed to load bases' });
  }
});

app.post('/api/bases-candidatas', async (req, res) => {
  const { vProdFactura, vFechaP } = req.body || {};
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_bases_candidatas(?, ?)', [JSON.stringify(vProdFactura || []), vFechaP]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_bases_candidatas failed');
    res.status(500).json({ error: 'Failed to load bases candidatas' });
  }
});

app.get('/api/puntos-entrega/:cliente', async (req, res) => {
  const cliente = req.params.cliente;
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_puntos_entrega(?)', [cliente]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_puntos_entrega failed');
    res.status(500).json({ error: 'Failed to load puntos entrega' });
  }
});

app.get('/api/ubigeo/departamentos', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_ubigeo_departamentos()');
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_ubigeo_departamentos failed');
    res.status(500).json({ error: 'Failed to load departamentos' });
  }
});

app.get('/api/ubigeo/provincias/:cod_dep', async (req, res) => {
  const codDep = req.params.cod_dep;
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_ubigeo_provincias(?)', [codDep]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_ubigeo_provincias failed');
    res.status(500).json({ error: 'Failed to load provincias' });
  }
});

app.get('/api/ubigeo/distritos/:cod_dep/:cod_prov', async (req, res) => {
  const { cod_dep: codDep, cod_prov: codProv } = req.params;
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_ubigeo_distritos(?, ?)', [codDep, codProv]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_ubigeo_distritos failed');
    res.status(500).json({ error: 'Failed to load distritos' });
  }
});

app.get('/api/numrecibe/:cliente', async (req, res) => {
  const cliente = req.params.cliente;
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_numrecibe(?)', [cliente]);
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_numrecibe failed');
    res.status(500).json({ error: 'Failed to load numrecibe' });
  }
});

app.get('/api/cuentas-bancarias', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const result = await runQuery(conn, 'CALL get_cuentasbancarias()');
      const rows = unwrapRows(result);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'get_cuentasbancarias failed');
    res.status(500).json({ error: 'Failed to load cuentas' });
  }
});

app.get('/api/next-factura', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(conn, "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'");
      res.json({ next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'next factura failed');
    res.status(500).json({ error: 'Failed to load next factura' });
  }
});

app.get('/api/next-puntoentrega/:cliente', async (req, res) => {
  const cliente = req.params.cliente;
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [cliente]
      );
      res.json({ next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'next puntoentrega failed');
    res.status(500).json({ error: 'Failed to load next puntoentrega' });
  }
});

app.get('/api/next-numrecibe/:cliente', async (req, res) => {
  const cliente = req.params.cliente;
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [cliente]
      );
      res.json({ next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'next numrecibe failed');
    res.status(500).json({ error: 'Failed to load next numrecibe' });
  }
});

app.get('/api/next-recibo', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await runQuery(
        conn,
        "SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCP'"
      );
      res.json({ next: rows[0]?.next || 1 });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'next recibo failed');
    res.status(500).json({ error: 'Failed to load next recibo' });
  }
});

app.post('/api/distance-matrix', async (req, res) => {
  const { origin, destinations } = req.body || {};
  if (!googleMaps.api_key) {
    return res.status(500).json({ error: 'Google Maps API key missing' });
  }
  if (!origin || !Array.isArray(destinations) || destinations.length === 0) {
    return res.status(400).json({ error: 'Invalid origin/destinations' });
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origin);
    url.searchParams.set('destinations', destinations.join('|'));
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('key', googleMaps.api_key);

    const response = await fetch(url.toString(), { signal: controller.signal });
    const data = await response.json();
    clearTimeout(timeoutId);

    if (!response.ok || data.status !== 'OK') {
      logError(data, 'Distance Matrix API error');
      return res.status(502).json({ error: 'Distance Matrix API error', details: data });
    }

    const meta = Array.isArray(req.body.destinations_meta) ? req.body.destinations_meta : [];
    const results = [];
    data.rows[0].elements.forEach((element, index) => {
      const base = destinations[index];
      if (element.status === 'OK') {
        results.push({
          codigo_base: meta[index]?.codigo_base || base,
          destination: base,
          duration_value: element.duration.value,
          duration_text: element.duration.text
        });
      }
    });

    res.json({ rows: results });
  } catch (error) {
    logError(error, 'Distance Matrix request failed');
    res.status(500).json({ error: 'Distance Matrix request failed' });
  }
});

// no helper needed

app.post('/api/emitir-factura', async (req, res) => {
  const { data, prodFactura } = req.body || {};
  if (!data) {
    return res.status(400).json({ error: 'Missing data' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (data.vEntregaModo === 'nuevo') {
      await runQuery(
        conn,
        `INSERT INTO puntos_entrega
        (ubigeo, codigo_puntoentrega, codigo_cliente, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega, latitud, longitud)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.Vubigeo,
          data.Vcodigo_puntoentrega,
          data.vClienteCodigo,
          data.vDireccionLinea,
          data.vReferencia,
          data.vNombre,
          data.vDni,
          data.vAgencia,
          data.vObservaciones,
          data.vRegion_Entrega,
          data.vConcatenarpuntoentrega,
          data.vLatitud || null,
          data.vLongitud || null
        ]
      );
    }

    if (data.vRegion_Entrega === 'LIMA' && data.vRecibeModo === 'nuevo') {
      await runQuery(
        conn,
        `INSERT INTO numrecibe
        (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe)
        VALUES (?, ?, ?, ?, ?)`,
        [
          data.vOrdinal_numrecibe,
          data.vNumeroRecibe,
          data.vNombreRecibe,
          data.vClienteCodigo,
          data.vConcatenarnumrecibe
        ]
      );
    }

    await runQuery(
      conn,
      `INSERT INTO mov_contable
      (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.vcodigo_pedido,
        data.vFechaP,
        data.vFechaP,
        data.vFechaP,
        data.vClienteCodigo,
        data.Vfsaldo,
        data.Vfsaldo,
        'FAC',
        data.vNumero_documento,
        data.vcodigo_base,
        data.vClienteCodigo,
        data.vOrdinal_numrecibe,
        data.vClienteCodigo,
        data.Vcodigo_puntoentrega,
        data.vCostoEnvio
      ]
    );

    for (const item of prodFactura || []) {
      await runQuery(
        conn,
        `INSERT INTO mov_contable_detalle
        (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'FAC',
          data.vNumero_documento,
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
      `INSERT INTO paquete
      (codigo_paquete, tipo_documento, estado)
      VALUES (?, ?, ?)`,
      [data.vNumero_documento, 'FAC', 'pendiente empacar']
    );

    for (const item of prodFactura || []) {
      await runQuery(
        conn,
        `INSERT INTO paquetedetalle
        (codigo_paquete, tipo_documento, ordinal, estado)
        VALUES (?, ?, ?, ?)`,
        [data.vNumero_documento, 'FAC', item.ordinal, 'pendiente empacar']
      );
    }

    await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [data.vClienteCodigo, 'FAC', data.Vfsaldo]);
    await runQuery(conn, 'CALL salidaspedidos(?, ?)', ['FAC', data.vNumero_documento]);

    if (Number(data.vMontoPago || 0) > 0) {
      await runQuery(
        conn,
        `INSERT INTO mov_operaciones_contables
        (tipodocumento, numdocumento, fecha, monto, codigo_cuentabancaria, codigo_cuentabancaria_destino, descripcion)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'RCP',
          data.vNumero_documento_pago,
          data.vFechaP,
          data.vMontoPago,
          data.vCuentaBancaria,
          null,
          'Recibo cliente'
        ]
      );

      await runQuery(conn, 'CALL aplicar_recibo_a_facturas(?, ?, ?)', [
        data.vClienteCodigo,
        data.vNumero_documento_pago,
        data.vMontoPago
      ]);

      await runQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [data.vClienteCodigo, 'RCP', data.vMontoPago]);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    logError(error, 'emitir-factura failed');
    res.status(500).json({ error: 'Emitir factura failed' });
  } finally {
    conn.release();
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  logLine(`CU005 server running on http://127.0.0.1:${PORT}`);
});
