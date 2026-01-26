const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mysql = require('mysql2/promise');

const ROOT_DIR = path.resolve(__dirname);
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_YML_PATH = path.resolve(__dirname, '..', '..', 'erp.yml');

function timestamp() {
  return new Date().toISOString();
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(
    now.getSeconds()
  ).padStart(2, '0')}`;
  const base = `CU-006-${datePart}-${timePart}`;
  let suffix = 1;
  let filename = `${base}-001.log`;
  while (fs.existsSync(path.join(LOG_DIR, filename))) {
    suffix += 1;
    filename = `${base}-${String(suffix).padStart(3, '0')}.log`;
  }
  return path.join(LOG_DIR, filename);
}

const logFilePath = ensureLogFile();

function writeLog(level, message) {
  const line = `[${timestamp()}] ${level} | ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  fs.appendFileSync(logFilePath, `${line}\n`);
}

function parseErpYaml(content) {
  const nameMatch = content.match(/name:\s*"?([^"\n]+)"?/i);
  const dsnMatch = content.match(/dsn:\s*"?([^"\n]+)"?/i);
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    dsn: dsnMatch ? dsnMatch[1].trim() : null,
  };
}

function normalizeDsn(dsn) {
  if (!dsn) return dsn;
  const match = dsn.match(/^(mysql:\/\/[^@]+)@tcp\(([^)]+)\)(\/.+)$/i);
  if (match) {
    return `${match[1]}@${match[2]}${match[3]}`;
  }
  return dsn;
}

async function initPool() {
  const configText = fs.readFileSync(ERP_YML_PATH, 'utf8');
  const { name, dsn } = parseErpYaml(configText);
  if (!name || !dsn) {
    throw new Error('No se pudo leer la configuracion de erp.yml');
  }
  writeLog('CONFIG', `DB name=${name}`);
  const normalizedDsn = normalizeDsn(dsn);
  const pool = mysql.createPool({ uri: normalizedDsn, waitForConnections: true, connectionLimit: 10 });
  await pool.query('USE ??', [name]);
  return { pool, dbName: name };
}

function logSql(sql, params = []) {
  writeLog('SQL', `${sql} | params=${JSON.stringify(params)}`);
}

async function execQuery(pool, sql, params = []) {
  logSql(sql, params);
  return pool.query(sql, params);
}

async function execQueryConn(conn, sql, params = []) {
  logSql(sql, params);
  return conn.query(sql, params);
}

async function callProcedure(pool, sql, params = []) {
  const [rows] = await execQuery(pool, sql, params);
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows;
}

async function callProcedureConn(conn, sql, params = []) {
  const [rows] = await execQueryConn(conn, sql, params);
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0];
  }
  return rows;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === '.html'
      ? 'text/html'
      : ext === '.css'
      ? 'text/css'
      : ext === '.js'
      ? 'application/javascript'
      : 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getRouteSegments(reqUrl) {
  return reqUrl.split('?')[0].split('/').filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return String(value);
}

async function startServer() {
  const { pool } = await initPool();
  writeLog('SERVER', 'Inicio del servidor');

  const server = http.createServer(async (req, res) => {
    try {
      const parsed = url.parse(req.url, true);
      const pathname = parsed.pathname || '/';
      writeLog('ENDPOINT', `${req.method} ${pathname}`);

      if (pathname === '/' || pathname === '/index.html') {
        return serveStatic(res, path.join(ROOT_DIR, 'index.html'));
      }
      if (pathname === '/styles.css') {
        return serveStatic(res, path.join(ROOT_DIR, 'styles.css'));
      }
      if (pathname === '/app.js') {
        return serveStatic(res, path.join(ROOT_DIR, 'app.js'));
      }

      if (pathname === '/api/logs') {
        const data = fs.readFileSync(logFilePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(data);
      }

      if (pathname.startsWith('/api/')) {
        const segments = getRouteSegments(pathname);

        if (req.method === 'GET' && pathname === '/api/pedidos') {
          const rows = await callProcedure(pool, 'CALL get_pedidospendientes()');
          const cliente = (parsed.query.cliente || '').toString().toLowerCase();
          const fecha = parsed.query.fecha ? parsed.query.fecha.toString() : '';
          const filtered = (rows || []).filter((row) => {
            const nombre = String(row.nombre_cliente || row.vnombre_cliente || '').toLowerCase();
            const numero = String(row.numero_cliente || row.vnumero_cliente || '').toLowerCase();
            const codigo = String(row.codigo_pedido || row.vcodigo_pedido || '').toLowerCase();
            const fechaRow = formatDate(row.fecha || row.vfecha || '');
            const matchCliente = !cliente || nombre.includes(cliente) || numero.includes(cliente) || codigo.includes(cliente);
            const matchFecha = !fecha || fechaRow === fecha;
            return matchCliente && matchFecha;
          });
          return sendJson(res, 200, filtered);
        }

        if (req.method === 'GET' && pathname === '/api/bases') {
          const rows = await callProcedure(pool, 'CALL get_bases()');
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && segments[0] === 'api' && segments[1] === 'pedidos' && segments[2] && segments[3] === 'detalle') {
          const codigo = decodeURIComponent(segments[2]);
          const rows = await callProcedure(pool, 'CALL get_pedido_detalle_por_pedido(?)', [codigo]);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/next-documento') {
          const tipo = parsed.query.tipo || 'FAC';
          const [rows] = await execQuery(pool, 'SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = ?', [
            tipo,
          ]);
          return sendJson(res, 200, rows?.[0] || { next: 1 });
        }

        if (req.method === 'GET' && pathname === '/api/next-ordinal-detalle') {
          const tipo = parsed.query.tipo || 'FAC';
          const numero = parsed.query.numero || 0;
          const [rows] = await execQuery(
            pool,
            'SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = ? AND numero_documento = ?',
            [tipo, numero]
          );
          return sendJson(res, 200, rows?.[0] || { next: 1 });
        }

        if (req.method === 'GET' && pathname === '/api/puntos-entrega') {
          const cliente = parsed.query.cliente || '';
          const rows = await callProcedure(pool, 'CALL get_puntos_entrega(?)', [cliente]);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/next-punto-entrega') {
          const cliente = parsed.query.cliente || '';
          const [rows] = await execQuery(
            pool,
            'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
            [cliente]
          );
          return sendJson(res, 200, rows?.[0] || { next: 1 });
        }

        if (req.method === 'GET' && pathname === '/api/ubigeo/departamentos') {
          const rows = await callProcedure(pool, 'CALL get_ubigeo_departamentos()');
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/ubigeo/provincias') {
          const dep = parsed.query.dep || '';
          const rows = await callProcedure(pool, 'CALL get_ubigeo_provincias(?)', [dep]);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/ubigeo/distritos') {
          const dep = parsed.query.dep || '';
          const prov = parsed.query.prov || '';
          const rows = await callProcedure(pool, 'CALL get_ubigeo_distritos(?, ?)', [dep, prov]);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/numrecibe') {
          const cliente = parsed.query.cliente || '';
          const rows = await callProcedure(pool, 'CALL get_numrecibe(?)', [cliente]);
          return sendJson(res, 200, rows || []);
        }

        if (req.method === 'GET' && pathname === '/api/next-numrecibe') {
          const cliente = parsed.query.cliente || '';
          const [rows] = await execQuery(
            pool,
            'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
            [cliente]
          );
          return sendJson(res, 200, rows?.[0] || { next: 1 });
        }

        if (req.method === 'GET' && pathname === '/api/next-paquetedetalle') {
          const numero = parsed.query.numero || '';
          const [rows] = await execQuery(
            pool,
            "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
            [numero]
          );
          return sendJson(res, 200, rows?.[0] || { next: 1 });
        }

        if (req.method === 'POST' && pathname === '/api/emitir-factura') {
          let body = {};
          try {
            body = await parseBody(req);
          } catch (error) {
            writeLog('ERROR', `JSON invalido: ${error.message}`);
            return sendJson(res, 400, { message: 'JSON invalido' });
          }
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            const pedido = body.pedido || {};
            const factura = body.factura || {};
            const detalle = Array.isArray(body.detalle) ? body.detalle : [];
            const entrega = body.entrega || {};
            const recibe = body.recibe || {};
            const ordinals = body.ordinals || {};

            const vFechaP = `${factura.fecha_emision} ${factura.hora_emision}:00`;

            if (entrega.modo === 'nuevo') {
              const [nextRows] = await execQueryConn(
                conn,
                'SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = ?',
                [entrega.codigo_cliente]
              );
              const nextPunto = nextRows?.[0]?.next || 1;
              await execQueryConn(
                conn,
                `INSERT INTO puntos_entrega
                (ubigeo, codigo_puntoentrega, codigo_cliente, direccion_linea, referencia, nombre, dni, agencia, observaciones, region_entrega, concatenarpuntoentrega)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
                [
                  entrega.ubigeo,
                  nextPunto,
                  entrega.codigo_cliente,
                  entrega.direccion_linea,
                  entrega.referencia,
                  entrega.nombre,
                  entrega.dni,
                  entrega.agencia,
                  entrega.observaciones,
                  entrega.region_entrega,
                  entrega.concatenarpuntoentrega,
                ]
              );
              entrega.codigo_puntoentrega = nextPunto;
            }

            if (recibe.modo === 'nuevo' && entrega.region_entrega === 'LIMA') {
              const [nextRows] = await execQueryConn(
                conn,
                'SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = ?',
                [recibe.codigo_cliente]
              );
              const nextOrdinal = nextRows?.[0]?.next || 1;
              await execQueryConn(
                conn,
                `INSERT INTO numrecibe
                (ordinal_numrecibe, numero, nombre, codigo_cliente_numrecibe, concatenarnumrecibe)
                VALUES (?, ?, ?, ?, ?)` ,
                [nextOrdinal, recibe.numero, recibe.nombre, recibe.codigo_cliente, recibe.concatenarnumrecibe]
              );
              ordinals.ordinal_numrecibe = nextOrdinal;
            }

            await execQueryConn(
              conn,
              `INSERT INTO mov_contable
              (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, saldo, tipo_documento, numero_documento, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
              [
                pedido.codigo_pedido,
                vFechaP,
                vFechaP,
                vFechaP,
                pedido.codigo_cliente,
                factura.saldo_total,
                factura.tipo_documento,
                factura.numero_documento,
                factura.codigo_base,
                pedido.codigo_cliente,
                ordinals.ordinal_numrecibe || factura.ordinal_numrecibe || 1,
                pedido.codigo_cliente,
                entrega.codigo_puntoentrega || entrega.codigo_puntoentrega,
              ]
            );

            let ordinalDet = factura.ordinal_detalle || 1;
            for (const item of detalle) {
              await execQueryConn(
                conn,
                `INSERT INTO mov_contable_detalle
                (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, saldo, precio_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)` ,
                [
                  factura.tipo_documento,
                  factura.numero_documento,
                  ordinalDet,
                  item.codigo_producto,
                  item.cantidad_factura,
                  item.cantidad_factura,
                  item.precio_total,
                ]
              );
              ordinalDet += 1;
            }

            await execQueryConn(
              conn,
              `INSERT INTO paquete
              (codigo_paquete, tipo_documento, estado)
              VALUES (?, ?, ?)` ,
              [factura.numero_documento, factura.tipo_documento, 'pendiente empacar']
            );

            await execQueryConn(
              conn,
              `INSERT INTO paquetedetalle
              (codigo_paquete, tipo_documento, ordinal_paquetedetalle, estado)
              VALUES (?, ?, ?, ?)` ,
              [factura.numero_documento, factura.tipo_documento, ordinals.ordinal_paquetedetalle || 1, 'pendiente empacar']
            );

            await callProcedureConn(
              conn,
              'CALL actualizarsaldosclientes(?, ?, ?)',
              [pedido.codigo_cliente, factura.tipo_documento, factura.saldo_total]
            );

            await callProcedureConn(conn, 'CALL salidaspedidos(?, ?)', [factura.tipo_documento, factura.numero_documento]);

            await conn.commit();
            return sendJson(res, 200, { ok: true });
          } catch (error) {
            await conn.rollback();
            writeLog('ERROR', error.message);
            return sendJson(res, 500, { message: 'Error al emitir factura' });
          } finally {
            conn.release();
          }
        }

        return sendJson(res, 404, { message: 'Not found' });
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    } catch (error) {
      writeLog('ERROR', error.message);
      sendJson(res, 500, { message: 'Error interno' });
    }
  });

  const PORT = process.env.PORT || 3006;
  server.listen(PORT, () => {
    writeLog('SERVER', `Servidor escuchando en puerto ${PORT}`);
  });
}

startServer().catch((error) => {
  writeLog('ERROR', error.message);
});
