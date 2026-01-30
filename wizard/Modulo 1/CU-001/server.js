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

async function getSingleValue(sql, params) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await queryDb(connection, sql, params);
    return rows[0] || {};
  } finally {
    connection.release();
  }
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

  if (method === 'GET' && route === '/api/puntos-entrega') {
    const codigoCliente = parsed.query.codigoCliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo de cliente requerido.' });
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

  if (method === 'GET' && route === '/api/departamentos') {
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

  if (method === 'GET' && route === '/api/provincias') {
    const codDep = parsed.query.codDep;
    if (!codDep) {
      return sendJson(res, 400, { message: 'codDep requerido.' });
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

  if (method === 'GET' && route === '/api/distritos') {
    const codDep = parsed.query.codDep;
    const codProv = parsed.query.codProv;
    if (!codDep || !codProv) {
      return sendJson(res, 400, { message: 'codDep y codProv requeridos.' });
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
    const codigoCliente = parsed.query.codigoCliente;
    if (!codigoCliente) {
      return sendJson(res, 400, { message: 'Codigo de cliente requerido.' });
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

  if (method === 'GET' && route === '/api/cuentas') {
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

  if (method === 'GET' && route === '/api/next/pedido') {
    try {
      const result = await getSingleValue('SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos');
      return sendJson(res, 200, result);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener codigo pedido.' });
    }
  }

  if (method === 'GET' && route === '/api/next/factura') {
    try {
      const result = await getSingleValue(
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
      );
      return sendJson(res, 200, result);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener numero de factura.' });
    }
  }

  if (method === 'GET' && route === '/api/next/recibo') {
    try {
      const result = await getSingleValue(
        "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
      );
      return sendJson(res, 200, result);
    } catch (error) {
      logError(error);
      return sendJson(res, 500, { message: 'Error al obtener numero de recibo.' });
    }
  }

  if (method === 'POST' && route === '/api/emitir-factura') {
    const payload = await parseBody(req);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const pedidoNuevo = true;
      const facturaNueva = true;

      if (pedidoNuevo) {
        await queryDb(
          connection,
          'INSERT INTO pedidos (codigo_pedido, codigo_cliente, fecha) VALUES (?, ?, ?)',
          [payload.vcodigo_pedido, payload.vClienteSeleted, payload.vFechaP]
        );
      }

      for (let i = 0; i < payload.vProdPedidos.length; i += 1) {
        const item = payload.vProdPedidos[i];
        const ordinal = pedidoNuevo ? i + 1 : item.vOrdinalPedDetalle;
        await queryDb(
          connection,
          'INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_total, saldo, precio_unitario) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            payload.vcodigo_pedido,
            ordinal,
            item.vProductoCodigo,
            item.vCantidadProducto,
            item.vPrecioTotal,
            item.vCantidadProducto,
            item.vPrecioUnitario
          ]
        );
      }

      let codigoPuntoEntrega = payload.Vcodigo_puntoentrega;
      if (payload.vEntregaNuevo) {
        const [nextRows] = await queryDb(
          connection,
          'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
          [payload.vClienteSeleted]
        );
        codigoPuntoEntrega = nextRows[0]?.next || 1;
        await queryDb(
          connection,
          'INSERT INTO puntos_entrega (ubigeo, codigo_puntoentrega, codigo_cliente, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            payload.Vubigeo,
            codigoPuntoEntrega,
            payload.vClienteSeleted,
            payload.vDireccionLinea,
            payload.vReferencia,
            payload.vNombre,
            payload.vDni,
            payload.vAgencia,
            payload.vObservaciones,
            payload.vRegion_Entrega,
            payload.vConcatenarpuntoentrega
          ]
        );
      }

      let ordinalNumRecibe = payload.vOrdinal_numrecibe;
      if (payload.vRegion_Entrega === 'LIMA' && payload.vRecibeNuevo) {
        const [nextRows] = await queryDb(
          connection,
          'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
          [payload.vClienteSeleted]
        );
        ordinalNumRecibe = nextRows[0]?.next || 1;
        await queryDb(
          connection,
          'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?)',
          [
            ordinalNumRecibe,
            payload.vNumeroRecibe,
            payload.vNombreRecibe,
            payload.vClienteSeleted,
            payload.vConcatenarnumrecibe
          ]
        );
      }

      await queryDb(
        connection,
        'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          payload.vcodigo_pedido,
          payload.vFechaP,
          payload.vFechaP,
          payload.vFechaP,
          payload.vClienteSeleted,
          payload.vProdFactura.reduce((sum, item) => sum + Number(item.vFPrecioTotal || 0), 0),
          'FAC',
          payload.vNumero_documento,
          payload.vCodigo_base,
          payload.vClienteSeleted,
          ordinalNumRecibe,
          payload.vClienteSeleted,
          codigoPuntoEntrega
        ]
      );

      for (let i = 0; i < payload.vProdFactura.length; i += 1) {
        const item = payload.vProdFactura[i];
        const ordinal = facturaNueva ? i + 1 : item.vOrdinalDetMovCont;
        await queryDb(
          connection,
          'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            'FAC',
            payload.vNumero_documento,
            ordinal,
            item.vFProducto,
            item.vFCantidadProducto,
            item.vFCantidadProducto,
            item.vFPrecioTotal
          ]
        );
      }

      await queryDb(
        connection,
        'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
        [payload.vNumero_documento, 'FAC', 'pendiente empacar']
      );

      for (let i = 0; i < payload.vProdFactura.length; i += 1) {
        const ordinal = facturaNueva ? i + 1 : payload.vProdFactura[i].vOrdinal_paquetedetalle;
        await queryDb(
          connection,
          'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
          [payload.vNumero_documento, 'FAC', ordinal, 'pendiente empacar']
        );
      }

      await queryDb(
        connection,
        'CALL actualizarsaldosclientes(?, ?, ?)',
        [payload.vClienteSeleted, 'FAC', payload.vProdFactura.reduce((sum, item) => sum + Number(item.vFPrecioTotal || 0), 0)]
      );

      if (payload.vPagos && payload.vPagos.length > 0) {
        let numeroRecibo = payload.vNumero_documento_pago;
        for (const pago of payload.vPagos) {
          await queryDb(
            connection,
            'INSERT INTO mov_contable (fecha_emision, fecha_vencimiento, fecha_valor, tipo_documento, numero_documento, codigo_cliente, codigo_cuentabancaria, saldo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              payload.vFechaP,
              payload.vFechaP,
              payload.vFechaP,
              'RCP',
              numeroRecibo,
              payload.vClienteSeleted,
              pago.vCuentaBancaria,
              pago.monto
            ]
          );

          await queryDb(
            connection,
            'INSERT INTO mov_operaciones_contables (tipodocumento, numdocumento, fecha, monto, codigo_cuentabancaria, codigo_cuentabancaria_destino, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['RCP', numeroRecibo, payload.vFechaP, pago.monto, pago.vCuentaBancaria, null, 'Recibo cliente']
          );

          await queryDb(
            connection,
            'CALL aplicar_recibo_a_facturas(?, ?, ?, ?)',
            [payload.vClienteSeleted, 'RCP', numeroRecibo, pago.monto]
          );

          await queryDb(
            connection,
            'CALL actualizarsaldosclientes(?, ?, ?)',
            [payload.vClienteSeleted, 'RCP', pago.monto]
          );

          await queryDb(
            connection,
            'CALL aplicar_operacion_bancaria(?, ?)',
            ['RCP', numeroRecibo]
          );

          numeroRecibo += 1;
        }
      }

      await queryDb(
        connection,
        'CALL salidaspedidos(?, ?)',
        ['FAC', payload.vNumero_documento]
      );

      await connection.commit();
      return sendJson(res, 200, { message: 'Factura emitida.' });
    } catch (error) {
      await connection.rollback();
      logError(error);
      return sendJson(res, 500, { message: 'Error al emitir factura.' });
    } finally {
      connection.release();
    }
  }

  sendJson(res, 404, { message: 'Not Found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logError(error);
    sendJson(res, 500, { message: 'Error interno del servidor.' });
  });
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
