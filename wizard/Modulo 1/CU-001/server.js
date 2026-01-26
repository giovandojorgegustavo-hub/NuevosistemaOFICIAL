const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
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
  const pad = (n) => String(n).padStart(2, '0');
  const base = `CU-001-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));
  global.logStream = fs.createWriteStream(path.join(LOG_DIR, filename), { flags: 'a' });
  logLine(`LOG FILE: ${filename}`);
}

function parseErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const dsnMatch = raw.match(/dsn:\s*"?([^"\n]+)"?/);
  const nameMatch = raw.match(/name:\s*"?([^"\n]+)"?/);
  if (!dsnMatch) throw new Error('No se encontró DSN en erp.yml');
  let dsn = dsnMatch[1];
  if (dsn.includes('@tcp(')) {
    const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
    if (match) {
      const user = encodeURIComponent(match[1]);
      const pass = encodeURIComponent(match[2]);
      const host = match[3];
      const port = match[4];
      const db = match[5];
      dsn = `mysql://${user}:${pass}@${host}:${port}/${db}`;
    }
  }
  return {
    name: nameMatch ? nameMatch[1] : 'default',
    dsn
  };
}

async function initDb() {
  const config = parseErpConfig();
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return mysql.createPool({
    uri: config.dsn,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/html';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`);
}

function normalizeRows(resultSets) {
  if (Array.isArray(resultSets)) {
    return resultSets[0] || [];
  }
  return [];
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleRequest(req, res, db) {
  const parsed = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const route = parsed.pathname;

  logLine(`ENDPOINT: ${method} ${route}`);

  if (method === 'GET' && route === '/') {
    return sendFile(res, path.join(ROOT_DIR, 'index.html'));
  }

  if (method === 'GET' && (route.endsWith('.css') || route.endsWith('.js'))) {
    return sendFile(res, path.join(ROOT_DIR, route));
  }

  if (method === 'GET' && route === '/api/now') {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return sendJson(res, 200, {
      fecha: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hora: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    });
  }

  if (method === 'GET' && route === '/api/clientes') {
    const sql = 'CALL get_clientes()';
    try {
      const [resultSets] = await runQuery(db, sql);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar clientes.' });
    }
  }

  if (method === 'GET' && route === '/api/productos') {
    const sql = 'CALL get_productos()';
    try {
      const [resultSets] = await runQuery(db, sql);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar productos.' });
    }
  }

  if (method === 'GET' && route === '/api/bases') {
    const sql = 'CALL get_bases()';
    try {
      const [resultSets] = await runQuery(db, sql);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar bases.' });
    }
  }

  if (method === 'GET' && route === '/api/puntos-entrega') {
    const cliente = parsed.query.cliente;
    if (!cliente) return sendJson(res, 400, { message: 'Falta cliente.' });
    const sql = 'CALL get_puntos_entrega(?)';
    try {
      const [resultSets] = await runQuery(db, sql, [cliente]);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar puntos de entrega.' });
    }
  }

  if (method === 'GET' && route === '/api/numrecibe') {
    const cliente = parsed.query.cliente;
    if (!cliente) return sendJson(res, 400, { message: 'Falta cliente.' });
    const sql = 'CALL get_numrecibe(?)';
    try {
      const [resultSets] = await runQuery(db, sql, [cliente]);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar recibe.' });
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/departamentos') {
    const sql = 'CALL get_ubigeo_departamentos()';
    try {
      const [resultSets] = await runQuery(db, sql);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar departamentos.' });
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/provincias') {
    const dep = parsed.query.dep;
    if (!dep) return sendJson(res, 400, { message: 'Falta departamento.' });
    const sql = 'CALL get_ubigeo_provincias(?)';
    try {
      const [resultSets] = await runQuery(db, sql, [dep]);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar provincias.' });
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/distritos') {
    const dep = parsed.query.dep;
    const prov = parsed.query.prov;
    if (!dep || !prov) return sendJson(res, 400, { message: 'Faltan parametros.' });
    const sql = 'CALL get_ubigeo_distritos(?, ?)';
    try {
      const [resultSets] = await runQuery(db, sql, [dep, prov]);
      return sendJson(res, 200, normalizeRows(resultSets));
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al cargar distritos.' });
    }
  }

  if (method === 'GET' && route === '/api/next/codigo-pedido') {
    const sql = 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos';
    try {
      const [rows] = await runQuery(db, sql);
      const next = rows && rows[0] ? rows[0].next : 1;
      return sendJson(res, 200, { next });
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al calcular codigo pedido.' });
    }
  }

  if (method === 'GET' && route === '/api/next/numero-documento') {
    const tipo = parsed.query.tipo || 'FAC';
    const sql = 'SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?';
    try {
      const [rows] = await runQuery(db, sql, [tipo]);
      const next = rows && rows[0] ? rows[0].next : 1;
      return sendJson(res, 200, { next });
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 500, { message: 'Error al calcular numero documento.' });
    }
  }

  if (method === 'POST' && route === '/api/emitir-factura') {
    try {
      const payload = await parseBody(req);
      const codigoPedido = payload.codigo_pedido;
      const codigoCliente = payload.codigo_cliente;
      const fechaPedido = payload.fecha_pedido;
      const pedidoDetalle = payload.pedido_detalle || [];
      const factura = payload.factura || {};
      const entrega = payload.entrega || {};
      const recibe = payload.recibe || {};

      if (!codigoPedido || !codigoCliente || !fechaPedido) {
        return sendJson(res, 400, { message: 'Faltan datos del pedido.' });
      }
      if (!Array.isArray(pedidoDetalle) || pedidoDetalle.length === 0) {
        return sendJson(res, 400, { message: 'Detalle de pedido requerido.' });
      }
      if (!factura.numero_documento || !factura.codigo_base || !Array.isArray(factura.detalle) || factura.detalle.length === 0) {
        return sendJson(res, 400, { message: 'Detalle de factura requerido.' });
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        const insertPedido = 'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)';
        await runQuery(connection, insertPedido, [codigoPedido, codigoCliente, fechaPedido]);

        const nextPedDetSql = 'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM pedido_detalle WHERE codigo_pedido = ?';
        const [pedOrdRows] = await runQuery(connection, nextPedDetSql, [codigoPedido]);
        let pedOrdinal = pedOrdRows && pedOrdRows[0] ? pedOrdRows[0].next : 1;

        for (const line of pedidoDetalle) {
          const cantidad = Number(line.cantidad || 0);
          const precioTotal = Number(line.precio_total || 0);
          const precioUnitario = cantidad > 0 ? precioTotal / cantidad : 0;
          const insertPedDet = `INSERT INTO pedido_detalle
            (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo, precio_unitario)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
          await runQuery(connection, insertPedDet, [
            codigoPedido,
            pedOrdinal,
            line.codigo_producto,
            cantidad,
            precioTotal,
            cantidad,
            precioUnitario
          ]);
          pedOrdinal += 1;
        }

        let codigoPuntoEntrega = entrega.punto_existente || null;
        if (entrega.modo === 'nuevo') {
          const nextPuntoSql = 'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?';
          const [puntoRows] = await runQuery(connection, nextPuntoSql, [codigoCliente]);
          codigoPuntoEntrega = puntoRows && puntoRows[0] ? puntoRows[0].next : 1;

          const insertPunto = `INSERT INTO puntos_entrega
            (ubigeo, codigo_puntoentrega, codigo_cliente, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          await runQuery(connection, insertPunto, [
            entrega.ubigeo || null,
            codigoPuntoEntrega,
            codigoCliente,
            entrega.direccion_linea || null,
            entrega.referencia || null,
            entrega.nombre || null,
            entrega.dni || null,
            entrega.agencia || null,
            entrega.observaciones || null,
            entrega.region_entrega || null,
            entrega.concatenarpuntoentrega || null
          ]);
        }

        let ordinalNumRecibe = null;
        if (entrega.region_entrega === 'LIMA' && recibe.modo === 'existe' && recibe.existe_id) {
          ordinalNumRecibe = Number(recibe.existe_id);
        }
        if (entrega.region_entrega === 'LIMA' && recibe.modo === 'nuevo') {
          const nextRecibeSql = 'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?';
          const [recibeRows] = await runQuery(connection, nextRecibeSql, [codigoCliente]);
          ordinalNumRecibe = recibeRows && recibeRows[0] ? recibeRows[0].next : 1;

          const insertRecibe = `INSERT INTO numrecibe
            (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe)
            VALUES (?, ?, ?, ?, ?)`;
          await runQuery(connection, insertRecibe, [
            ordinalNumRecibe,
            recibe.numero || null,
            recibe.nombre || null,
            codigoCliente,
            recibe.concatenarnumrecibe || null
          ]);
        }

        const nextMovSql = 'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = ? AND numero_documento = ?';
        const [movRows] = await runQuery(connection, nextMovSql, [factura.tipo_documento, factura.numero_documento]);
        let movOrdinal = movRows && movRows[0] ? movRows[0].next : 1;

        const insertMov = `INSERT INTO mov_contable
          (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base,
           codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await runQuery(connection, insertMov, [
          codigoPedido,
          fechaPedido,
          fechaPedido,
          fechaPedido,
          codigoCliente,
          factura.saldo,
          factura.tipo_documento,
          factura.numero_documento,
          factura.codigo_base,
          codigoCliente,
          ordinalNumRecibe,
          codigoCliente,
          codigoPuntoEntrega
        ]);

        for (const line of factura.detalle) {
          const cantidad = Number(line.cantidad || 0);
          const precioTotal = Number(line.precio_total || 0);
          const insertMovDet = `INSERT INTO mov_contable_detalle
            (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
          await runQuery(connection, insertMovDet, [
            factura.tipo_documento,
            factura.numero_documento,
            movOrdinal,
            line.codigo_producto,
            cantidad,
            cantidad,
            precioTotal
          ]);
          movOrdinal += 1;
        }

        const insertPaquete = 'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)';
        await runQuery(connection, insertPaquete, [factura.numero_documento, factura.tipo_documento, 'pendiente empacar']);

        const nextPaqueteDetSql = 'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = ?';
        const [paqRows] = await runQuery(connection, nextPaqueteDetSql, [factura.numero_documento, factura.tipo_documento]);
        const paqueteOrdinal = paqRows && paqRows[0] ? paqRows[0].next : 1;

        const insertPaqueteDet = 'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)';
        await runQuery(connection, insertPaqueteDet, [factura.numero_documento, factura.tipo_documento, paqueteOrdinal, 'pendiente empacar']);

        const saldoSql = 'CALL actualizarsaldosclientes(?, ?, ?)';
        await runQuery(connection, saldoSql, [codigoCliente, factura.tipo_documento, factura.saldo]);

        const salidaSql = 'CALL salidaspedidos(?, ?)';
        await runQuery(connection, salidaSql, [factura.tipo_documento, factura.numero_documento]);

        await connection.commit();
        connection.release();
        return sendJson(res, 200, { message: 'Factura emitida correctamente.' });
      } catch (error) {
        await connection.rollback();
        connection.release();
        logLine(`ERROR: ${error.message}`);
        return sendJson(res, 500, { message: 'Error al emitir factura.' });
      }
    } catch (error) {
      logLine(`ERROR: ${error.message}`);
      return sendJson(res, 400, { message: 'Payload invalido.' });
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

async function start() {
  ensureLogFile();
  const db = await initDb();
  const server = http.createServer((req, res) => {
    handleRequest(req, res, db);
  });
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    logLine(`SERVER STARTED: http://localhost:${port}`);
  });
}

start().catch((error) => {
  logLine(`FATAL: ${error.message}`);
  process.exit(1);
});
