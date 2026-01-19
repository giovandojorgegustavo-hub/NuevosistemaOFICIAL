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
  connectionLimit: 5,
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
    '.json': 'application/json',
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

function round2(value) {
  return Number(Number(value).toFixed(2));
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

    if (pathname === '/api/clientes') {
      const [rows] = await execQuery(pool, 'CALL get_clientes()');
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/productos') {
      const [rows] = await execQuery(pool, 'CALL get_productos()');
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/bases') {
      const [rows] = await execQuery(pool, 'CALL get_bases()');
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/puntos-entrega') {
      const codigoCliente = query.cliente;
      if (!codigoCliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_puntos_entrega(?)', [codigoCliente]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/numrecibe' && req.method === 'GET') {
      const codigoCliente = query.cliente;
      if (!codigoCliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_numrecibe(?)', [codigoCliente]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/numrecibe' && req.method === 'POST') {
      const body = await parseBody(req);
      const codigoCliente = body.codigo_cliente;
      const numero = body.numero;
      const nombre = body.nombre;
      if (!codigoCliente || !numero || !nombre) {
        sendJson(res, 400, { error: 'Datos incompletos' });
        return;
      }
      const conn = await pool.getConnection();
      try {
        const [rows] = await execQuery(
          conn,
          'SELECT IFNULL(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
          [codigoCliente]
        );
        const ordinal = rows[0]?.next || 1;
        await execQuery(
          conn,
          `INSERT INTO numrecibe (numero, nombre, ordinal_numrecibe, codigo_cliente_numrecibe)
           VALUES (?, ?, ?, ?)`,
          [numero, nombre, ordinal, codigoCliente]
        );
        sendJson(res, 200, {
          codigo_cliente_numrecibe: codigoCliente,
          ordinal_numrecibe: ordinal,
          numero,
          nombre,
        });
      } finally {
        conn.release();
      }
      return;
    }

    if (pathname === '/api/ubigeo/departamentos') {
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_departamentos()');
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/ubigeo/provincias') {
      const codDep = query.cod_dep;
      if (!codDep) {
        sendJson(res, 400, { error: 'Departamento requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_provincias(?)', [codDep]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/ubigeo/distritos') {
      const codDep = query.cod_dep;
      const codProv = query.cod_prov;
      if (!codDep || !codProv) {
        sendJson(res, 400, { error: 'Departamento y provincia requeridos' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_distritos(?, ?)', [codDep, codProv]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/logs/latest') {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      sendJson(res, 200, { file: path.basename(LOG_FILE), content });
      return;
    }

    if (pathname === '/api/pedido/emitir' && req.method === 'POST') {
      const body = await parseBody(req);
      const response = await emitirFactura(body);
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 404, { error: 'Endpoint no encontrado' });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    sendJson(res, 500, { error: error.message });
  }
}

function parseRecibe(recibe) {
  if (!recibe) return { codigo: null, ordinal: null };
  const parts = String(recibe).split('|');
  if (parts.length !== 2) return { codigo: null, ordinal: null };
  return { codigo: parts[0], ordinal: parts[1] };
}

async function emitirFactura(payload) {
  const codigoCliente = payload.codigo_cliente;
  const pedidoDetalle = Array.isArray(payload.pedido_detalle) ? payload.pedido_detalle : [];
  const facturaDetalle = Array.isArray(payload.factura_detalle) ? payload.factura_detalle : [];
  const codigoBase = payload.codigo_base;
  const fechaPedido = payload.fecha_pedido;
  const horaPedido = payload.hora_pedido;
  const fechaEmision = payload.fecha_emision;
  const entrega = payload.entrega || {};
  const tipoDocumento = payload.tipo_documento || 'F';

  if (!codigoCliente || !codigoBase || !fechaPedido || !horaPedido || !fechaEmision) {
    throw new Error('Datos principales incompletos');
  }

  if (pedidoDetalle.length === 0 || facturaDetalle.length === 0) {
    throw new Error('Detalle de pedido o factura incompleto');
  }

  if (!entrega.modo) {
    throw new Error('Datos de entrega incompletos');
  }

  const pedidoMap = new Map();
  pedidoDetalle.forEach((row) => {
    const key = String(row.codigo_producto);
    const qty = Number(row.cantidad) || 0;
    const total = Number(row.precio_total) || 0;
    if (!row.codigo_producto || qty <= 0 || total <= 0) {
      throw new Error('Detalle de pedido invalido');
    }
    if (!pedidoMap.has(key)) {
      pedidoMap.set(key, { qty: 0, total: 0 });
    }
    const entry = pedidoMap.get(key);
    entry.qty += qty;
    entry.total += total;
  });

  const facturaMap = new Map();
  facturaDetalle.forEach((row) => {
    const key = String(row.codigo_producto);
    const qty = Number(row.cantidad) || 0;
    if (!row.codigo_producto || qty <= 0) {
      throw new Error('Detalle de factura invalido');
    }
    if (!pedidoMap.has(key)) {
      throw new Error('Producto facturado no corresponde al pedido');
    }
    facturaMap.set(key, (facturaMap.get(key) || 0) + qty);
  });

  for (const [key, qty] of facturaMap.entries()) {
    const maxQty = pedidoMap.get(key).qty;
    if (qty > maxQty) {
      throw new Error('Cantidad facturada excede la del pedido');
    }
  }

  let entregaUbigeo = entrega.ubigeo;
  let codigoPuntoEntrega = entrega.codigo_puntoentrega || null;
  let regionEntrega = entrega.region;

  if (entrega.modo === 'existente') {
    if (!entregaUbigeo || !codigoPuntoEntrega) {
      throw new Error('Punto de entrega requerido');
    }
  } else {
    if (!entregaUbigeo || !regionEntrega) {
      throw new Error('Ubigeo o region de entrega incompletos');
    }
    if (!entrega.direccion || !entrega.referencia) {
      throw new Error('Direccion y referencia requeridas');
    }
    if (regionEntrega === 'LIMA') {
      if (!entrega.destinatario_nombre || !entrega.destinatario_dni) {
        throw new Error('Destinatario requerido para LIMA');
      }
    }
    if (regionEntrega === 'PROV') {
      if (!entrega.agencia) {
        throw new Error('Agencia requerida para PROV');
      }
    }
  }

  const recibe = parseRecibe(payload.recibe);
  if (regionEntrega === 'LIMA' && (!recibe.codigo || !recibe.ordinal)) {
    throw new Error('Numrecibe requerido para LIMA');
  }

  const conn = await pool.getConnection();
  try {
    await execQuery(conn, 'START TRANSACTION');
    const [pedidoRows] = await execQuery(conn, 'SELECT IFNULL(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
    const codigoPedido = pedidoRows[0]?.next || 1;

    const fechaPedidoCompleta = `${fechaPedido} ${horaPedido}:00`;
    await execQuery(
      conn,
      `INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha)
       VALUES (?, ?, ?)`,
      [codigoPedido, codigoCliente, fechaPedidoCompleta]
    );

    for (let i = 0; i < pedidoDetalle.length; i += 1) {
      const item = pedidoDetalle[i];
      const cantidad = Number(item.cantidad) || 0;
      const precioTotal = Number(item.precio_total) || 0;
      const precioUnitario = cantidad > 0 ? round2(precioTotal / cantidad) : 0;
      await execQuery(
        conn,
        `INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_unitario, precio_total, saldo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigoPedido, i + 1, item.codigo_producto, cantidad, precioUnitario, round2(precioTotal), cantidad]
      );
    }

    if (entrega.modo === 'nuevo') {
      const [puntoRows] = await execQuery(
        conn,
        'SELECT IFNULL(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE ubigeo = ?',
        [entregaUbigeo]
      );
      codigoPuntoEntrega = puntoRows[0]?.next || 1;
      await execQuery(
        conn,
        `INSERT INTO puntos_entrega
          (codigo_puntoentrega, codigo_cliente, ubigeo, region_entrega, direccion_linea, referencia, destinatario_nombre, destinatario_dni, agencia)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoPuntoEntrega,
          codigoCliente,
          entregaUbigeo,
          regionEntrega,
          entrega.direccion,
          entrega.referencia,
          entrega.destinatario_nombre || null,
          entrega.destinatario_dni || null,
          entrega.agencia || null,
        ]
      );
    }

    const [docRows] = await execQuery(
      conn,
      'SELECT IFNULL(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?',
      [tipoDocumento]
    );
    const numeroDocumento = docRows[0]?.next || 1;

    let saldoTotal = 0;
    const facturaCalculada = facturaDetalle.map((row) => {
      const key = String(row.codigo_producto);
      const qty = Number(row.cantidad) || 0;
      const pedidoInfo = pedidoMap.get(key);
      const unitPrice = pedidoInfo.qty > 0 ? pedidoInfo.total / pedidoInfo.qty : 0;
      const precioTotal = round2(unitPrice * qty);
      saldoTotal += precioTotal;
      return {
        codigo_producto: row.codigo_producto,
        cantidad: qty,
        precio_total: precioTotal,
      };
    });

    await execQuery(
      conn,
      `INSERT INTO mov_contable
        (codigo_pedido, fecha_emision, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, ubigeo, codigo_puntoentrega)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigoPedido,
        `${fechaEmision} 00:00:00`,
        codigoCliente,
        round2(saldoTotal),
        tipoDocumento,
        numeroDocumento,
        codigoBase,
        recibe.codigo,
        recibe.ordinal,
        entregaUbigeo,
        codigoPuntoEntrega,
      ]
    );

    for (let i = 0; i < facturaCalculada.length; i += 1) {
      const item = facturaCalculada[i];
      await execQuery(
        conn,
        `INSERT INTO mov_contable_detalle
          (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total, monto_linea)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tipoDocumento, numeroDocumento, i + 1, item.codigo_producto, item.cantidad, item.cantidad, item.precio_total, item.precio_total]
      );
    }

    await execQuery(conn, 'CALL salidaspedidos(?, ?)', [tipoDocumento, numeroDocumento]);

    await execQuery(
      conn,
      `INSERT INTO paquete (codigo_paquete, estado, fecha_registro, fecha_actualizado)
       VALUES (?, 'pendiente empacar', NOW(), NOW())`,
      [numeroDocumento]
    );

    for (let i = 0; i < facturaCalculada.length; i += 1) {
      await execQuery(
        conn,
        `INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, fecha_registro)
         VALUES (?, ?, 'pendiente empacar', NOW())`,
        [numeroDocumento, i + 1]
      );
    }

    await execQuery(conn, 'COMMIT');
    return { codigo_pedido: codigoPedido, numero_documento: numeroDocumento, saldo: round2(saldoTotal) };
  } catch (error) {
    await execQuery(conn, 'ROLLBACK');
    logLine(`ERROR: ${error.message}`);
    throw error;
  } finally {
    conn.release();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    await handleApi(req, res);
    return;
  }

  const filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
  serveStatic(res, path.join(BASE_DIR, filePath));
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  logLine(`Servidor iniciado en http://localhost:${PORT}`);
});
