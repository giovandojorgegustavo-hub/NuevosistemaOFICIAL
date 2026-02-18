const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const mysql = require('mysql2/promise');
const path = require('path');
const yaml = require('yaml');

const APP_PREFIX = 'CL01';
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const ERP_CONFIG_PATH = path.join(ROOT_DIR, '..', '..', 'erp.yml');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

let logStream = null;
let dbPool = null;
let modulePorts = {
  1: 4000,
  2: 4001,
  3: 4002,
  4: 4003
};
const sessions = new Map();

const TEXT = {
  es: {
    login_ok: 'Login exitoso.',
    user_not_found: 'Usuario erróneo.',
    password_invalid: 'Password errónea.',
    credentials_required: 'Usuario y password son obligatorios.',
    session_required: 'Sesión inválida o expirada.',
    menu_error: 'No se pudo obtener el menú del usuario.',
    usecase_required: 'Debe indicar el caso de uso.',
    usecase_forbidden: 'El caso de uso no pertenece al usuario logueado.',
    otp_error: 'No fue posible generar OTP.',
    logout_ok: 'Sesión cerrada correctamente.',
    internal_error: 'Error interno del launcher.'
  },
  en: {
    login_ok: 'Login successful.',
    user_not_found: 'Invalid user.',
    password_invalid: 'Invalid password.',
    credentials_required: 'User and password are required.',
    session_required: 'Session is invalid or expired.',
    menu_error: 'Unable to load user menu.',
    usecase_required: 'Use case is required.',
    usecase_forbidden: 'Use case is not assigned to this user.',
    otp_error: 'Unable to generate OTP.',
    logout_ok: 'Session closed.',
    internal_error: 'Launcher internal error.'
  }
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function logTimestamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

function compactTimestamp(date = new Date()) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes()
  )}${pad(date.getSeconds())}`;
}

function createExecutionLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const baseName = `${APP_PREFIX}-${compactTimestamp()}`;
  let suffix = 1;
  let filename;
  do {
    filename = `${baseName}-${String(suffix).padStart(3, '0')}.log`;
    suffix += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  return path.join(LOG_DIR, filename);
}

function writeLog(level, message) {
  const line = `[${logTimestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (logStream) {
    logStream.write(`${line}\n`);
  }
}

function logInfo(message) {
  writeLog('INFO', message);
}

function logWarn(message) {
  writeLog('WARN', message);
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  writeLog('ERROR', context ? `${context} | ${detail}` : detail);
}

function logSql(sql, params) {
  const serialized = Array.isArray(params) ? JSON.stringify(params) : '[]';
  writeLog('SQL', `${sql} | params=${serialized}`);
}

function normalizeLocale(acceptLanguage) {
  const header = String(acceptLanguage || '').toLowerCase();
  if (header.startsWith('es')) return 'es';
  if (header.includes(',es')) return 'es';
  return 'en';
}

function t(locale, key) {
  const selected = TEXT[locale] ? locale : 'es';
  return TEXT[selected][key] || TEXT.es[key] || key;
}

function parseDsn(dsn) {
  const tcpMatch = String(dsn).match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (tcpMatch) {
    return {
      user: decodeURIComponent(tcpMatch[1]),
      password: decodeURIComponent(tcpMatch[2]),
      host: tcpMatch[3],
      port: Number(tcpMatch[4]),
      database: tcpMatch[5]
    };
  }

  const parsed = new URL(dsn);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    database: parsed.pathname.replace('/', '')
  };
}

function asPort(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function loadErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  const config = yaml.parse(raw) || {};

  if (!Array.isArray(config.connections) || config.connections.length === 0) {
    throw new Error('erp.yml no contiene connections[0]');
  }
  const connection = config.connections[0];
  if (!connection || !connection.dsn) {
    throw new Error('erp.yml no contiene connections[0].dsn');
  }

  const launcherPort = asPort(config.bk_launcher) || asPort(config.main_port) || 2026;
  const ports = {
    1: asPort(config.bk_modulo1_port) || 4000,
    2: asPort(config.bk_modulo2_port) || 4001,
    3: asPort(config.bk_modulo3_port) || 4002,
    4: asPort(config.bk_modulo4_port) || 4003
  };

  return {
    launcherPort,
    modulePorts: ports,
    connection: {
      dsn: connection.dsn,
      name: connection.name || ''
    }
  };
}

function ipFromRequest(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '0.0.0.0';
}

function sanitizeText(value, maxLen = 255) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function readToken(req) {
  const auth = String(req.headers.authorization || '').trim();
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const headerToken = String(req.headers['x-session-token'] || '').trim();
  if (headerToken) return headerToken;
  const bodyToken = sanitizeText(req.body?.token || req.body?.sessionToken, 512);
  return bodyToken || '';
}

function requireSession(req, res, next) {
  const locale = normalizeLocale(req.headers['accept-language']);
  const token = readToken(req);
  if (!token || !sessions.has(token)) {
    return res.status(401).json({
      ok: false,
      errorKey: 'SESSION_REQUIRED',
      message: t(locale, 'session_required')
    });
  }
  const session = sessions.get(token);
  if (Date.now() - session.lastSeenAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return res.status(401).json({
      ok: false,
      errorKey: 'SESSION_REQUIRED',
      message: t(locale, 'session_required')
    });
  }
  session.lastSeenAt = Date.now();
  req.auth = { token, session };
  return next();
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.lastSeenAt > SESSION_TTL_MS) {
      sessions.delete(token);
    }
  }
}

function unwrapProcedureRows(rows) {
  if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
    return rows[0];
  }
  if (Array.isArray(rows)) {
    return rows;
  }
  return [];
}

function getFirstValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = getFirstValue(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = getFirstValue(value[key]);
      if (found) return found;
    }
  }
  return null;
}

function extractOtp(rows) {
  const procRows = unwrapProcedureRows(rows);
  if (!procRows.length) return '';

  const row = procRows[0];
  if (row && typeof row === 'object') {
    if (row.otp !== undefined && row.otp !== null) {
      return String(row.otp);
    }
    const candidate = getFirstValue(row);
    return candidate ? String(candidate) : '';
  }
  if (typeof row === 'string' || typeof row === 'number') {
    return String(row);
  }
  return '';
}

function resolveProtocol(req) {
  const forwarded = String(req.headers['x-forwarded-proto'] || '').trim();
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.protocol || 'http';
}

function moduleNumberByCode(moduloCode) {
  const code = String(moduloCode || '').trim().toUpperCase();
  if (code === 'VENTAS' || code === 'MODULO 1' || code === 'M1') return 1;
  if (code === 'BASE' || code === 'MODULO 2' || code === 'M2') return 2;
  if (code === 'COMPRAS' || code === 'MODULO 3' || code === 'M3') return 3;
  if (code === 'OPERACIONES' || code === 'MODULO 4' || code === 'M4') return 4;
  return null;
}

function resolveUsecasePath(linkToLaunch, codigoUsecase, moduleNumber) {
  const rawLink = sanitizeText(linkToLaunch, 4096);
  if (rawLink) {
    try {
      const parsed = new URL(rawLink);
      if (parsed.pathname && parsed.pathname !== '/') {
        return parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
      }
    } catch {
      if (rawLink.startsWith('/')) return rawLink;
      if (rawLink.includes('/')) return `/${rawLink.replace(/^\/+/, '')}`;
    }
  }

  const code = String(codigoUsecase || '').toUpperCase();
  const digitsMatch = code.match(/\d+/);
  const digits = digitsMatch ? digitsMatch[0] : '';

  if (digits.length >= 4) {
    const mod = Number(digits[0]);
    const seq = digits.slice(1).padStart(3, '0').slice(-3);
    return `/CU${mod}-${seq}`;
  }
  if (digits.length === 3 && moduleNumber) {
    return `/CU${moduleNumber}-${digits}`;
  }
  if (digits.length > 0 && moduleNumber) {
    return `/CU${moduleNumber}-${digits.padStart(3, '0').slice(-3)}`;
  }
  if (code) return `/${code}`;
  return '/';
}

function resolveModuleNumber(row, usecasePath) {
  const byCode = moduleNumberByCode(row.codigo_modulo);
  if (byCode) return byCode;

  const pathMatch = String(usecasePath || '').toUpperCase().match(/^\/CU([1-4])-/);
  if (pathMatch) return Number(pathMatch[1]);

  const ucCode = String(row.codigo_usecase || '').toUpperCase();
  const codeMatch = ucCode.match(/^CU([1-4])\d{3}$/);
  if (codeMatch) return Number(codeMatch[1]);

  return 1;
}

function buildModuleTitle(row) {
  return sanitizeText(row.descripcion, 128) || sanitizeText(row.codigo_modulo, 64) || 'Modulo';
}

function normalizeMenuRows(rows, req) {
  const protocol = resolveProtocol(req);
  const host = req.hostname || 'localhost';
  const modulesByCode = new Map();

  for (const row of rows) {
    const codigoUsecase = sanitizeText(row.codigo_usecase, 64);
    if (!codigoUsecase) continue;

    const moduleCode = sanitizeText(row.codigo_modulo, 64) || 'MODULO';
    const moduleTitle = buildModuleTitle(row);
    const pathToUsecase = resolveUsecasePath(row.linktolaunch, codigoUsecase, moduleNumberByCode(moduleCode));
    const moduleNumber = resolveModuleNumber(row, pathToUsecase);
    const modulePort = modulePorts[moduleNumber] || modulePorts[1];
    const usecaseCaption = sanitizeText(row.caption, 128) || codigoUsecase;
    const moduleKey = `${moduleNumber}:${moduleCode}`;

    if (!modulesByCode.has(moduleKey)) {
      modulesByCode.set(moduleKey, {
        codigo_modulo: moduleCode,
        titulo: moduleTitle,
        modulo_numero: moduleNumber,
        puerto: modulePort,
        usecases: []
      });
    }

    modulesByCode.get(moduleKey).usecases.push({
      codigo_usecase: codigoUsecase,
      caption: usecaseCaption,
      icono: sanitizeText(row.icono, 80) || 'fa-solid fa-cube',
      path: pathToUsecase,
      launch_base_url: `${protocol}://${host}:${modulePort}${pathToUsecase}`
    });
  }

  return Array.from(modulesByCode.values())
    .sort((a, b) => a.modulo_numero - b.modulo_numero || a.codigo_modulo.localeCompare(b.codigo_modulo))
    .map((module) => ({
      codigo_modulo: module.codigo_modulo,
      titulo: module.titulo,
      modulo_numero: module.modulo_numero,
      puerto: module.puerto,
      usecases: module.usecases.sort((a, b) => a.codigo_usecase.localeCompare(b.codigo_usecase))
    }));
}

async function runSql(sql, params = []) {
  logSql(sql, params);
  return dbPool.query(sql, params);
}

async function safeInsertFailedLogin(codigoUsuario, usuarioInput, ip, mensaje) {
  try {
    await runSql(
      'INSERT INTO login_fallido (codigo_usuario, usuario_input, ip, mensaje) VALUES (?, ?, ?, ?)',
      [codigoUsuario || null, sanitizeText(usuarioInput, 128), sanitizeText(ip, 128), sanitizeText(mensaje, 256)]
    );
  } catch (error) {
    logError(error, 'No se pudo guardar login_fallido');
  }
}

async function safeInsertAppError(codigoUsuario, mensaje, detalle) {
  try {
    await runSql('INSERT INTO errores_app (codigo_usuario, mensaje, detalle) VALUES (?, ?, ?)', [
      codigoUsuario || null,
      sanitizeText(mensaje, 512),
      sanitizeText(detalle, 8000)
    ]);
  } catch (error) {
    logError(error, 'No se pudo guardar errores_app');
  }
}

async function safeLogTrace(codigoUsuario, codigoUsecase) {
  try {
    await runSql('CALL log_traza_sesion(?, ?)', [codigoUsuario, codigoUsecase]);
  } catch (error) {
    logError(error, 'No se pudo guardar traza de sesion');
  }
}

async function logSessionStart(codigoUsuario, ip) {
  await runSql('INSERT INTO sesiones (codigo_usuario, ip) VALUES (?, ?)', [codigoUsuario, sanitizeText(ip, 128)]);
}

async function logSessionLogout(codigoUsuario, ip) {
  await runSql('UPDATE sesiones SET timestmp = NOW() WHERE codigo_usuario = ? AND ip = ? ORDER BY login_time DESC LIMIT 1', [
    codigoUsuario,
    sanitizeText(ip, 128)
  ]);
}

async function validateCredentials(vUsuario, vPassword) {
  const [rows] = await runSql('CALL validar_credenciales_usuario(?, ?)', [vUsuario, vPassword]);
  const matches = unwrapProcedureRows(rows);
  if (matches.length > 0) {
    const user = matches[0];
    return {
      code: 0,
      codigo_usuario: sanitizeText(user.codigo_usuario, 36) || sanitizeText(vUsuario, 36),
      nombre: sanitizeText(user.nombre, 128) || sanitizeText(vUsuario, 128)
    };
  }

  const [knownUsers] = await runSql(
    `SELECT codigo_usuario, nombre
     FROM usuarios
     WHERE (codigo_usuario COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
       OR nombre COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci
       OR CAST(numero AS CHAR) COLLATE utf8mb4_unicode_ci = ? COLLATE utf8mb4_unicode_ci)
     LIMIT 1`,
    [vUsuario, vUsuario, vUsuario]
  );

  if (!Array.isArray(knownUsers) || knownUsers.length === 0) {
    return { code: 1, codigo_usuario: null, nombre: null };
  }
  return {
    code: 2,
    codigo_usuario: sanitizeText(knownUsers[0].codigo_usuario, 36),
    nombre: sanitizeText(knownUsers[0].nombre, 128)
  };
}

async function getMenuForUser(codigoUsuario, req) {
  const [rows] = await runSql('CALL get_usecases_usuario(?)', [codigoUsuario]);
  const procRows = unwrapProcedureRows(rows);
  return normalizeMenuRows(procRows, req);
}

function buildLaunchUrl(req, launchBaseUrl, userId, otp) {
  const parsed = new URL(launchBaseUrl);
  parsed.searchParams.set('vUsuario', userId);
  parsed.searchParams.set('vOTP', otp);
  return parsed.toString();
}

function registerSession(userId, nombre, ip) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    token,
    userId,
    nombre,
    ip,
    lastSeenAt: Date.now()
  });
  return token;
}

async function createServer() {
  const config = loadErpConfig();
  const parsedDsn = parseDsn(config.connection.dsn);
  const dbName = config.connection.name || parsedDsn.database;

  modulePorts = config.modulePorts;

  logInfo(`DB CONFIG | dsn=${config.connection.dsn} | name=${dbName}`);
  logInfo(`PORT CONFIG | launcher=${config.launcherPort} | modulePorts=${JSON.stringify(modulePorts)}`);

  dbPool = mysql.createPool({
    ...parsedDsn,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await runSql('SELECT 1 AS ok');

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    logInfo(`ENDPOINT ${req.method} ${req.originalUrl} | ip=${ipFromRequest(req)}`);
    res.on('finish', () => {
      logInfo(`ENDPOINT_DONE ${req.method} ${req.originalUrl} | status=${res.statusCode}`);
    });
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      app: APP_PREFIX,
      port: config.launcherPort,
      sessions: sessions.size
    });
  });

  app.post('/api/login', async (req, res) => {
    const locale = normalizeLocale(req.headers['accept-language']);
    const vUsuario = sanitizeText(req.body?.vUsuario, 128);
    const vPassword = sanitizeText(req.body?.vPassword, 255);
    const ip = ipFromRequest(req);

    if (!vUsuario || !vPassword) {
      return res.status(400).json({
        ok: false,
        errorKey: 'CREDENTIALS_REQUIRED',
        message: t(locale, 'credentials_required')
      });
    }

    try {
      const validation = await validateCredentials(vUsuario, vPassword);
      if (validation.code !== 0) {
        const message = validation.code === 1 ? t(locale, 'user_not_found') : t(locale, 'password_invalid');
        logWarn(`LOGIN_FAIL usuario_input=${vUsuario} motivo=${message} ip=${ip}`);
        await safeInsertFailedLogin(validation.codigo_usuario, vUsuario, ip, message);

        return res.status(401).json({
          ok: false,
          code: validation.code,
          errorKey: validation.code === 1 ? 'USER_NOT_FOUND' : 'PASSWORD_INVALID',
          message
        });
      }

      await logSessionStart(validation.codigo_usuario, ip);
      const token = registerSession(validation.codigo_usuario, validation.nombre, ip);
      const menu = await getMenuForUser(validation.codigo_usuario, req);
      logInfo(`LOGIN_OK usuario=${validation.codigo_usuario} ip=${ip}`);

      return res.json({
        ok: true,
        code: 0,
        token,
        user: {
          codigo_usuario: validation.codigo_usuario,
          nombre: validation.nombre
        },
        menu,
        message: t(locale, 'login_ok')
      });
    } catch (error) {
      logError(error, 'POST /api/login');
      await safeInsertAppError(vUsuario || null, 'Error en login launcher', String(error.message || error));
      return res.status(500).json({
        ok: false,
        errorKey: 'INTERNAL_ERROR',
        message: t(locale, 'internal_error')
      });
    }
  });

  app.get('/api/menu', requireSession, async (req, res) => {
    const locale = normalizeLocale(req.headers['accept-language']);
    try {
      const { userId, nombre } = req.auth.session;
      const menu = await getMenuForUser(userId, req);
      return res.json({
        ok: true,
        user: {
          codigo_usuario: userId,
          nombre
        },
        menu
      });
    } catch (error) {
      logError(error, 'GET /api/menu');
      await safeInsertAppError(req.auth?.session?.userId || null, 'Error obteniendo menu', String(error.message || error));
      return res.status(500).json({
        ok: false,
        errorKey: 'MENU_ERROR',
        message: t(locale, 'menu_error')
      });
    }
  });

  app.post('/api/otp', requireSession, async (req, res) => {
    const locale = normalizeLocale(req.headers['accept-language']);
    const codigoUsecase = sanitizeText(req.body?.codigo_usecase || req.body?.codigoUsecase, 64).toUpperCase();
    const { userId } = req.auth.session;

    if (!codigoUsecase) {
      return res.status(400).json({
        ok: false,
        errorKey: 'USECASE_REQUIRED',
        message: t(locale, 'usecase_required')
      });
    }

    try {
      const menu = await getMenuForUser(userId, req);
      const usecases = menu.flatMap((module) => module.usecases);
      const selected = usecases.find((item) => String(item.codigo_usecase || '').toUpperCase() === codigoUsecase);

      if (!selected) {
        logWarn(`OTP_DENIED usuario=${userId} usecase=${codigoUsecase}`);
        return res.status(403).json({
          ok: false,
          errorKey: 'USECASE_FORBIDDEN',
          message: t(locale, 'usecase_forbidden')
        });
      }

      const [otpRows] = await runSql('CALL generar_otp_usuario(?)', [userId]);
      const otp = sanitizeText(extractOtp(otpRows), 6);
      if (!otp) {
        throw new Error('SP generar_otp_usuario no devolvio OTP');
      }

      const launchUrl = buildLaunchUrl(req, selected.launch_base_url, userId, otp);
      await safeLogTrace(userId, selected.codigo_usecase);
      logInfo(`TRACE_NAV usuario=${userId} usecase=${selected.codigo_usecase} launch=${launchUrl}`);

      return res.json({
        ok: true,
        codigo_usecase: selected.codigo_usecase,
        launchUrl
      });
    } catch (error) {
      logError(error, 'POST /api/otp');
      await safeInsertAppError(userId || null, `Error OTP ${codigoUsecase}`, String(error.message || error));
      return res.status(500).json({
        ok: false,
        errorKey: 'OTP_ERROR',
        message: t(locale, 'otp_error')
      });
    }
  });

  app.post('/api/logout', requireSession, async (req, res) => {
    const locale = normalizeLocale(req.headers['accept-language']);
    const { token, session } = req.auth;
    try {
      await logSessionLogout(session.userId, session.ip);
      sessions.delete(token);
      logInfo(`LOGOUT usuario=${session.userId} ip=${session.ip}`);
      return res.json({
        ok: true,
        message: t(locale, 'logout_ok')
      });
    } catch (error) {
      logError(error, 'POST /api/logout');
      await safeInsertAppError(session.userId || null, 'Error en logout', String(error.message || error));
      return res.status(500).json({
        ok: false,
        errorKey: 'INTERNAL_ERROR',
        message: t(locale, 'internal_error')
      });
    }
  });

  app.use(express.static(PUBLIC_DIR));

  app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  });

  app.use((error, req, res, next) => {
    const locale = normalizeLocale(req.headers['accept-language']);
    logError(error, 'Express error middleware');
    safeInsertAppError(req.auth?.session?.userId || null, 'Unhandled express error', String(error.message || error)).catch(() => {});
    res.status(500).json({
      ok: false,
      errorKey: 'INTERNAL_ERROR',
      message: t(locale, 'internal_error')
    });
  });

  const server = app.listen(config.launcherPort, () => {
    logInfo(`SERVER_START ${APP_PREFIX} escuchando en http://localhost:${config.launcherPort}`);
  });

  const gracefulShutdown = async () => {
    logInfo('SERVER_STOP iniciando cierre de recursos');
    clearInterval(cleanupInterval);
    server.close(() => {
      logInfo('HTTP server cerrado');
    });
    try {
      if (dbPool) await dbPool.end();
    } catch (error) {
      logError(error, 'Cerrando pool MySQL');
    }
    if (logStream) {
      logStream.end();
    }
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

const cleanupInterval = setInterval(cleanupSessions, 60 * 1000);
cleanupInterval.unref();

async function bootstrap() {
  const logPath = createExecutionLogFile();
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logInfo(`LOG_FILE ${path.basename(logPath)}`);

  try {
    await createServer();
  } catch (error) {
    logError(error, 'Fallo al iniciar launcher CL01');
    if (logStream) logStream.end();
    process.exit(1);
  }
}

bootstrap();
