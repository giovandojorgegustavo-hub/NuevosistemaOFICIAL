const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const BASE_DIR = __dirname;
const ROOT_DIR = path.resolve(BASE_DIR, '..', '..');
const ERP_CONFIG_PATH = path.join(ROOT_DIR, 'erp.yml');
const LOG_DIR = path.join(BASE_DIR, 'logs');

function timestamp() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLogFilePath() {
  ensureDir(LOG_DIR);
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .replace(/\..+/, '');
  let counter = 1;
  let filePath;
  do {
    const suffix = String(counter).padStart(3, '0');
    filePath = path.join(LOG_DIR, `CU-001-${stamp}-${suffix}.log`);
    counter += 1;
  } while (fs.existsSync(filePath));
  return filePath;
}

const LOG_FILE = getLogFilePath();

function logLine(message) {
  const line = `[${timestamp()}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, `${line}\n`);
}

function parseErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  const dsnMatch = content.match(/dsn:\s*"([^"]+)"/);
  const nameMatch = content.match(/name:\s*"([^"]+)"/);
  if (!dsnMatch || !nameMatch) {
    throw new Error('No se encontro configuracion dsn/name en erp.yml');
  }
  return { dsn: dsnMatch[1], name: nameMatch[1] };
}

function parseDsn(dsn) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('DSN invalido');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5],
  };
}

const { dsn, name } = parseErpConfig();
const dbConfig = parseDsn(dsn);
if (dbConfig.database !== name) {
  dbConfig.database = name;
}

const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 6,
  decimalNumbers: true,
});

async function execQuery(conn, sql, params = []) {
  logLine(`SQL: ${sql} | params: ${JSON.stringify(params)}`);
  return conn.query(sql, params);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2e6) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getSystemTime() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  return { date, time };
}

function buildConcat(parts) {
  return parts.filter((part) => part && part.trim()).join(' | ');
}

async function handleEmitFactura(payload) {
  const pedido = payload.pedido || {};
  const pedidoDetalles = payload.pedido_detalles || [];
  const factura = payload.factura || {};
  const facturaDetalles = payload.factura_detalles || [];
  const entrega = payload.entrega || {};
  const recibe = payload.recibe || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pedidoRows] = await execQuery(conn, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
    const codigoPedido = pedidoRows[0].next;

    await execQuery(conn, 'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)', [
      codigoPedido,
      pedido.codigo_cliente,
      pedido.fecha,
    ]);

    const [pedidoOrdRows] = await execQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM pedido_detalle'
    );
    let pedidoOrdinal = pedidoOrdRows[0].next;

    for (const item of pedidoDetalles) {
      const precioUnitario = item.precio_unitario || (item.cantidad ? item.precio_total / item.cantidad : 0);
      await execQuery(
        conn,
        `INSERT INTO pedido_detalle
          (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo, precio_unitario)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoPedido,
          pedidoOrdinal,
          item.codigo_producto,
          item.cantidad,
          item.precio_total,
          item.cantidad,
          precioUnitario,
        ]
      );
      pedidoOrdinal += 1;
    }

    let codigoPuntoEntrega = entrega.codigo_puntoentrega || null;
    let regionEntrega = entrega.region_entrega || 'PROV';
    let ubigeo = null;
    let concatenarPunto = null;

    if (entrega.mode === 'nuevo') {
      const dep = entrega.dep || '';
      const prov = entrega.prov || '';
      const dist = entrega.dist || '';
      ubigeo = `${dep}${prov}${dist}`;
      regionEntrega = dep === '15' && prov === '01' ? 'LIMA' : 'PROV';

      const [puntoRows] = await execQuery(
        conn,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [pedido.codigo_cliente]
      );
      codigoPuntoEntrega = puntoRows[0].next;

      concatenarPunto =
        regionEntrega === 'LIMA'
          ? buildConcat([entrega.direccion_linea, entrega.dist_label, entrega.referencia])
          : buildConcat([entrega.nombre, entrega.dni, entrega.agencia, entrega.observaciones]);

      await execQuery(
        conn,
        `INSERT INTO puntos_entrega
          (ubigeo, codigo_puntoentrega, codigo_cliente_puntoentrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ubigeo,
          codigoPuntoEntrega,
          pedido.codigo_cliente,
          entrega.direccion_linea || null,
          entrega.referencia || null,
          entrega.nombre || null,
          entrega.dni || null,
          entrega.agencia || null,
          entrega.observaciones || null,
          regionEntrega,
          concatenarPunto,
        ]
      );
    }

    let codigoClienteNumrecibe = recibe.codigo_cliente_numrecibe || null;
    let ordinalNumrecibe = null;
    if (regionEntrega === 'LIMA' && recibe.mode === 'nuevo') {
      const [recibeRows] = await execQuery(
        conn,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [pedido.codigo_cliente]
      );
      ordinalNumrecibe = recibeRows[0].next;
      codigoClienteNumrecibe = pedido.codigo_cliente;
      const concatenarNumrecibe = buildConcat([recibe.numero, recibe.nombre]);
      await execQuery(
        conn,
        `INSERT INTO numrecibe
          (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe)
         VALUES (?, ?, ?, ?, ?)`,
        [ordinalNumrecibe, recibe.numero, recibe.nombre, codigoClienteNumrecibe, concatenarNumrecibe]
      );
    }

    const [docRows] = await execQuery(
      conn,
      'SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?',
      ['FAC']
    );
    const numeroDocumento = docRows[0].next;

    await execQuery(
      conn,
      `INSERT INTO mov_contable
        (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento,
         numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoPedido,
        pedido.fecha,
        pedido.fecha,
        pedido.fecha,
        pedido.codigo_cliente,
        factura.saldo,
        'FAC',
        numeroDocumento,
        factura.codigo_base,
        codigoClienteNumrecibe,
        ordinalNumrecibe,
        pedido.codigo_cliente,
        codigoPuntoEntrega,
      ]
    );

    const [movOrdRows] = await execQuery(
      conn,
      'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle'
    );
    let movOrdinal = movOrdRows[0].next;

    for (const item of facturaDetalles) {
      await execQuery(
        conn,
        `INSERT INTO mov_contable_detalle
          (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'FAC',
          numeroDocumento,
          movOrdinal,
          item.codigo_producto,
          item.cantidad_factura,
          item.cantidad_factura,
          item.precio_total_factura,
        ]
      );
      movOrdinal += 1;
    }

    await execQuery(conn, 'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)', [
      numeroDocumento,
      'FAC',
      'pendiente empacar',
    ]);

    const [paqOrdRows] = await execQuery(
      conn,
      "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [numeroDocumento]
    );
    let paqueteOrdinal = paqOrdRows[0].next;

    for (const _item of facturaDetalles) {
      await execQuery(
        conn,
        'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
        [numeroDocumento, 'FAC', paqueteOrdinal, 'pendiente empacar']
      );
      paqueteOrdinal += 1;
    }

    await execQuery(conn, 'CALL actualizarsaldosclientes(?, ?, ?)', [
      pedido.codigo_cliente,
      'FAC',
      factura.saldo,
    ]);

    await execQuery(conn, 'CALL salidaspedidos(?, ?)', ['FAC', numeroDocumento]);

    await conn.commit();
    return { ok: true, numero_documento: numeroDocumento };
  } catch (error) {
    await conn.rollback();
    logLine(`ERROR: ${error.stack || error.message}`);
    throw error;
  } finally {
    conn.release();
  }
}

async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  logLine(`Endpoint: ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/system-time') {
      sendJson(res, 200, getSystemTime());
      return;
    }

    if (pathname === '/api/clientes') {
      const [rows] = await execQuery(pool, 'CALL get_clientes()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/productos') {
      const [rows] = await execQuery(pool, 'CALL get_productos()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/bases') {
      const [rows] = await execQuery(pool, 'CALL get_bases()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/pedido/next-codigo') {
      const [rows] = await execQuery(pool, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/pedido-detalle/next-ordinal') {
      const [rows] = await execQuery(pool, 'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM pedido_detalle');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/mov-contable/next-numero') {
      const [rows] = await execQuery(
        pool,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
      );
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/mov-contable-det/next-ordinal') {
      const [rows] = await execQuery(pool, 'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/puntos-entrega') {
      const cliente = query.cliente;
      if (!cliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_puntos_entrega(?)', [cliente]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/puntos-entrega/next-codigo') {
      const cliente = query.cliente;
      if (!cliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [cliente]
      );
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/ubigeo/departamentos') {
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_departamentos()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/ubigeo/provincias') {
      const dep = query.dep;
      if (!dep) {
        sendJson(res, 400, { error: 'Departamento requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_provincias(?)', [dep]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/ubigeo/distritos') {
      const dep = query.dep;
      const prov = query.prov;
      if (!dep || !prov) {
        sendJson(res, 400, { error: 'Parametros incompletos' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_distritos(?, ?)', [dep, prov]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/numrecibe') {
      const cliente = query.cliente;
      if (!cliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_numrecibe(?)', [cliente]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/numrecibe/next-ordinal') {
      const cliente = query.cliente;
      if (!cliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [cliente]
      );
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/paquetedetalle/next-ordinal') {
      const numero = query.numero;
      if (!numero) {
        sendJson(res, 400, { error: 'Numero requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [numero]
      );
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/emitir-factura' && req.method === 'POST') {
      const payload = await parseBody(req);
      const result = await handleEmitFactura(payload);
      sendJson(res, 200, result);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    logLine(`ERROR: ${error.stack || error.message}`);
    sendJson(res, 500, { error: 'Error interno' });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
    serveStatic(res, path.join(BASE_DIR, 'index.html'));
    return;
  }
  serveStatic(res, path.join(BASE_DIR, parsedUrl.pathname));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logLine(`Servidor iniciado en puerto ${PORT}`);
});
