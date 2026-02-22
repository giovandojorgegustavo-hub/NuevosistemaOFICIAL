const express = require('express');
const mysql = require('mysql2/promise');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

function loadConfig() {
  const configPath = path.join(__dirname, 'erp.yml');
  const file = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(file);

  const connection = (config.connections || []).find((c) => c.name) || null;
  if (!connection || !connection.dsn) {
    throw new Error('No se encontro una conexion valida en erp.yml');
  }

  const match = connection.dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/([^?]+)$/);
  if (!match) {
    throw new Error('Formato DSN invalido en erp.yml');
  }

  const [, user, password, host, port, dbFromDsn] = match;
  const dbName = connection.name || dbFromDsn;

  return {
    db: {
      host,
      port: Number(port),
      user,
      password,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    },
    port: config?.ports?.services?.consola_paquetes || 4004,
  };
}

const runtime = loadConfig();
const pool = mysql.createPool(runtime.db);

function normalizeSpRows(result) {
  if (!Array.isArray(result)) return [];
  if (Array.isArray(result[0])) return result[0];
  return result;
}

function getFirstRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function extractOtp(rows) {
  const first = getFirstRow(rows);
  if (!first) return null;
  const candidates = ['otp', 'OTP', 'vOTP', 'codigo_otp', 'token'];
  for (const key of candidates) {
    if (first[key] !== undefined && first[key] !== null && String(first[key]).trim() !== '') {
      return String(first[key]);
    }
  }
  const firstKey = Object.keys(first)[0];
  return firstKey ? String(first[firstKey]) : null;
}

function appendQuery(url, query) {
  try {
    const parsed = new URL(url);
    Object.entries(query).forEach(([key, value]) => parsed.searchParams.set(key, String(value)));
    return parsed.toString();
  } catch {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => params.set(key, String(value)));
    return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
  }
}

function sendError(res, context, error, status = 500) {
  console.error(`[${new Date().toISOString()}] ${context}:`, error?.message || error);
  return res.status(status).json({
    error: `Fallo en ${context}`,
    detail: error?.message || 'Error desconocido',
  });
}

app.get('/api/board-config', async (req, res) => {
  try {
    const [result] = await pool.query('CALL get_tablero(?)', ['PAQ']);
    const rows = normalizeSpRows(result).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));
    return res.json(rows);
  } catch (error) {
    return sendError(res, 'get_tablero', error);
  }
});

app.get('/api/packages', async (req, res) => {
  try {
    const [result] = await pool.query('CALL get_paquetes(NOW())');
    const rows = normalizeSpRows(result);
    return res.json(rows);
  } catch (error) {
    return sendError(res, 'get_paquetes', error);
  }
});

app.get('/api/details/:type/:code', async (req, res) => {
  const { type, code } = req.params;
  if (!type || !code) {
    return res.status(400).json({ error: 'Parametros invalidos', detail: 'type y code son requeridos' });
  }

  try {
    const [result] = await pool.query('CALL get_productos_pkte(?, ?)', [type, code]);
    const rows = normalizeSpRows(result).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));
    return res.json(rows);
  } catch (error) {
    return sendError(res, 'get_productos_pkte', error);
  }
});

app.post('/api/liquidar', async (req, res) => {
  const vUsuario = 1;
  const vUseCaseToLaunch = 'CU003';

  try {
    const [otpResult] = await pool.query('CALL generar_otp_usuario(?)', [vUsuario]);
    const otpRows = normalizeSpRows(otpResult);
    const vOTP = extractOtp(otpRows);

    if (!vOTP) {
      return res.status(500).json({ error: 'No se pudo generar OTP', detail: 'SP generar_otp_usuario sin datos validos' });
    }

    const [linkResult] = await pool.query('CALL get_usecase_link(?)', [vUseCaseToLaunch]);
    const linkRows = normalizeSpRows(linkResult);
    const linkRow = getFirstRow(linkRows);
    const vLinkToLaunch = linkRow?.linktolaunch;

    if (!vLinkToLaunch) {
      return res.status(500).json({ error: 'No se encontro link de usecase', detail: `SP get_usecase_link(${vUseCaseToLaunch}) sin linktolaunch` });
    }

    const url = appendQuery(vLinkToLaunch, { vUsuario, vOTP });
    return res.json({ ok: true, vUsuario, vOTP, url, usecase: vUseCaseToLaunch });
  } catch (error) {
    return sendError(res, 'liquidarpaquete', error);
  }
});

app.listen(runtime.port, () => {
  console.log(`Consola Paquetes API escuchando en puerto ${runtime.port}`);
  console.log(`MySQL: ${runtime.db.host}:${runtime.db.port}/${runtime.db.database}`);
});
