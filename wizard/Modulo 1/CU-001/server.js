const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU-001';

function timestamp() {
  return new Date().toISOString();
}

function formatFileDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const baseName = `${LOG_PREFIX}-${formatFileDate(new Date())}`;
  let suffix = 1;
  let filePath;
  do {
    const suffixStr = String(suffix).padStart(3, '0');
    filePath = path.join(LOG_DIR, `${baseName}-${suffixStr}.log`);
    suffix += 1;
  } while (fs.existsSync(filePath));
  fs.writeFileSync(filePath, '', 'utf8');
  return filePath;
}

const logFile = ensureLogFile();

function logLine(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function logError(error) {
  logLine('ERROR', error && error.stack ? error.stack : error.message);
}

function parseErpConfig() {
  const configPath = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const nameMatch = raw.match(/name:\s*"?([^"\n]+)"?/);
  const dsnMatch = raw.match(/dsn:\s*"?([^"\n]+)"?/);
  if (!nameMatch || !dsnMatch) {
    throw new Error('No se encontro la configuracion en erp.yml');
  }
  return { name: nameMatch[1].trim(), dsn: dsnMatch[1].trim() };
}

function parseMysqlDsn(dsn) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!match) {
    throw new Error('Formato DSN no valido');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5]
  };
}

const { name, dsn } = parseErpConfig();
const dbConfig = parseMysqlDsn(dsn);
if (dbConfig.database !== name) {
  logLine('INFO', `DB en DSN (${dbConfig.database}) ajustada a ${name} segun erp.yml`);
}
dbConfig.database = name;

logLine('INFO', `Iniciando servidor CU-001 usando DB: ${name}`);

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10
});

async function queryDb(connection, sql, params = []) {
  logLine('SQL', `${sql} | params: ${JSON.stringify(params)}`);
  return connection.query(sql, params);
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
  const contentType =
    ext === '.css' ? 'text/css' :
    ext === '.js' ? 'application/javascript' :
    'text/html';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const route = parsed.pathname;

  logLine('INFO', `ENDPOINT: ${method} ${route}`);

  if (method === 'GET' && route === '/') {
    return sendFile(res, path.join(ROOT_DIR, 'index.html'));
  }

  if (method === 'GET' && (route.endsWith('.css') || route.endsWith('.js'))) {
    return sendFile(res, path.join(ROOT_DIR, route));
  }

  if (method === 'GET' && route === '/api/init') {
    const connection = await pool.getConnection();
    try {
      const [clientesRows] = await queryDb(connection, 'CALL get_clientes()');
      const [productosRows] = await queryDb(connection, 'CALL get_productos()');
      const [basesRows] = await queryDb(connection, 'CALL get_bases()');
      const [pedidoNextRows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      const [docNextRows] = await queryDb(connection, "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'");
      return sendJson(res, 200, {
        clientes: clientesRows[0] || [],
        productos: productosRows[0] || [],
        bases: basesRows[0] || [],
        codigo_pedido: pedidoNextRows[0]?.next || 1,
        numero_documento: docNextRows[0]?.next || 1
      });
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar datos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/puntos-entrega') {
    const cliente = parsed.query.cliente;
    if (!cliente) {
      return sendJson(res, 400, { message: 'Cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_puntos_entrega(?)', [cliente]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener puntos de entrega.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/numrecibe') {
    const cliente = parsed.query.cliente;
    if (!cliente) {
      return sendJson(res, 400, { message: 'Cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_numrecibe(?)', [cliente]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener numrecibe.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/departamentos') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_departamentos()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener departamentos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/provincias') {
    const dep = parsed.query.dep;
    if (!dep) {
      return sendJson(res, 400, { message: 'Departamento requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_provincias(?)', [dep]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener provincias.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/distritos') {
    const dep = parsed.query.dep;
    const prov = parsed.query.prov;
    if (!dep || !prov) {
      return sendJson(res, 400, { message: 'Departamento y provincia requeridos.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_distritos(?, ?)', [dep, prov]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener distritos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'POST' && route === '/api/emitir') {
    let payload;
    try {
      payload = await parseBody(req);
    } catch (error) {
      logError(error);
      return sendJson(res, 400, { message: 'Payload invalido.' });
    }

    const { cliente, fechaP, pedidoItems, facturaItems, factura, entrega, recibe } = payload || {};
    if (!cliente || !fechaP || !Array.isArray(pedidoItems) || !Array.isArray(facturaItems) || !factura || !factura.numero_documento) {
      return sendJson(res, 400, { message: 'Datos incompletos.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [[pedidoNext]] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      const codigoPedido = payload.codigo_pedido || pedidoNext?.next || 1;

      await queryDb(
        connection,
        'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)',
        [codigoPedido, cliente, fechaP]
      );

      const [[ordinalPedidoRow]] = await queryDb(
        connection,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM pedido_detalle WHERE codigo_pedido = ?',
        [codigoPedido]
      );
      let ordinalPedido = ordinalPedidoRow?.next || 1;
      for (const item of pedidoItems) {
        const precioUnitario = item.cantidad > 0 ? item.precio_total / item.cantidad : 0;
        await queryDb(
          connection,
          'INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo, precio_unitario) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [codigoPedido, ordinalPedido, item.codigo_producto, item.cantidad, item.precio_total, item.cantidad, precioUnitario]
        );
        ordinalPedido += 1;
      }

      let codigoPuntoEntrega = entrega?.codigo_puntoentrega || null;
      if (entrega?.modo === 'nuevo') {
        const [[puntoRow]] = await queryDb(
          connection,
          'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
          [cliente]
        );
        codigoPuntoEntrega = puntoRow?.next || 1;
        const ubigeo = `${entrega.dep || ''}${entrega.prov || ''}${entrega.dist || ''}`;
        const concatenar = buildConcatenarPunto(entrega);
        await queryDb(
          connection,
        `INSERT INTO puntos_entrega
          (ubigeo, codigo_puntoentrega, codigo_cliente_puntoentrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ubigeo, codigoPuntoEntrega, cliente, entrega.direccion_linea || '', entrega.referencia || '', entrega.nombre || '', entrega.dni || '', entrega.agencia || '', entrega.observaciones || '', entrega.region || '', concatenar]
        );
      }

      let ordinalNumRecibe = null;
      if (entrega?.region === 'LIMA' && recibe?.modo === 'nuevo') {
        const [[numRow]] = await queryDb(
          connection,
          'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
          [cliente]
        );
        ordinalNumRecibe = numRow?.next || 1;
        const concatenar = buildConcatenarNumRecibe(recibe);
        await queryDb(
          connection,
          'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?)',
          [ordinalNumRecibe, recibe.numero, recibe.nombre, cliente, concatenar]
        );
      }

      if (entrega?.region === 'LIMA' && recibe?.modo === 'existe') {
        ordinalNumRecibe = Number(recibe?.ordinal_numrecibe) || null;
      }

      const saldo = facturaItems.reduce((sum, item) => sum + (Number(item.precio_total) || 0), 0);

      await queryDb(
        connection,
        `INSERT INTO mov_contable
        (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          codigoPedido,
          fechaP,
          fechaP,
          fechaP,
          cliente,
          saldo,
          factura.tipo_documento,
          factura.numero_documento,
          factura.codigo_base,
          cliente,
          ordinalNumRecibe,
          cliente,
          codigoPuntoEntrega
        ]
      );

      const [[ordinalMovRow]] = await queryDb(
        connection,
        'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = ? AND numero_documento = ?',
        [factura.tipo_documento, factura.numero_documento]
      );
      let ordinalMov = ordinalMovRow?.next || 1;
      for (const item of facturaItems) {
        await queryDb(
          connection,
          'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [factura.tipo_documento, factura.numero_documento, ordinalMov, item.codigo_producto, item.cantidad, item.cantidad, item.precio_total]
        );
        ordinalMov += 1;
      }

      await queryDb(
        connection,
        'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
        [factura.numero_documento, factura.tipo_documento, 'pendiente empacar']
      );

      const [[paqueteRow]] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
        [factura.numero_documento]
      );

      await queryDb(
        connection,
        'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
        [factura.numero_documento, factura.tipo_documento, paqueteRow?.next || 1, 'pendiente empacar']
      );

      await queryDb(
        connection,
        'CALL actualizarsaldosclientes(?, ?, ?)',
        [cliente, factura.tipo_documento, saldo]
      );

      await queryDb(
        connection,
        'CALL salidaspedidos(?, ?)',
        [factura.tipo_documento, factura.numero_documento]
      );

      await connection.commit();
      return sendJson(res, 200, { message: 'Factura emitida correctamente.', codigo_pedido: codigoPedido });
    } catch (error) {
      await connection.rollback();
      logError(error);
      return sendJson(res, 500, { message: 'Error al emitir factura.' });
    } finally {
      connection.release();
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function buildConcatenarPunto(entrega) {
  if (entrega.region === 'LIMA') {
    const parts = [entrega.direccion_linea, entrega.dist, entrega.referencia].filter(Boolean);
    return parts.join(' | ');
  }
  const parts = [entrega.nombre, entrega.dni, entrega.agencia, entrega.observaciones].filter(Boolean);
  return parts.join(' | ');
}

function buildConcatenarNumRecibe(recibe) {
  const parts = [recibe.numero, recibe.nombre].filter(Boolean);
  return parts.join(' | ');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logError(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Error interno del servidor.' }));
  });
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
