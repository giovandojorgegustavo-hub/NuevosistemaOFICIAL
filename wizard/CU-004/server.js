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
    filePath = path.join(LOG_DIR, `CU-004-${stamp}-${suffix}.log`);
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

async function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  logLine(`Endpoint: ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/paquetes') {
      const estado = query.estado || 'en camino';
      const [rows] = await execQuery(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
      sendJson(res, 200, rows[0]);
      return;
    }

    if (pathname === '/api/paquetes/detalle') {
      const codigo = query.codigo;
      if (!codigo) {
        sendJson(res, 400, { error: 'Codigo requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        `SELECT p.nombre AS nombre_producto, mcd.cantidad
         FROM mov_contable_detalle mcd
         JOIN productos p ON p.codigo_producto = mcd.codigo_producto
         WHERE mcd.tipo_documento = 'F'
           AND mcd.numero_documento = ?
         ORDER BY mcd.ordinal`,
        [codigo]
      );
      sendJson(res, 200, rows);
      return;
    }

    if (pathname === '/api/paquetes/info') {
      const codigo = query.codigo;
      if (!codigo) {
        sendJson(res, 400, { error: 'Codigo requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        `SELECT mc.codigo_cliente,
                c.nombre AS nombre_cliente,
                mc.codigo_cliente_numrecibe,
                mc.ordinal_numrecibe,
                mc.ubigeo,
                mc.codigo_puntoentrega,
                pe.region_entrega,
                pe.direccion_linea,
                pe.referencia,
                pe.destinatario_nombre,
                pe.destinatario_dni,
                pe.agencia
         FROM mov_contable mc
         LEFT JOIN clientes c ON c.codigo_cliente = mc.codigo_cliente
         LEFT JOIN puntos_entrega pe
           ON pe.codigo_puntoentrega = mc.codigo_puntoentrega
          AND pe.ubigeo = mc.ubigeo
         WHERE mc.tipo_documento = 'F'
           AND mc.numero_documento = ?
         LIMIT 1`,
        [codigo]
      );
      const entrega = rows[0] || {};

      let ubigeoInfo = { codigo: entrega.ubigeo || '' };
      if (entrega.ubigeo && String(entrega.ubigeo).length >= 6) {
        const codDep = String(entrega.ubigeo).slice(0, 2);
        const codProv = String(entrega.ubigeo).slice(2, 4);
        const codDist = String(entrega.ubigeo).slice(4, 6);
        const [ubigeoRows] = await execQuery(
          pool,
          `SELECT departamento, provincia, distrito
           FROM ubigeo
           WHERE cod_dep = ? AND cod_prov = ? AND cod_dist = ?
           LIMIT 1`,
          [codDep, codProv, codDist]
        );
        if (ubigeoRows[0]) {
          const { departamento, provincia, distrito } = ubigeoRows[0];
          ubigeoInfo = {
            codigo: entrega.ubigeo,
            nombre: [departamento, provincia, distrito].filter(Boolean).join(' / '),
          };
        }
      }

      let recibe = {};
      if (entrega.codigo_cliente_numrecibe && entrega.ordinal_numrecibe) {
        const [recibeRows] = await execQuery(
          pool,
          `SELECT numero, nombre
           FROM numrecibe
           WHERE codigo_cliente_numrecibe = ?
             AND ordinal_numrecibe = ?
           LIMIT 1`,
          [entrega.codigo_cliente_numrecibe, entrega.ordinal_numrecibe]
        );
        recibe = recibeRows[0] || {};
      }

      sendJson(res, 200, {
        entrega,
        recibe,
        ubigeo: ubigeoInfo,
      });
      return;
    }

    if (pathname === '/api/paquetes/viaje') {
      const codigo = query.codigo;
      if (!codigo) {
        sendJson(res, 400, { error: 'Codigo requerido' });
        return;
      }
      const [rows] = await execQuery(
        pool,
        `SELECT v.codigoviaje,
                v.codigo_base,
                v.nombre_motorizado,
                v.numero_wsp,
                v.num_llamadas,
                v.num_yape,
                v.link,
                v.observacion,
                v.fecha
         FROM detalleviaje dv
         JOIN viajes v ON v.codigoviaje = dv.codigoviaje
         WHERE dv.tipo_documento = 'F'
           AND dv.numero_documento = ?
         ORDER BY v.fecha DESC
         LIMIT 1`,
        [codigo]
      );
      sendJson(res, 200, rows[0] || {});
      return;
    }

    if (pathname === '/api/paquetes/estado' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.codigo_paquete || !body.estado) {
        sendJson(res, 400, { error: 'Datos incompletos' });
        return;
      }
      const response = await actualizarEstado(body);
      sendJson(res, 200, response);
      return;
    }

    if (pathname === '/api/logs/latest') {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';
      sendJson(res, 200, { file: path.basename(LOG_FILE), content });
      return;
    }

    sendJson(res, 404, { error: 'Endpoint no encontrado' });
  } catch (error) {
    logLine(`ERROR: ${error.message}`);
    sendJson(res, 500, { error: error.message });
  }
}

async function actualizarEstado(payload) {
  const codigoPaquete = payload.codigo_paquete;
  const estado = payload.estado;
  const conn = await pool.getConnection();
  try {
    await execQuery(conn, 'START TRANSACTION');
    await execQuery(conn, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, estado]);
    await execQuery(
      conn,
      `UPDATE paquetedetalle
       SET estado = ?
       WHERE codigo_paquete = ?`,
      [estado, codigoPaquete]
    );
    await execQuery(conn, 'COMMIT');
    return { codigo_paquete: codigoPaquete, estado };
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

const PORT = Number(process.env.PORT || 3003);
server.listen(PORT, () => {
  logLine(`Servidor iniciado en http://localhost:${PORT}`);
});
