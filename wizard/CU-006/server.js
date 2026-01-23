const fs = require('fs');
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
let yaml;

try {
  yaml = require('js-yaml');
} catch (err) {
  yaml = require('yaml');
}

const app = express();
const PORT = process.env.PORT || 3010;

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_PREFIX = 'CU-006';

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

function createLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filePath;
  do {
    const suffix = pad(counter, 3);
    filePath = path.join(LOG_DIR, `${LOG_PREFIX}-${stamp}-${suffix}.log`);
    counter += 1;
  } while (fs.existsSync(filePath));
  fs.writeFileSync(filePath, '', 'utf8');
  return filePath;
}

const LOG_FILE = createLogFile();

function logLine(level, message, meta = '') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}${meta ? ` | ${meta}` : ''}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
}

function logSql(sql, params = []) {
  logLine('SQL', sql, JSON.stringify(params));
}

function readErpConfig() {
  const filePath = path.resolve(__dirname, '../../erp.yml');
  const content = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(content);
  if (!config || !Array.isArray(config.connections) || config.connections.length === 0) {
    throw new Error('No se encontro la conexion en erp.yml');
  }
  return config.connections[0];
}

function parseDsn(dsn) {
  const normalized = dsn.replace(/@tcp\(([^)]+)\)/, '@$1');
  const url = new URL(normalized);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', '')
  };
}

let pool;

async function initDb() {
  const config = readErpConfig();
  const conn = parseDsn(config.dsn);
  pool = mysql.createPool({
    ...conn,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  });
  logLine('INFO', `Conexion inicializada a ${config.name}`);
}

async function runQuery(sql, params = []) {
  logSql(sql, params);
  const [rows] = await pool.execute(sql, params);
  return rows;
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  logLine('INFO', `ENDPOINT ${req.method} ${req.path}`);
  next();
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_pedidospendientes()');
    const data = rows[0] || [];
    const { cliente, fecha } = req.query;
    const filtered = data.filter((row) => {
      const matchCliente = cliente ? String(row.vcodigo_cliente).includes(cliente) : true;
      const matchFecha = fecha ? String(row.vfecha).startsWith(fecha) : true;
      return matchCliente && matchFecha;
    });
    res.json(filtered);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar pedidos.');
  }
});

app.get('/api/pedidos/:codigo/detalle', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_pedido_detalle_por_pedido(?)', [req.params.codigo]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar detalle del pedido.');
  }
});

app.get('/api/bases', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_bases()');
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar bases.');
  }
});

app.get('/api/puntos-entrega', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_puntos_entrega(?)', [req.query.cliente]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar puntos de entrega.');
  }
});

app.get('/api/numrecibe', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_numrecibe(?)', [req.query.cliente]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar numrecibe.');
  }
});

app.get('/api/ubigeo/departamentos', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_ubigeo_departamentos()');
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar departamentos.');
  }
});

app.get('/api/ubigeo/provincias', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_ubigeo_provincias(?)', [req.query.dep]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar provincias.');
  }
});

app.get('/api/ubigeo/distritos', async (req, res) => {
  try {
    const rows = await runQuery('CALL get_ubigeo_distritos(?, ?)', [req.query.dep, req.query.prov]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al cargar distritos.');
  }
});

app.get('/api/next-documento', async (req, res) => {
  try {
    const rows = await runQuery(
      'SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?',
      [req.query.tipo]
    );
    res.json(rows[0] || { next: 1 });
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al calcular numero documento.');
  }
});

app.get('/api/next-ordinal-detalle', async (req, res) => {
  try {
    const rows = await runQuery(
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = ? AND numero_documento = ?',
      [req.query.tipo, req.query.numero]
    );
    res.json(rows[0] || { next: 1 });
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al calcular ordinal detalle.');
  }
});

app.get('/api/next-puntoentrega', async (req, res) => {
  try {
    const rows = await runQuery(
      'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
      [req.query.cliente]
    );
    res.json(rows[0] || { next: 1 });
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al calcular punto entrega.');
  }
});

app.get('/api/next-numrecibe', async (req, res) => {
  try {
    const rows = await runQuery(
      'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
      [req.query.cliente]
    );
    res.json(rows[0] || { next: 1 });
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al calcular numrecibe.');
  }
});

app.get('/api/next-paquetedetalle', async (req, res) => {
  try {
    const rows = await runQuery(
      "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [req.query.numero]
    );
    res.json(rows[0] || { next: 1 });
  } catch (error) {
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al calcular paquete detalle.');
  }
});

app.post('/api/emit-factura', async (req, res) => {
  const payload = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const pedido = payload.pedido;
    const factura = payload.factura;
    const entrega = payload.entrega;
    const recibe = payload.recibe;
    const detalle = payload.facturaDetalle;

    if (entrega.tipo === 'nuevo') {
      const sql = `
        INSERT INTO puntos_entrega
        (ubigeo, codigo_puntoentrega, codigo_cliente_puntoentrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        entrega.ubigeo,
        entrega.codigo_puntoentrega,
        pedido.vcodigo_cliente,
        entrega.direccion_linea || null,
        entrega.referencia || null,
        entrega.nombre || null,
        entrega.dni || null,
        entrega.agencia || null,
        entrega.observaciones || null,
        entrega.region_entrega,
        entrega.concatenarpuntoentrega
      ];
      logSql(sql, params);
      await connection.execute(sql, params);
    }

    if (recibe.tipo === 'nuevo') {
      const sql = `
        INSERT INTO numrecibe
        (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [
        recibe.ordinal_numrecibe,
        recibe.numero,
        recibe.nombre,
        pedido.vcodigo_cliente,
        recibe.concatenarnumrecibe
      ];
      logSql(sql, params);
      await connection.execute(sql, params);
    }

    const movSql = `
      INSERT INTO mov_contable
      (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega)
      VALUES (?, ?, ?, ?, ?, ?, 'FAC', ?, ?, ?, ?, ?, ?)
    `;
    const movParams = [
      pedido.vcodigo_pedido,
      factura.fecha_emision,
      factura.fecha_emision,
      factura.fecha_emision,
      pedido.vcodigo_cliente,
      factura.saldo,
      factura.numero_documento,
      factura.codigo_base,
      pedido.vcodigo_cliente,
      recibe.ordinal_numrecibe || null,
      pedido.vcodigo_cliente,
      entrega.codigo_puntoentrega || null
    ];
    logSql(movSql, movParams);
    await connection.execute(movSql, movParams);

    for (const [index, item] of detalle.entries()) {
      const detSql = `
        INSERT INTO mov_contable_detalle
        (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total)
        VALUES ('FAC', ?, ?, ?, ?, ?, ?)
      `;
      const detParams = [
        factura.numero_documento,
        item.ordinal || index + 1,
        item.codigo_producto,
        item.cantidad,
        item.cantidad,
        item.precio_total
      ];
      logSql(detSql, detParams);
      await connection.execute(detSql, detParams);
    }

    const paqueteSql = `
      INSERT INTO paquete
      (codigo_paquete, tipo_documento, estado)
      VALUES (?, 'FAC', 'pendiente empacar')
    `;
    logSql(paqueteSql, [factura.numero_documento]);
    await connection.execute(paqueteSql, [factura.numero_documento]);

    const paqueteDetSql = `
      INSERT INTO paquetedetalle
      (codigo_paquete, tipo_documento, ordinal, estado)
      VALUES (?, 'FAC', ?, 'pendiente empacar')
    `;
    logSql(paqueteDetSql, [factura.numero_documento, payload.paquetedetalle.ordinal_paquetedetalle]);
    await connection.execute(paqueteDetSql, [factura.numero_documento, payload.paquetedetalle.ordinal_paquetedetalle]);

    const saldoSql = 'CALL actualizarsaldosclientes(?, ?, ?)';
    const saldoParams = [pedido.vcodigo_cliente, factura.tipo_documento, factura.saldo];
    logSql(saldoSql, saldoParams);
    await connection.execute(saldoSql, saldoParams);

    const salidaSql = 'CALL salidaspedidos(?, ?)';
    const salidaParams = [factura.tipo_documento, factura.numero_documento];
    logSql(salidaSql, salidaParams);
    await connection.execute(salidaSql, salidaParams);

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    logLine('ERROR', error.message, error.stack);
    res.status(500).send('Error al emitir la factura.');
  } finally {
    connection.release();
  }
});

app.use((err, req, res, next) => {
  logLine('ERROR', err.message, err.stack);
  res.status(500).send('Error inesperado.');
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      logLine('INFO', `Servidor iniciado en puerto ${PORT}`);
    });
  })
  .catch((error) => {
    logLine('ERROR', error.message, error.stack);
    process.exit(1);
  });
