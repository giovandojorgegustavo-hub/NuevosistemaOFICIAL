const fs = require('fs');
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU-003';

function timestamp() {
  return new Date().toISOString();
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

function formatFileDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

const logFile = ensureLogFile();

function logLine(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function parseErpConfig() {
  const configPath = path.join(ROOT_DIR, '..', '..', 'erp.yml');
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

logLine('INFO', `Iniciando servidor CU-003 usando DB: ${name}`);

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

async function queryDb(connection, sql, params = []) {
  logLine('SQL', `${sql} | params: ${JSON.stringify(params)}`);
  return connection.query(sql, params);
}

app.use(express.json());
app.use(express.static(ROOT_DIR));

app.get('/api/bases', async (req, res) => {
  logLine('INFO', 'GET /api/bases');
  try {
    const [rows] = await queryDb(pool, 'CALL get_bases()');
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message);
    res.status(500).json({ message: 'Error al obtener bases.' });
  }
});

app.get('/api/paquetes', async (req, res) => {
  const estado = req.query.estado || 'empacado';
  logLine('INFO', `GET /api/paquetes?estado=${estado}`);
  try {
    const [rows] = await queryDb(pool, 'CALL get_paquetes_por_estado(?)', [estado]);
    res.json(rows[0] || []);
  } catch (error) {
    logLine('ERROR', error.message);
    res.status(500).json({ message: 'Error al obtener paquetes.' });
  }
});

app.get('/api/logs', (req, res) => {
  logLine('INFO', 'GET /api/logs');
  try {
    const files = fs
      .readdirSync(LOG_DIR)
      .filter((file) => file.startsWith(LOG_PREFIX) && file.endsWith('.log'))
      .sort()
      .reverse();
    res.json(files);
  } catch (error) {
    logLine('ERROR', error.message);
    res.status(500).json([]);
  }
});

app.get('/api/logs/:file', (req, res) => {
  const file = req.params.file;
  logLine('INFO', `GET /api/logs/${file}`);
  if (!file.startsWith(LOG_PREFIX) || !file.endsWith('.log')) {
    return res.status(400).send('Archivo no valido.');
  }
  const filePath = path.join(LOG_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('No encontrado.');
  }
  const content = fs.readFileSync(filePath, 'utf8');
  res.type('text/plain').send(content);
});

app.post('/api/viajes', async (req, res) => {
  logLine('INFO', 'POST /api/viajes');
  const {
    codigo_base,
    nombre_motorizado,
    numero_wsp,
    num_llamadas,
    num_yape,
    link,
    observacion,
    paquetes,
  } = req.body || {};

  if (!codigo_base || !nombre_motorizado || !link || !Array.isArray(paquetes) || paquetes.length === 0) {
    return res.status(400).json({ message: 'Datos incompletos.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [nextRows] = await queryDb(connection, 'SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes');
    const codigoviaje = nextRows[0]?.next || 1;

    const insertViajeSql = `
      INSERT INTO viajes
        (codigoviaje, codigo_base, nombre_motorizado, numero_wsp, num_llamadas, num_yape, link, observacion, fecha)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await queryDb(connection, insertViajeSql, [
      codigoviaje,
      codigo_base,
      nombre_motorizado,
      numero_wsp || null,
      num_llamadas || null,
      num_yape || null,
      link,
      observacion || null,
    ]);

    for (const paquete of paquetes) {
      const codigoPaquete = paquete.codigo_paquete;
      const [ordinalRows] = await queryDb(
        connection,
        `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'`,
        [codigoPaquete]
      );
      const ordinal = ordinalRows[0]?.next || 1;

      await queryDb(
        connection,
        `INSERT INTO detalleviaje (codigoviaje, numero_documento, tipo_documento, fecha_inicio) VALUES (?, ?, 'FAC', NOW())`,
        [codigoviaje, codigoPaquete]
      );

      await queryDb(
        connection,
        `INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, 'en camino', 'FAC')`,
        [codigoPaquete, ordinal]
      );

      await queryDb(connection, 'CALL cambiar_estado_paquete(?, ?)', [codigoPaquete, 'empacado']);
    }

    await connection.commit();
    res.json({ codigoviaje, paquetes: paquetes.length });
  } catch (error) {
    await connection.rollback();
    logLine('ERROR', error.stack || error.message);
    res.status(500).json({ message: 'Error al guardar el viaje.' });
  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  logLine('INFO', `Servidor escuchando en puerto ${PORT}`);
});
