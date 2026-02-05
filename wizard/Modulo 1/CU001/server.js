const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3001;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU001';

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
  const apiMatch = raw.match(/api_key:\s*"?([^"\n]+)"?/);
  const latMatch = raw.match(/lat:\s*([\-\d.]+)/);
  const lngMatch = raw.match(/lng:\s*([\-\d.]+)/);
  const zoomMatch = raw.match(/default_zoom:\s*([\-\d.]+)/);
  if (!nameMatch || !dsnMatch) {
    throw new Error('No se encontro la configuracion en erp.yml');
  }
  return {
    name: nameMatch[1].trim(),
    dsn: dsnMatch[1].trim(),
    google_maps: {
      api_key: apiMatch ? apiMatch[1].trim() : '',
      default_center: {
        lat: latMatch ? Number(latMatch[1]) : -12.0464,
        lng: lngMatch ? Number(lngMatch[1]) : -77.0428
      },
      default_zoom: zoomMatch ? Number(zoomMatch[1]) : 12
    }
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

const { name, dsn, google_maps } = parseErpConfig();
const dbConfig = parseMysqlDsn(dsn);
if (dbConfig.database !== name) {
  logLine('INFO', `DB en DSN (${dbConfig.database}) ajustada a ${name} segun erp.yml`);
}
dbConfig.database = name;

logLine('INFO', `Iniciando servidor CU001 usando DB: ${name}`);

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

  if (method === 'GET' && route === '/api/config') {
    return sendJson(res, 200, { google_maps });
  }

  const connection = await pool.getConnection();
  try {
    if (method === 'GET' && route === '/api/clientes') {
      const [rows] = await queryDb(connection, 'CALL get_clientes()');
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/productos') {
      const [rows] = await queryDb(connection, 'CALL get_productos()');
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/puntos-entrega') {
      const cliente = parsed.query.cliente;
      if (!cliente) {
        return sendJson(res, 400, { message: 'Cliente requerido.' });
      }
      const [rows] = await queryDb(connection, 'CALL get_puntos_entrega(?)', [cliente]);
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/numrecibe') {
      const cliente = parsed.query.cliente;
      if (!cliente) {
        return sendJson(res, 400, { message: 'Cliente requerido.' });
      }
      const [rows] = await queryDb(connection, 'CALL get_numrecibe(?)', [cliente]);
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/ubigeo/departamentos') {
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_departamentos()');
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/ubigeo/provincias') {
      const dep = parsed.query.dep;
      if (!dep) {
        return sendJson(res, 400, { message: 'Departamento requerido.' });
      }
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_provincias(?)', [dep]);
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/ubigeo/distritos') {
      const dep = parsed.query.dep;
      const prov = parsed.query.prov;
      if (!dep || !prov) {
        return sendJson(res, 400, { message: 'Departamento y provincia requeridos.' });
      }
      const [rows] = await queryDb(connection, 'CALL get_ubigeo_distritos(?, ?)', [dep, prov]);
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/cuentas') {
      const [rows] = await queryDb(connection, 'CALL get_cuentasbancarias()');
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'GET' && route === '/api/bases') {
      const [rows] = await queryDb(connection, 'CALL get_bases()');
      return sendJson(res, 200, rows[0] || []);
    }

    if (method === 'POST' && route === '/api/bases-candidatas') {
      const body = await parseBody(req);
      const [rows] = await queryDb(connection, 'CALL get_bases_candidatas(?, ?)', [JSON.stringify(body.vProdFactura || []), body.vFechaPedido]);
      let result = Array.isArray(rows) ? rows[0] || [] : [];
      if (Array.isArray(rows)) {
        for (const set of rows) {
          if (Array.isArray(set) && set.length) {
            const sample = set[0];
            if (Object.prototype.hasOwnProperty.call(sample, 'latitud') || Object.prototype.hasOwnProperty.call(sample, 'longitud')) {
              result = set;
              break;
            }
          }
        }
      }
      logLine('INFO', `bases-candidatas result: ${JSON.stringify(result)}`);
      return sendJson(res, 200, result);
    }

    if (method === 'GET' && route === '/api/next/cliente') {
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_cliente), 0) + 1 AS next FROM clientes');
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'GET' && route === '/api/next/pedido') {
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'GET' && route === '/api/next/factura') {
      const [rows] = await queryDb(connection, "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'");
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'GET' && route === '/api/next/numrecibe') {
      const cliente = parsed.query.cliente;
      if (!cliente) {
        return sendJson(res, 400, { message: 'Cliente requerido.' });
      }
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?', [cliente]);
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'GET' && route === '/api/next/puntoentrega') {
      const cliente = parsed.query.cliente;
      if (!cliente) {
        return sendJson(res, 400, { message: 'Cliente requerido.' });
      }
      const [rows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?', [cliente]);
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'GET' && route === '/api/next/recibo') {
      const [rows] = await queryDb(connection, "SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCP'");
      return sendJson(res, 200, rows[0]);
    }

    if (method === 'POST' && route === '/api/distance-matrix') {
      const body = await parseBody(req);
      if (!google_maps.api_key) {
        return sendJson(res, 400, { message: 'API Key no disponible.' });
      }
      if (!body.destinations || !body.destinations.length) {
        return sendJson(res, 200, { etas: [] });
      }
      const origin = `${body.origin.lat},${body.origin.lng}`;
      const destinations = (body.destinations || [])
        .map((b) => `${b.latitud},${b.longitud}`)
        .join('|');
      const query = new URLSearchParams({
        origins: origin,
        destinations,
        mode: 'driving',
        key: google_maps.api_key
      });
      const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${query.toString()}`);
      const data = await response.json();
      if (data.status !== 'OK') {
        return sendJson(res, 400, { message: 'Error en Distance Matrix.' });
      }
      const etas = data.rows[0].elements.map((element, index) => ({
        codigo_base: body.destinations[index].codigo_base,
        duration: element.duration
      }));
      return sendJson(res, 200, { etas });
    }

    if (method === 'POST' && route === '/api/emitir') {
      const body = await parseBody(req);
      await connection.beginTransaction();

      try {
        if (body.cliente?.tipo === 'nuevo') {
          await queryDb(
            connection,
            'INSERT INTO clientes (codigo_cliente, nombre, numero) VALUES (?, ?, ?)',
            [body.cliente.codigo, body.cliente.nombre, body.cliente.numero]
          );
        }

        await queryDb(
          connection,
          'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)',
          [body.pedido.codigo_pedido, body.pedido.codigo_cliente, body.pedido.fecha]
        );

        for (const [index, item] of body.pedido.detalle.entries()) {
          await queryDb(
            connection,
            'INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo) VALUES (?, ?, ?, ?, ?, ?)',
            [
              body.pedido.codigo_pedido,
              index + 1,
              item.vProductoCodigo,
              item.vCantidadProducto,
              item.vPrecioTotal,
              item.vCantidadProducto
            ]
          );
        }

        if (body.entrega?.tipo === 'nuevo') {
          await queryDb(
            connection,
            'INSERT INTO puntos_entrega (ubigeo, codigo_puntoentrega, codigo_cliente_puntoentrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              body.entrega.ubigeo,
              body.entrega.codigo_puntoentrega,
              body.entrega.codigo_cliente,
              body.entrega.direccion_linea,
              body.entrega.referencia,
              body.entrega.nombre,
              body.entrega.dni,
              body.entrega.agencia,
              body.entrega.observaciones,
              body.entrega.region_entrega,
              body.entrega.concatenarpuntoentrega
            ]
          );
        }

        if (body.recibe?.tipo === 'nuevo') {
          await queryDb(
            connection,
            'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?)',
            [
              body.recibe.ordinal_numrecibe,
              body.recibe.numero,
              body.recibe.nombre,
              body.pedido.codigo_cliente,
              body.recibe.concatenarnumrecibe
            ]
          );
        }

        await queryDb(
          connection,
          'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            body.pedido.codigo_pedido,
            body.factura.fecha,
            body.factura.fecha,
            body.factura.fecha,
            body.pedido.codigo_cliente,
            body.factura.saldo,
            body.factura.saldo,
            body.factura.tipo_documento,
            body.factura.numero_documento,
            body.factura.codigo_base,
            body.pedido.codigo_cliente,
            body.recibe?.ordinal_numrecibe || null,
            body.pedido.codigo_cliente,
            body.entrega.codigo_puntoentrega,
            body.factura.costoenvio
          ]
        );

        for (const [index, item] of body.factura.detalle.entries()) {
          await queryDb(
            connection,
            'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              body.factura.tipo_documento,
              body.factura.numero_documento,
              index + 1,
              item.vProductoCodigo,
              item.vFCantidadProducto,
              item.vFCantidadProducto,
              item.vFPrecioTotal
            ]
          );
        }

        await queryDb(
          connection,
          'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
          [body.factura.numero_documento, body.factura.tipo_documento, 'pendiente empacar']
        );

        for (const [index] of body.factura.detalle.entries()) {
          await queryDb(
            connection,
            'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
            [
              body.factura.numero_documento,
              body.factura.tipo_documento,
              index + 1,
              'pendiente empacar'
            ]
          );
        }

        await queryDb(
          connection,
          'CALL actualizarsaldosclientes(?, ?, ?)',
          [body.pedido.codigo_cliente, body.factura.tipo_documento, body.factura.saldo]
        );

        if (Array.isArray(body.pagos) && body.pagos.length) {
          for (const pago of body.pagos) {
            await queryDb(
              connection,
              'INSERT INTO mov_operaciones_contables (tipodocumento, numdocumento, fecha, monto, codigo_cuentabancaria, codigo_cuentabancaria_destino) VALUES (?, ?, ?, ?, ?, NULL)',
              [
                'RCP',
                pago.numdocumento,
                body.factura.fecha,
                pago.monto,
                pago.codigo_cuentabancaria
              ]
            );

            await queryDb(
              connection,
              'CALL aplicar_recibo_a_facturas(?, ?, ?)',
              [body.pedido.codigo_cliente, pago.numdocumento, pago.monto]
            );

            await queryDb(
              connection,
              'CALL actualizarsaldosclientes(?, ?, ?)',
              [body.pedido.codigo_cliente, 'RCP', pago.monto]
            );
          }
        }

        await queryDb(
          connection,
          'CALL salidaspedidos(?, ?)',
          [body.factura.tipo_documento, body.factura.numero_documento]
        );

        await connection.commit();
        return sendJson(res, 200, { message: 'OK' });
      } catch (error) {
        await connection.rollback();
        logError(error);
        return sendJson(res, 500, { message: 'Error al emitir factura.' });
      }
    }

    return sendJson(res, 404, { message: 'Not found.' });
  } catch (error) {
    logError(error);
    return sendJson(res, 500, { message: 'Error interno.' });
  } finally {
    connection.release();
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
