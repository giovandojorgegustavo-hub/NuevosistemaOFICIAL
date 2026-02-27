const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');
const mysql = require('mysql2/promise');

const UNAUTHORIZED_MSG = 'Warning ACCESO NO AUTORIZADO !!!';
const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const SESSION_TTL_MS = Math.max(60_000, Number(process.env.SESSION_TTL_MS || 15 * 60 * 1000));
const JSON_LIMIT = String(process.env.JSON_LIMIT || '128kb');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: JSON_LIMIT }));

const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR, { maxAge: IS_PROD ? '1h' : 0 }));
app.use('/public', express.static(PUBLIC_DIR, { maxAge: IS_PROD ? '1h' : 0 }));

function parseCorsOrigins(value) {
  if (typeof value !== 'string' || value.trim() === '') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

app.use((req, res, next) => {
  // Security baseline headers without extra dependencies.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use('/api', (req, res, next) => {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) {
    return next();
  }

  const allowed = corsOrigins.length === 0 || corsOrigins.includes(origin);
  if (!allowed) {
    return res.status(403).json({ ok: false, error: 'CORS_ORIGIN_DENIED' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Session-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

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
  const configCandidates = [
    path.join(__dirname, 'erp.yml'),
    path.join(__dirname, '..', '..', 'erp.yml'),
    path.join(process.cwd(), 'erp.yml'),
  ];

  const configPath = configCandidates.find((candidate) => fs.existsSync(candidate));
  if (!configPath) {
    throw new Error(`No se encontro erp.yml. Rutas probadas: ${configCandidates.join(', ')}`);
  }

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
  if (!keys.length) return null;
  return row[keys[0]];
}

function extractOtp(rows) {
  const row = firstRow(rows);
  if (!row) return null;

  const candidates = ['otp', 'OTP', 'vOTP', 'codigo_otp', 'token'];
  for (const key of candidates) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }

  const fallback = extractScalar(row);
  return fallback == null ? null : String(fallback);
}

function extractNumericResult(rows) {
  const row = firstRow(rows);
  const value = row && typeof row === 'object' ? extractScalar(row) : row;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toUpperText(value) {
  return String(value ?? '').trim().toUpperCase();
}

function toPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intVal = Math.trunc(parsed);
  return intVal > 0 ? intVal : null;
}

function findFieldValueByName(row, patterns) {
  if (!row || typeof row !== 'object') return undefined;
  const keys = Object.keys(row);
  for (const key of keys) {
    const normalized = toUpperText(key).replace(/[^A-Z0-9]/g, '');
    for (const pattern of patterns) {
      if (normalized.includes(pattern)) {
        return row[key];
      }
    }
  }
  return undefined;
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

function sanitizeLaunchBaseUrl(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) {
    throw new Error('linktolaunch vacio');
  }

  // Permite rutas relativas seguras (/CUx-xxx) y URLs absolutas http(s).
  const isRelativePath = text.startsWith('/');
  let parsed;
  try {
    parsed = isRelativePath ? new URL(text, 'http://local.invalid') : new URL(text);
  } catch {
    throw new Error('linktolaunch invalido');
  }

  if (!isRelativePath) {
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('linktolaunch debe usar protocolo http(s)');
    }
    if (parsed.username || parsed.password) {
      throw new Error('linktolaunch no debe incluir credenciales');
    }
  }

  if (!/\/CU\d+/i.test(parsed.pathname)) {
    throw new Error('linktolaunch no apunta a un caso de uso valido');
  }

  parsed.hash = '';
  return isRelativePath ? `${parsed.pathname}${parsed.search}` : parsed.toString();
}

function apiError(res, context, error, status = 500) {
  console.error(`[${new Date().toISOString()}] ${context}:`, error?.message || error);
  const resolvedStatus = Number(error?.status || status) || 500;
  const safeDetail = resolvedStatus >= 500 && IS_PROD
    ? 'Error interno del servicio'
    : (error?.message || 'Error desconocido');
  return res.status(resolvedStatus).json({
    ok: false,
    error: `Fallo en ${context}`,
    detail: safeDetail,
  });
}

const runtime = loadConfig();
const pool = mysql.createPool(runtime.db);
const sessions = new Map();
setInterval(pruneExpiredSessions, 60_000).unref();

function pruneExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function createSession(userId) {
  pruneExpiredSessions();
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, {
    userId: String(userId),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function readSessionToken(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.headers['x-session-token'] || '').trim();
}

function requireAuth(req, res, next) {
  pruneExpiredSessions();
  const token = readSessionToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, code: 0, message: UNAUTHORIZED_MSG });
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ ok: false, code: 0, message: UNAUTHORIZED_MSG });
  }

  session.expiresAt = Date.now() + SESSION_TTL_MS;
  req.auth = { token, userId: session.userId };
  return next();
}

async function validateOtp(codigoUsuario, otp) {
  await pool.query('CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
  const [resultRows] = await pool.query('SELECT @p_resultado AS resultado');
  return extractNumericResult(resultRows);
}

async function loadPrivData(vUsuario) {
  const [privRaw] = await pool.query('CALL get_priv_usuario(?)', [vUsuario]);
  const privRow = firstRow(normalizeRows(privRaw));
  if (!privRow) {
    return { vPriv: '', vBase: '' };
  }

  const values = Object.values(privRow || {});
  const baseFromNamedField = findFieldValueByName(privRow, ['CODIGOBASE', 'VCODIGOBASE', 'BASE']);
  const privFromNamedField = findFieldValueByName(privRow, ['VPRIVBASES', 'PRIVILEGIO', 'PRIV']);

  const privFromValues = values.find((value) => {
    const token = toUpperText(value);
    return token === 'ONE' || token === 'ALL' || token === 'PRIV';
  });

  const numericValues = values
    .map((value) => toPositiveInt(value))
    .filter((value) => value !== null);

  const vBaseCandidate =
    toPositiveInt(baseFromNamedField) ??
    (numericValues.length > 1 ? numericValues[numericValues.length - 1] : numericValues[0] ?? null);
  const vBase = vBaseCandidate ? String(vBaseCandidate) : '';

  const vPrivRaw = toUpperText(privFromNamedField ?? privFromValues ?? '');
  const vPriv = vPrivRaw === 'PRIV' ? 'ALL' : vPrivRaw;

  return { vPriv, vBase };
}

async function assertActionAllowed(vUsuario, vUseCase) {
  const privData = await loadPrivData(vUsuario);
  if (privData.vPriv === 'ONE' && vUseCase !== 'CU2002') {
    const err = new Error('ACTION_NOT_ALLOWED_ONE');
    err.status = 403;
    throw err;
  }
  return privData;
}

function filterPackagesByPrivilege(packages, privData) {
  if (!Array.isArray(packages) || packages.length === 0) return [];

  const vPriv = toUpperText(privData?.vPriv);
  const baseCode = toPositiveInt(privData?.vBase);
  const isGlobalScope = vPriv === 'ALL' || vPriv === 'PRIV';
  if (!baseCode || isGlobalScope) {
    return packages;
  }

  return packages.filter((row) => toPositiveInt(row?.codigo_base) === baseCode);
}

async function getAuthorizedPackages(vUsuario, privData = null) {
  const resolvedPriv = privData || (await loadPrivData(vUsuario));
  const [packRaw] = await pool.query('CALL get_paquetes(NOW(), ?)', [vUsuario]);
  const packages = normalizeRows(packRaw);
  return {
    packages: filterPackagesByPrivilege(packages, resolvedPriv),
    privData: resolvedPriv,
  };
}

async function runBoardAndPackages(vUsuario) {
  const [boardRaw] = await pool.query('CALL get_tablero(?)', ['PAQ']);
  const columns = normalizeRows(boardRaw).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));

  const { packages } = await getAuthorizedPackages(vUsuario);
  packages.sort((a, b) => Number(a.columna) - Number(b.columna));

  return { columns, packages, vUsuario };
}

async function assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, expectedColumn) {
  const { packages } = await getAuthorizedPackages(vUsuario);

  const target = packages.find(
    (row) =>
      String(row?.tipo_documento || '').trim() === String(ptipo_documento || '').trim() &&
      String(row?.codigo_paquete || '').trim() === String(pcodigo_paquete || '').trim()
  );

  if (!target) {
    const err = new Error('PACKAGE_NOT_ALLOWED');
    err.status = 403;
    throw err;
  }

  const column = Number(target.columna);
  if (!Number.isFinite(column) || column !== Number(expectedColumn)) {
    const err = new Error('PACKAGE_INVALID_STATE');
    err.status = 422;
    throw err;
  }

  return target;
}

async function launchUseCase(codigoUseCase, vUsuario, extraQuery = {}) {
  const [otpRaw] = await pool.query('CALL generar_otp_usuario(?)', [vUsuario]);
  const vOTP = extractOtp(normalizeRows(otpRaw));
  if (!vOTP) {
    throw new Error('SP generar_otp_usuario no retorno OTP valido');
  }

  const [linkRaw] = await pool.query('CALL get_usecase_link(?)', [codigoUseCase]);
  const linkRow = firstRow(normalizeRows(linkRaw));
  const linkToLaunch = sanitizeLaunchBaseUrl(linkRow?.linktolaunch);
  if (!linkToLaunch) {
    throw new Error(`SP get_usecase_link(${codigoUseCase}) no retorno linktolaunch`);
  }

  return {
    ok: true,
    useCase: codigoUseCase,
    vUsuario,
    launchUrl: appendQuery(linkToLaunch, { vUsuario, vOTP, ...extraQuery }),
  };
}

app.get('/api/init', async (req, res) => {
  const codigoUsuario = String(req.query.Codigo_usuario || '').trim();
  const otp = String(req.query.OTP || '').trim();
  const vParametros = req.query.vParametros;

  if (!codigoUsuario || !otp) {
    return res.status(401).json({ ok: false, code: 0, message: UNAUTHORIZED_MSG });
  }

  try {
    const otpCode = await validateOtp(codigoUsuario, otp);
    if (otpCode !== 1) {
      return res.status(401).json({ ok: false, code: otpCode, message: UNAUTHORIZED_MSG });
    }
    const sessionToken = createSession(codigoUsuario);

    let parsedParametros = null;
    if (typeof vParametros === 'string' && vParametros.trim() !== '') {
      try {
        parsedParametros = JSON.parse(vParametros);
      } catch {
        parsedParametros = vParametros;
      }
    }

    const boardData = await runBoardAndPackages(codigoUsuario);
    const privData = await loadPrivData(codigoUsuario);
    return res.json({
      ok: true,
      code: 1,
      message: 'OK',
      ...boardData,
      vPriv: privData.vPriv,
      vBase: privData.vBase,
      vParametros: parsedParametros,
      sessionToken,
      sessionExpiresInMs: SESSION_TTL_MS,
    });
  } catch (error) {
    return apiError(res, 'init', error);
  }
});

app.get('/api/productos', requireAuth, async (req, res) => {
  const tipoDocumento = String(req.query.tipo_documento || '').trim();
  const codigoPaquete = String(req.query.codigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!tipoDocumento || !codigoPaquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'tipo_documento, codigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    const { packages: authorizedPackages } = await getAuthorizedPackages(vUsuario);
    const allowed = authorizedPackages.some(
      (row) =>
        String(row?.tipo_documento || '').trim() === tipoDocumento &&
        String(row?.codigo_paquete || '').trim() === codigoPaquete
    );
    if (!allowed) {
      return res.status(403).json({
        ok: false,
        error: 'No autorizado',
        detail: 'El paquete no pertenece al alcance del usuario',
      });
    }

    const [raw] = await pool.query('CALL get_productos_pkte(?, ?)', [tipoDocumento, codigoPaquete]);
    const rows = normalizeRows(raw).sort((a, b) => Number(a.ordinal) - Number(b.ordinal));
    return res.json({ ok: true, rows });
  } catch (error) {
    return apiError(res, 'get_productos_pkte', error);
  }
});

app.post('/api/empacar', requireAuth, async (req, res) => {
  const ptipo_documento = String(req.body?.ptipo_documento || '').trim();
  const pcodigo_paquete = String(req.body?.pcodigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!ptipo_documento || !pcodigo_paquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'ptipo_documento, pcodigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    const vUseCaseToLaunch = 'CU2002';
    await assertActionAllowed(vUsuario, vUseCaseToLaunch);
    await assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, 1);
    const result = await launchUseCase(vUseCaseToLaunch, vUsuario, {
      ptipo_documento,
      pcodigo_paquete,
      tipo_documento: ptipo_documento,
      codigo_paquete: pcodigo_paquete
    });
    return res.json(result);
  } catch (error) {
    return apiError(res, 'Empacar', error);
  }
});

app.post('/api/liquidar', requireAuth, async (req, res) => {
  const ptipo_documento = String(req.body?.ptipo_documento || '').trim();
  const pcodigo_paquete = String(req.body?.pcodigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!ptipo_documento || !pcodigo_paquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'ptipo_documento, pcodigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    await assertActionAllowed(vUsuario, 'CU003');
    await assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, 3);
    const result = await launchUseCase('CU003', vUsuario, {
      ptipo_documento,
      pcodigo_paquete,
      tipo_documento: ptipo_documento,
      codigo_paquete: pcodigo_paquete
    });
    return res.json(result);
  } catch (error) {
    return apiError(res, 'liquidarpaquete', error);
  }
});

app.post('/api/standby', requireAuth, async (req, res) => {
  const ptipo_documento = String(req.body?.ptipo_documento || '').trim();
  const pcodigo_paquete = String(req.body?.pcodigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!ptipo_documento || !pcodigo_paquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'ptipo_documento, pcodigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    await assertActionAllowed(vUsuario, 'CU004');
    await assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, 4);
    const result = await launchUseCase('CU004', vUsuario, {
      ptipo_documento,
      pcodigo_paquete,
      tipo_documento: ptipo_documento,
      codigo_paquete: pcodigo_paquete
    });
    return res.json(result);
  } catch (error) {
    return apiError(res, 'procesarStandBy', error);
  }
});

app.post('/api/liquidarpaquete', requireAuth, async (req, res) => {
  const ptipo_documento = String(req.body?.ptipo_documento || '').trim();
  const pcodigo_paquete = String(req.body?.pcodigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!ptipo_documento || !pcodigo_paquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'ptipo_documento, pcodigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    await assertActionAllowed(vUsuario, 'CU003');
    await assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, 3);
    const result = await launchUseCase('CU003', vUsuario, {
      ptipo_documento,
      pcodigo_paquete,
      tipo_documento: ptipo_documento,
      codigo_paquete: pcodigo_paquete
    });
    return res.json(result);
  } catch (error) {
    return apiError(res, 'liquidarpaquete', error);
  }
});

app.post('/api/procesarStandBy', requireAuth, async (req, res) => {
  const ptipo_documento = String(req.body?.ptipo_documento || '').trim();
  const pcodigo_paquete = String(req.body?.pcodigo_paquete || '').trim();
  const vUsuario = String(req.auth?.userId || '').trim();

  if (!ptipo_documento || !pcodigo_paquete || !vUsuario) {
    return res.status(400).json({
      ok: false,
      error: 'Parametros invalidos',
      detail: 'ptipo_documento, pcodigo_paquete y autenticacion son obligatorios',
    });
  }

  try {
    await assertActionAllowed(vUsuario, 'CU004');
    await assertPackageForAction(vUsuario, ptipo_documento, pcodigo_paquete, 4);
    const result = await launchUseCase('CU004', vUsuario, {
      ptipo_documento,
      pcodigo_paquete,
      tipo_documento: ptipo_documento,
      codigo_paquete: pcodigo_paquete
    });
    return res.json(result);
  } catch (error) {
    return apiError(res, 'procesarStandBy', error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ConsolaPaquetes',
    port: runtime.port,
    env: process.env.NODE_ENV || 'development',
    uptimeSec: Math.round(process.uptime()),
  });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, ready: true });
  } catch (error) {
    return res.status(503).json({ ok: false, ready: false, detail: 'DB_NOT_READY' });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Compatibilidad con links de launcher (CU7001 -> /CU7-001).
app.get(['/CU7-001', '/CU7-001/', '/CU7001', '/CU7001/'], (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

const server = app.listen(runtime.port, () => {
  console.log(`Consola Paquetes corriendo en puerto ${runtime.port}`);
  console.log(`MySQL: ${runtime.db.host}:${runtime.db.port}/${runtime.db.database}`);
});

let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Cerrando Consola Paquetes por señal ${signal}...`);

  server.close(async () => {
    try {
      await pool.end();
      console.log('Pool MySQL cerrado.');
    } catch (error) {
      console.error('Error cerrando pool MySQL:', error?.message || error);
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('Forzando salida por timeout de cierre.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('UncaughtException:', error);
});
