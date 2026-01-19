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
    filePath = path.join(LOG_DIR, `CU-006-${stamp}-${suffix}.log`);
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

async function getPedidosPendientes(cliente, fecha) {
  const [rows] = await execQuery(pool, 'CALL get_pedidospendientes()');
  let pedidos = rows[0] || rows;
  if (cliente) {
    const filter = cliente.toLowerCase();
    pedidos = pedidos.filter((pedido) => {
      return (
        String(pedido.codigo_cliente || '').toLowerCase().includes(filter) ||
        String(pedido.nombre_cliente || '').toLowerCase().includes(filter)
      );
    });
  }
  if (fecha) {
    pedidos = pedidos.filter((pedido) => {
      const value = pedido.fecha_pedido instanceof Date ? pedido.fecha_pedido.toISOString().slice(0, 10) : pedido.fecha_pedido;
      return String(value || '').startsWith(fecha);
    });
  }
  if (!pedidos.length) return [];
  const codes = pedidos.map((pedido) => pedido.codigo_pedido);
  const [saldoRows] = await execQuery(
    pool,
    'SELECT codigo_pedido FROM pedido_detalle WHERE saldo > 0 AND codigo_pedido IN (?) GROUP BY codigo_pedido',
    [codes]
  );
  const saldoSet = new Set(saldoRows.map((row) => row.codigo_pedido));
  return pedidos.filter((pedido) => saldoSet.has(pedido.codigo_pedido));
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

    if (pathname === '/api/pedidos') {
      const cliente = (query.cliente || '').trim();
      const fecha = (query.fecha || '').trim();
      const pedidos = await getPedidosPendientes(cliente, fecha);
      sendJson(res, 200, pedidos);
      return;
    }

    if (pathname === '/api/pedidos/detalle') {
      const codigo = query.codigo;
      if (!codigo) {
        sendJson(res, 400, { error: 'Codigo requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        `SELECT pd.codigo_producto,
                p.nombre AS descripcion,
                pd.cantidad,
                pd.precio_total,
                pd.saldo
         FROM pedido_detalle pd
         LEFT JOIN productos p ON p.codigo_producto = pd.codigo_producto
         WHERE pd.codigo_pedido = ?`,
        [codigo]
      );
      sendJson(res, 200, rows);
      return;
    }

    if (pathname === '/api/bases') {
      const [rows] = await execQuery(pool, 'CALL get_bases()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/productos') {
      const [rows] = await execQuery(pool, 'CALL get_productos()');
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/puntos-entrega') {
      const codigoCliente = query.cliente;
      if (!codigoCliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_puntos_entrega(?)', [codigoCliente]);
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
        sendJson(res, 400, { error: 'Departamento y provincia requeridos' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_ubigeo_distritos(?, ?)', [dep, prov]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/numrecibe') {
      const codigoCliente = query.cliente;
      if (!codigoCliente) {
        sendJson(res, 400, { error: 'Cliente requerido' });
        return;
      }
      const [rows] = await execQuery(pool, 'CALL get_numrecibe(?)', [codigoCliente]);
      sendJson(res, 200, rows[0] || rows);
      return;
    }

    if (pathname === '/api/logs') {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      sendJson(res, 200, { content });
      return;
    }

    if (pathname === '/api/facturas/emitir' && req.method === 'POST') {
      const payload = await parseBody(req);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const pedido = payload.pedido || {};
        const factura = payload.factura || {};
        const detalles = payload.detalles || [];
        const entrega = payload.entrega || {};
        const recibe = payload.recibe || {};

        let codigoClienteNumrecibe = recibe.codigo_cliente_numrecibe || null;
        if (recibe.mode === 'new') {
          const [result] = await execQuery(
            conn,
            'INSERT INTO numrecibe (codigo_cliente, numero, nombre) VALUES (?, ?, ?)',
            [pedido.codigo_cliente, recibe.numero, recibe.nombre]
          );
          codigoClienteNumrecibe = result.insertId || null;
        }

        let codigoPuntoEntrega = entrega.codigo_puntoentrega || null;
        if (entrega.mode === 'new') {
          const [nextRows] = await execQuery(
            conn,
            'SELECT IFNULL(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE ubigeo = ?',
            [entrega.ubigeo]
          );
          codigoPuntoEntrega = nextRows[0].next;
          await execQuery(
            conn,
            `INSERT INTO puntos_entrega
              (codigo_puntoentrega, codigo_cliente, ubigeo, region_entrega, direccion_linea, referencia,
               destinatario_nombre, destinatario_dni, agencia)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              codigoPuntoEntrega,
              pedido.codigo_cliente,
              entrega.ubigeo,
              entrega.region_entrega,
              entrega.direccion_linea,
              entrega.referencia,
              entrega.destinatario_nombre,
              entrega.destinatario_dni,
              entrega.agencia,
            ]
          );
        }

        const [docRows] = await execQuery(
          conn,
          'SELECT IFNULL(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?',
          [factura.tipo_documento]
        );
        const numeroDocumento = docRows[0].next;

        await execQuery(
          conn,
          `INSERT INTO mov_contable
            (numero_documento, tipo_documento, fecha_emision, codigo_base, codigo_cliente,
             codigo_cliente_numrecibe, ubigeo, codigo_puntoentrega, codigo_pedido, saldo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ,
          [
            numeroDocumento,
            factura.tipo_documento,
            factura.fecha_emision,
            factura.codigo_base,
            pedido.codigo_cliente,
            codigoClienteNumrecibe,
            entrega.ubigeo,
            codigoPuntoEntrega,
            pedido.codigo_pedido,
            factura.total,
          ]
        );

        for (let i = 0; i < detalles.length; i += 1) {
          const item = detalles[i];
          await execQuery(
            conn,
            `INSERT INTO mov_contable_detalle
              (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, precio_total)
             VALUES (?, ?, ?, ?, ?, ?)`
            ,
            [
              factura.tipo_documento,
              numeroDocumento,
              i + 1,
              item.codigo_producto,
              item.cantidad_factura,
              item.precio_total_factura,
            ]
          );
        }

        await execQuery(conn, 'CALL salidaspedidos(?, ?)', [factura.tipo_documento, numeroDocumento]);

        await execQuery(
          conn,
          `INSERT INTO paquete (codigo_paquete, estado, fecha_registro, fecha_actualizado)
           VALUES (?, ?, NOW(), NOW())`,
          [numeroDocumento, 'pendiente empacar']
        );

        for (let i = 0; i < detalles.length; i += 1) {
          await execQuery(
            conn,
            `INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, fecha_registro)
             VALUES (?, ?, ?, NOW())`,
            [numeroDocumento, i + 1, 'pendiente empacar']
          );
        }

        await conn.commit();
        sendJson(res, 200, { ok: true, numero_documento: numeroDocumento });
      } catch (error) {
        await conn.rollback();
        logLine(`ERROR: ${error.message}`);
        sendJson(res, 500, { error: 'Error al emitir factura' });
      } finally {
        conn.release();
      }
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
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

const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  logLine(`Servidor iniciado en puerto ${PORT}`);
});
