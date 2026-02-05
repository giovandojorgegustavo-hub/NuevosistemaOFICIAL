const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3005;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU005';

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
    database: match[5],
  };
}

const { name, dsn } = parseErpConfig();
const dbConfig = parseMysqlDsn(dsn);
if (dbConfig.database !== name) {
  logLine('INFO', `DB en DSN (${dbConfig.database}) ajustada a ${name} segun erp.yml`);
}
dbConfig.database = name;

logLine('INFO', `Iniciando servidor CU005 usando DB: ${name}`);

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

async function queryDb(connection, sql, params = []) {
  logLine('SQL', `${sql} | params: ${JSON.stringify(params)}`);
  return connection.query(sql, params);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
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

  try {
    if (method === 'GET' && route === '/') {
      return sendFile(res, path.join(ROOT_DIR, 'index.html'));
    }

    if (method === 'GET' && (route.endsWith('.css') || route.endsWith('.js'))) {
      const safePath = route.replace(/^\//, '');
      return sendFile(res, path.join(ROOT_DIR, safePath));
    }

    if (method === 'GET' && route === '/api/pedidos-pendientes') {
      const connection = await pool.getConnection();
      try {
        const [rows] = await queryDb(connection, 'CALL get_pedidospendientes()');
        return sendJson(res, 200, rows[0] || []);
      } catch (error) {
        logError(error);
        return sendJson(res, 500, { message: 'Error al cargar pedidos.' });
      } finally {
        connection.release();
      }
    }

    if (method === 'GET' && route === '/api/pedido-detalle') {
      const codigoPedido = parsed.query.codigo_pedido;
      if (!codigoPedido) {
        return sendJson(res, 400, { message: 'codigo_pedido requerido.' });
      }
      const connection = await pool.getConnection();
      try {
        const [rows] = await queryDb(connection, 'CALL get_pedido_detalle_por_pedido(?)', [codigoPedido]);
        return sendJson(res, 200, rows[0] || []);
      } catch (error) {
        logError(error);
        return sendJson(res, 500, { message: 'Error al cargar detalle.' });
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

    if (method === 'GET' && route === '/api/puntos-entrega') {
      const codigoCliente = parsed.query.codigo_cliente;
      if (!codigoCliente) {
        return sendJson(res, 400, { message: 'codigo_cliente requerido.' });
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
        return sendJson(res, 400, { message: 'cod_dep requerido.' });
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
        return sendJson(res, 400, { message: 'cod_dep y cod_prov requeridos.' });
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
      const codigoCliente = parsed.query.codigo_cliente;
      if (!codigoCliente) {
        return sendJson(res, 400, { message: 'codigo_cliente requerido.' });
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

    if (method === 'GET' && route === '/api/cuentas-bancarias') {
      const connection = await pool.getConnection();
      try {
        const [rows] = await queryDb(connection, 'CALL get_cuentasbancarias()');
        return sendJson(res, 200, rows[0] || []);
      } catch (error) {
        logError(error);
        return sendJson(res, 500, { message: 'Error al cargar cuentas.' });
      } finally {
        connection.release();
      }
    }

    if (method === 'GET' && route === '/api/next-factura') {
      const connection = await pool.getConnection();
      try {
        const [rows] = await queryDb(
          connection,
          "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
        );
        return sendJson(res, 200, rows[0] || { next: 1 });
      } catch (error) {
        logError(error);
        return sendJson(res, 500, { message: 'Error al obtener numero de factura.' });
      } finally {
        connection.release();
      }
    }

    if (method === 'GET' && route === '/api/next-recibo') {
      const connection = await pool.getConnection();
      try {
        const [rows] = await queryDb(
          connection,
          "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
        );
        return sendJson(res, 200, rows[0] || { next: 1 });
      } catch (error) {
        logError(error);
        return sendJson(res, 500, { message: 'Error al obtener numero de recibo.' });
      } finally {
        connection.release();
      }
    }

    if (method === 'POST' && route === '/api/emitir-factura') {
      const body = await parseBody(req);
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const pedido = body.pedido || {};
        const factura = body.factura || {};
        const entrega = body.entrega || {};
        const recibe = body.recibe || {};
        const pago = body.pago || {};

        if (!pedido.vcodigo_pedido || !pedido.vcodigo_cliente) {
          throw new Error('Pedido no valido.');
        }

        let numeroFactura = factura.vNumero_documento;
        if (factura.esNueva && !numeroFactura) {
          const [rows] = await queryDb(
            connection,
            "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'"
          );
          numeroFactura = rows[0]?.next;
        }

        let codigoPuntoEntrega = entrega.vCodigo_puntoentrega;
        if (entrega.modo === 'nuevo') {
          const [rows] = await queryDb(
            connection,
            'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
            [pedido.vcodigo_cliente]
          );
          codigoPuntoEntrega = rows[0]?.next;

          await queryDb(
            connection,
            'INSERT INTO puntos_entrega (ubigeo, codigo_puntoentrega, codigo_cliente, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega, codigo_cliente_puntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              `${entrega.vCod_Dep || ''}${entrega.vCod_Prov || ''}${entrega.vCod_Dist || ''}`,
              codigoPuntoEntrega,
              pedido.vcodigo_cliente,
              entrega.Vdireccion_linea || null,
              entrega.Vreferencia || null,
              entrega.Vnombre || null,
              entrega.Vdni || null,
              entrega.Vagencia || null,
              entrega.Vobservaciones || null,
              entrega.vRegion_Entrega,
              entrega.Vconcatenarpuntoentrega,
              pedido.vcodigo_cliente,
            ]
          );
        }

        let ordinalNumrecibe = recibe.Vordinal_numrecibe;
        if (recibe.modo === 'nuevo' && entrega.vRegion_Entrega === 'LIMA') {
          const [rows] = await queryDb(
            connection,
            'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
            [pedido.vcodigo_cliente]
          );
          ordinalNumrecibe = rows[0]?.next;
          await queryDb(
            connection,
            'INSERT INTO numrecibe (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe) VALUES (?, ?, ?, ?, ?)',
            [
              ordinalNumrecibe,
              recibe.vNumeroRecibe,
              recibe.vNombreRecibe,
              pedido.vcodigo_cliente,
              recibe.Vconcatenarnumrecibe || `${recibe.vNumeroRecibe} | ${recibe.vNombreRecibe}`,
            ]
          );
        }

        await queryDb(
          connection,
          'INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            pedido.vcodigo_pedido,
            factura.vFechaP,
            factura.vFechaP,
            factura.vFechaP,
            pedido.vcodigo_cliente,
            factura.vFsaldo,
            'FAC',
            numeroFactura,
            factura.vCodigo_base,
            pedido.vcodigo_cliente,
            ordinalNumrecibe || null,
            pedido.vcodigo_cliente,
            codigoPuntoEntrega || null,
          ]
        );

        let ordinalBase = 0;
        if (!factura.esNueva) {
          const [rows] = await queryDb(
            connection,
            'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = ? AND numero_documento = ?',
            ['FAC', numeroFactura]
          );
          ordinalBase = rows[0]?.next - 1;
        }

        const detalle = factura.detalle || [];
        for (let i = 0; i < detalle.length; i += 1) {
          const item = detalle[i];
          const ordinal = factura.esNueva ? i + 1 : ordinalBase + i + 1;
          await queryDb(
            connection,
            'INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              'FAC',
              numeroFactura,
              ordinal,
              item.vcodigo_producto,
              item.vFCantidadProducto,
              item.vFCantidadProducto,
              item.vFPrecioTotal,
            ]
          );
        }

        await queryDb(
          connection,
          'INSERT INTO paquete (codigo_paquete, tipo_documento, estado) VALUES (?, ?, ?)',
          [numeroFactura, 'FAC', 'pendiente empacar']
        );

        let ordinalPaqueteBase = 0;
        if (!factura.esNueva) {
          const [rows] = await queryDb(
            connection,
            'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = ?',
            [numeroFactura, 'FAC']
          );
          ordinalPaqueteBase = rows[0]?.next - 1;
        }

        for (let i = 0; i < detalle.length; i += 1) {
          const ordinalPaquete = factura.esNueva ? i + 1 : ordinalPaqueteBase + i + 1;
          await queryDb(
            connection,
            'INSERT INTO paquetedetalle (codigo_paquete, tipo_documento, ordinal, estado) VALUES (?, ?, ?, ?)',
            [numeroFactura, 'FAC', ordinalPaquete, 'pendiente empacar']
          );
        }

        await queryDb(
          connection,
          'CALL actualizarsaldosclientes(?, ?, ?)',
          [pedido.vcodigo_cliente, 'FAC', factura.vFsaldo]
        );

        if (pago.vMontoPago && Number(pago.vMontoPago) > 0) {
          let numeroPago = pago.vNumero_documento_pago;
          if (!numeroPago) {
            const [rows] = await queryDb(
              connection,
              "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'"
            );
            numeroPago = rows[0]?.next;
          }

          await queryDb(
            connection,
            'INSERT INTO mov_contable (fecha_emision, fecha_vencimiento, fecha_valor, tipo_documento, numero_documento, codigo_cliente, codigo_cuentabancaria, saldo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              factura.vFechaP,
              factura.vFechaP,
              factura.vFechaP,
              'RCP',
              numeroPago,
              pedido.vcodigo_cliente,
              pago.vCuentaBancaria || null,
              pago.vMontoPago,
            ]
          );

          await queryDb(
            connection,
            'INSERT INTO mov_operaciones_contables (tipodocumento, numdocumento, fecha, monto, codigo_cuentabancaria, codigo_cuentabancaria_destino, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              'RCP',
              numeroPago,
              factura.vFechaP,
              pago.vMontoPago,
              pago.vCuentaBancaria || null,
              null,
              'Recibo cliente',
            ]
          );

          await queryDb(
            connection,
            'CALL aplicar_recibo_a_facturas(?, ?, ?)',
            [pedido.vcodigo_cliente, numeroPago, pago.vMontoPago]
          );

          await queryDb(
            connection,
            'CALL actualizarsaldosclientes(?, ?, ?)',
            [pedido.vcodigo_cliente, 'RCP', pago.vMontoPago]
          );

          await queryDb(
            connection,
            'CALL aplicar_operacion_bancaria(?, ?)',
            ['RCP', numeroPago]
          );
        }

        await queryDb(
          connection,
          'CALL salidaspedidos(?, ?)',
          ['FAC', numeroFactura]
        );

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

    return sendJson(res, 404, { message: 'Ruta no encontrada.' });
  } catch (error) {
    logError(error);
    return sendJson(res, 500, { message: 'Error interno.' });
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
