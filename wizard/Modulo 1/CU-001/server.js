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
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
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
  const mapsMatch = raw.match(/api_key:\s*"?([^"\n]+)"?/);
  const latMatch = raw.match(/lat:\s*(-?\d+\.?\d*)/);
  const lngMatch = raw.match(/lng:\s*(-?\d+\.?\d*)/);
  const zoomMatch = raw.match(/default_zoom:\s*(\d+)/);
  if (!nameMatch || !dsnMatch) {
    throw new Error('No se encontro la configuracion en erp.yml');
  }
  return {
    name: nameMatch[1].trim(),
    dsn: dsnMatch[1].trim(),
    mapsKey: mapsMatch ? mapsMatch[1].trim() : '',
    mapCenter: {
      lat: latMatch ? Number(latMatch[1]) : -12.0464,
      lng: lngMatch ? Number(lngMatch[1]) : -77.0428
    },
    mapZoom: zoomMatch ? Number(zoomMatch[1]) : 12
  };
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

const { name, dsn, mapsKey, mapCenter, mapZoom } = parseErpConfig();
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
    const safePath = route.replace(/^\//, '');
    return sendFile(res, path.join(ROOT_DIR, safePath));
  }

  if (method === 'GET' && route === '/api/config') {
    return sendJson(res, 200, {
      googleMapsKey: mapsKey,
      mapCenter,
      mapZoom
    });
  }

  if (method === 'GET' && route === '/api/clientes') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_clientes()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar clientes.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/clientes/next') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_cliente), 0) + 1 AS next FROM clientes');
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular codigo cliente.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/pedidos/next') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular codigo pedido.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/productos') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_productos()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar productos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/facturas/next') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
      );
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular numero de factura.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/puntos-entrega') {
    const codigoCliente = parsed.query.cliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_puntos_entrega(?)', [codigoCliente]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar puntos de entrega.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/puntos-entrega/next') {
    const codigoCliente = parsed.query.cliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(
        connection,
        'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
        [codigoCliente]
      );
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular codigo punto entrega.' });
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
      return sendJson(res, 500, { message: 'Error al cargar departamentos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/provincias') {
    const codDep = parsed.query.cod_dep;
    if (!codDep) {
      return sendJson(res, 400, { message: 'Codigo departamento requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_provincias(?)', [codDep]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar provincias.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/ubigeo/distritos') {
    const codDep = parsed.query.cod_dep;
    const codProv = parsed.query.cod_prov;
    if (!codDep || !codProv) {
      return sendJson(res, 400, { message: 'Codigo departamento y provincia requeridos.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_distritos(?, ?)', [codDep, codProv]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar distritos.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/numrecibe') {
    const codigoCliente = parsed.query.cliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_numrecibe(?)', [codigoCliente]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar numrecibe.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/numrecibe/next') {
    const codigoCliente = parsed.query.cliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo cliente requerido.' });
    }
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(
        connection,
        'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
        [codigoCliente]
      );
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular ordinal numrecibe.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/cuentas-bancarias') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_cuentasbancarias()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar cuentas bancarias.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/recibos/next') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(
        connection,
        "SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCP'"
      );
      return sendJson(res, 200, rows[0]);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al calcular numero de recibo.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'GET' && route === '/api/bases') {
    const connection = await pool.getConnection();
    try {
      const [rows] = await queryDb(connection, 'CALL get_bases()');
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar bases.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'POST' && route === '/api/bases/candidatas') {
    const connection = await pool.getConnection();
    try {
      const body = await parseBody(req);
      const payloadJson = JSON.stringify(body.items || []);
      const fechaPedido = body.fechaPedido;
      const [rows] = await queryDb(connection, 'CALL get_bases_candidatas(?, ?)', [payloadJson, fechaPedido]);
      return sendJson(res, 200, rows[0] || []);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al cargar bases candidatas.' });
    } finally {
      connection.release();
    }
  }

  if (method === 'POST' && route === '/api/emitir-factura') {
    const connection = await pool.getConnection();
    try {
      const body = await parseBody(req);
      await connection.beginTransaction();

      const cliente = body.cliente;
      if (!cliente || !cliente.codigo_cliente) {
        throw new Error('Cliente invalido.');
      }

      if (cliente.modo === 'nuevo') {
        const [existRows] = await queryDb(
          connection,
          'SELECT codigo_cliente FROM clientes WHERE codigo_cliente = ?',
          [cliente.codigo_cliente]
        );
        if ((existRows || []).length === 0) {
          await queryDb(
            connection,
            'INSERT INTO clientes (nombre, numero, codigo_cliente) VALUES (?, ?, ?)',
            [cliente.nombre, cliente.numero, cliente.codigo_cliente]
          );
          await queryDb(
            connection,
            'INSERT INTO saldos_clientes (codigo_cliente, saldo_inicial, saldo_final) VALUES (?, 0, 0)',
            [cliente.codigo_cliente]
          );
        }
      }

      const pedido = body.pedido;
      await queryDb(
        connection,
        'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE codigo_cliente = VALUES(codigo_cliente), fecha = VALUES(fecha)',
        [pedido.codigo_pedido, cliente.codigo_cliente, pedido.fechaP]
      );

      for (const item of pedido.detalle) {
        await queryDb(
          connection,
          'INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo, precio_unitario) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), precio_total = VALUES(precio_total), saldo = VALUES(saldo), precio_unitario = VALUES(precio_unitario)',
          [
            pedido.codigo_pedido,
            item.ordinal,
            item.codigo_producto,
            item.cantidad,
            item.precio_total,
            item.cantidad,
            item.precio_unitario
          ]
        );
      }

      const entrega = body.entrega;
      if (entrega && entrega.modo === 'nuevo') {
        await queryDb(
          connection,
          'INSERT INTO puntos_entrega (codigo_puntoentrega, codigo_cliente_puntoentrega, ubigeo, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE direccion_linea = VALUES(direccion_linea), referencia = VALUES(referencia), nombre = VALUES(nombre), dni = VALUES(dni), agencia = VALUES(agencia), observaciones = VALUES(observaciones), region_entrega = VALUES(region_entrega), concatenarpuntoentrega = VALUES(concatenarpuntoentrega), latitud = VALUES(latitud), longitud = VALUES(longitud)',
          [
            entrega.codigo_puntoentrega,
            cliente.codigo_cliente,
            entrega.ubigeo,
            entrega.direccion_linea,
            entrega.referencia,
            entrega.nombre,
            entrega.dni,
            entrega.agencia,
            entrega.observaciones,
            entrega.region_entrega,
            entrega.concatenarpuntoentrega,
            entrega.latitud || null,
            entrega.longitud || null
          ]
        );
      }

      const recibe = body.recibe;
      if (recibe && recibe.aplica && recibe.modo === 'nuevo') {
        await queryDb(
          connection,
          'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE numero = VALUES(numero), nombre = VALUES(nombre), concatenarnumrecibe = VALUES(concatenarnumrecibe)',
          [
            recibe.ordinal_numrecibe,
            recibe.numero,
            recibe.nombre,
            cliente.codigo_cliente,
            recibe.concatenarnumrecibe
          ]
        );
      }

      const factura = body.factura;
      const codigoClienteNumrecibe = recibe && recibe.aplica ? cliente.codigo_cliente : null;
      const ordinalNumrecibe = recibe && recibe.aplica ? recibe.ordinal_numrecibe : null;
      const codigoClientePunto = entrega ? cliente.codigo_cliente : null;
      const codigoPuntoEntrega = entrega ? entrega.codigo_puntoentrega : null;
      await queryDb(
        connection,
        'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE monto = VALUES(monto), saldo = VALUES(saldo), codigo_base = VALUES(codigo_base), codigo_cliente_numrecibe = VALUES(codigo_cliente_numrecibe), ordinal_numrecibe = VALUES(ordinal_numrecibe), codigo_cliente_puntoentrega = VALUES(codigo_cliente_puntoentrega), codigo_puntoentrega = VALUES(codigo_puntoentrega)',
        [
          pedido.codigo_pedido,
          factura.fechaP,
          factura.fechaP,
          factura.fechaP,
          cliente.codigo_cliente,
          factura.monto,
          factura.saldo,
          factura.tipo_documento,
          factura.numero_documento,
          body.base.codigo_base,
          codigoClienteNumrecibe,
          ordinalNumrecibe,
          codigoClientePunto,
          codigoPuntoEntrega
        ]
      );

      for (const item of factura.detalle) {
        await queryDb(
          connection,
          'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad), saldo = VALUES(saldo), precio_total = VALUES(precio_total)',
          [
            factura.tipo_documento,
            factura.numero_documento,
            item.ordinal,
            item.codigo_producto,
            item.cantidad,
            item.cantidad,
            item.precio_total
          ]
        );
      }

      await queryDb(
        connection,
        'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE estado = VALUES(estado)',
        [factura.numero_documento, factura.tipo_documento, 'pendiente empacar']
      );

      for (const item of factura.detalle) {
        await queryDb(
          connection,
          'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE estado = VALUES(estado)',
          [factura.numero_documento, factura.tipo_documento, item.ordinal, 'pendiente empacar']
        );
      }

      await queryDb(connection, 'CALL actualizarsaldosclientes(?, ?, ?)', [cliente.codigo_cliente, factura.tipo_documento, factura.saldo]);

      if (Array.isArray(body.pagos) && body.pagos.length > 0) {
        for (const pago of body.pagos) {
          await queryDb(
            connection,
            'INSERT INTO mov_operaciones_contables (tipodocumento, numdocumento, fecha, monto, codigo_cuentabancaria, codigo_cuentabancaria_destino, descripcion) VALUES (?, ?, ?, ?, ?, NULL, ?)',
            ['RCP', pago.numdocumento, factura.fechaP, pago.monto, pago.codigo_cuentabancaria, 'Recibo cliente']
          );
          await queryDb(
            connection,
            'CALL aplicar_recibo_a_facturas(?, ?, ?)',
            [cliente.codigo_cliente, pago.numdocumento, pago.monto]
          );
          await queryDb(
            connection,
            'CALL actualizarsaldosclientes(?, ?, ?)',
            [cliente.codigo_cliente, 'RCP', pago.monto]
          );
        }
      }

      await queryDb(connection, 'CALL salidaspedidos(?, ?)', [factura.tipo_documento, factura.numero_documento]);

      await connection.commit();
      return sendJson(res, 200, { message: 'Factura emitida.' });
    } catch (error) {
      await connection.rollback();
      logError(error);
      return sendJson(res, 500, { message: error.message || 'Error al emitir factura.' });
    } finally {
      connection.release();
    }
  }

  res.writeHead(404);
  res.end('Not found');
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logError(error);
    res.writeHead(500);
    res.end('Server error');
  });
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en http://localhost:${PORT}`);
});
