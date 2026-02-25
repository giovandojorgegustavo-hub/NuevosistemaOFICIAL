const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
const PUBLIC_DIR = path.join(__dirname, 'wizard', 'ConsolaPaquetes', 'public');
app.use(express.static(PUBLIC_DIR));
app.use('/public', express.static(PUBLIC_DIR));

function parseMysqlDsn(dsn) {
  if (typeof dsn !== 'string' || dsn.trim() === '') {
    throw new Error('DSN vacio o invalido en erp.yml');
  }

  const tcpFormat = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/([^?]+)$/i);
  if (tcpFormat) {
    const [, user, password, host, port, database] = tcpFormat;
    return { user, password, host, port: Number(port), database };
  }

  const stdUrl = new URL(dsn);
  if (stdUrl.protocol !== 'mysql:') {
    throw new Error('DSN debe usar protocolo mysql://');
  }

  return {
    user: decodeURIComponent(stdUrl.username || ''),
    password: decodeURIComponent(stdUrl.password || ''),
    host: stdUrl.hostname,
    port: Number(stdUrl.port || 3306),
    database: (stdUrl.pathname || '').replace(/^\//, ''),
  };
}

function loadConfig() {
  const configPath = path.join(__dirname, 'erp.yml');
  const file = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(file) || {};

  const connection = (config.connections || []).find((item) => item && item.dsn && item.name);
  if (!connection) {
    throw new Error('No se encontro una conexion con {name} y {dsn} en erp.yml');
  }

  const parsed = parseMysqlDsn(connection.dsn);

  return {
    db: {
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: connection.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
    },
    port: Number(config?.ports?.services?.consola_paquetes || 4004),
  };
}

function normalizeRows(result) {
  if (!Array.isArray(result)) return [];
  if (Array.isArray(result[0])) return result[0];
  return result;
}

function firstRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function extractScalar(row) {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  if (keys.length === 0) return null;
  return row[keys[0]];
}

function extractOtp(rows) {
  const row = firstRow(rows);
  if (!row) return null;
  const candidates = ['otp', 'OTP', 'vOTP', 'codigo_otp', 'token'];
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]);
    }
  }
  const value = extractScalar(row);
  return value == null ? null : String(value);
}

function appendQuery(url, query) {
  try {
    const parsed = new URL(url);
    Object.entries(query).forEach(([key, value]) => parsed.searchParams.set(key, String(value)));
    return parsed.toString();
  } catch {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => qs.set(key, String(value)));
    return `${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`;
  }
}

function apiError(res, context, error, status = 500) {
  console.error(`[${new Date().toISOString()}] ${context}:`, error?.message || error);
  return res.status(status).json({
    error: `Fallo en ${context}`,
    detail: error?.message || 'Error desconocido',
  });
}

const runtime = loadConfig();
const pool = mysql.createPool(runtime.db);

async function runBoardAndPackages() {
  const [boardRaw] = await pool.query('CALL get_tablero(?)', ['PAQ']);
  const columns = normalizeRows(boardRaw).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));

  // Seguridad provisoria solicitada por requerimiento.
  const vUsuario = 1;
  const [packRaw] = await pool.query('CALL get_paquetes(NOW(), ?)', [vUsuario]);
  const packages = normalizeRows(packRaw);

  return { columns, packages, vUsuario };
}

async function launchUseCase(codigoUseCase) {
  const vUsuario = 1;

  const [otpRaw] = await pool.query('CALL generar_otp_usuario(?)', [vUsuario]);
  const vOTP = extractOtp(normalizeRows(otpRaw));
  if (!vOTP) {
    throw new Error('SP generar_otp_usuario no retorno OTP valido');
  }

  const [linkRaw] = await pool.query('CALL get_usecase_link(?)', [codigoUseCase]);
  const linkRow = firstRow(normalizeRows(linkRaw));
  const linkToLaunch = linkRow?.linktolaunch;
  if (!linkToLaunch) {
    throw new Error(`SP get_usecase_link(${codigoUseCase}) no retorno linktolaunch`);
  }

  const url = appendQuery(linkToLaunch, { vUsuario, vOTP });
  return { useCase: codigoUseCase, vUsuario, vOTP, url };
}

app.get('/api/init', async (req, res) => {
  const Codigo_usuario = String(req.query.Codigo_usuario || '').trim();
  const OTP = String(req.query.OTP || '').trim();

  if (!Codigo_usuario || !OTP) {
    return res.status(400).json({
      ok: false,
      code: 0,
      message: 'Warning ACCESO NO AUTORIZADO !!!',
      detail: 'Parametros obligatorios faltantes: Codigo_usuario y OTP',
    });
  }

  try {
    const [otpCheckRaw] = await pool.query('CALL validar_otp_usuario(?, ?)', [Codigo_usuario, OTP]);
    const otpCheckRow = firstRow(normalizeRows(otpCheckRaw));
    const otpCheckValue = Number(extractScalar(otpCheckRow));

    if (otpCheckValue !== 1) {
      return res.status(401).json({
        ok: false,
        code: otpCheckValue,
        message: 'Warning ACCESO NO AUTORIZADO !!!',
      });
    }

    const boardData = await runBoardAndPackages();

    return res.json({
      ok: true,
      code: 1,
      message: 'OK',
      ...boardData,
    });
  } catch (error) {
    return apiError(res, 'init', error);
  }
});

app.get('/api/productos', async (req, res) => {
  const tipo_documento = String(req.query.tipo_documento || '').trim();
  const codigo_paquete = String(req.query.codigo_paquete || '').trim();

  if (!tipo_documento || !codigo_paquete) {
    return res.status(400).json({
      error: 'Parametros invalidos',
      detail: 'tipo_documento y codigo_paquete son obligatorios',
    });
  }

  try {
    const [raw] = await pool.query('CALL get_productos_pkte(?, ?)', [tipo_documento, codigo_paquete]);
    const rows = normalizeRows(raw).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));
    return res.json({ ok: true, rows });
  } catch (error) {
    return apiError(res, 'get_productos_pkte', error);
  }
});

app.post('/api/liquidar', async (_req, res) => {
  try {
    const result = await launchUseCase('CU003');
    return res.json({ ok: true, ...result });
  } catch (error) {
    return apiError(res, 'liquidarpaquete', error);
  }
});

app.post('/api/standby', async (_req, res) => {
  try {
    const result = await launchUseCase('CU004');
    return res.json({ ok: true, ...result });
  } catch (error) {
    return apiError(res, 'procesarStandBy', error);
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(runtime.port, () => {
  console.log(`Consola Paquetes corriendo en puerto ${runtime.port}`);
  console.log(`MySQL: ${runtime.db.host}:${runtime.db.port}/${runtime.db.database}`);
});
