const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU6-002';
const PORT = Number(process.env.PORT || getUseCasePort('CU6-002'));
const UNAUTHORIZED_MESSAGE = 'Warning ACCESO NO AUTORIZADO !!!';
const SESSION_COOKIE_NAME = 'cu6002_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const sessions = new Map();

function pad(vValue) {
  return String(vValue).padStart(2, '0');
}

function timestamp() {
  const vNow = new Date();
  return `${vNow.getFullYear()}-${pad(vNow.getMonth() + 1)}-${pad(vNow.getDate())} ${pad(vNow.getHours())}:${pad(
    vNow.getMinutes()
  )}:${pad(vNow.getSeconds())}`;
}

function formatDateForDb(vDate = new Date()) {
  return `${vDate.getFullYear()}-${pad(vDate.getMonth() + 1)}-${pad(vDate.getDate())} ${pad(vDate.getHours())}:${pad(
    vDate.getMinutes()
  )}:${pad(vDate.getSeconds())}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const vNow = new Date();
  const vBase = `${LOG_PREFIX}-${vNow.getFullYear()}${pad(vNow.getMonth() + 1)}${pad(vNow.getDate())}-${pad(
    vNow.getHours()
  )}${pad(vNow.getMinutes())}${pad(vNow.getSeconds())}`;
  let vCounter = 1;
  let vFilename = '';

  do {
    const vSuffix = String(vCounter).padStart(3, '0');
    vFilename = `${vBase}-${vSuffix}.log`;
    vCounter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, vFilename)));

  global.vLogFileName = vFilename;
  global.vLogFilePath = path.join(LOG_DIR, vFilename);
  global.vLogStream = fs.createWriteStream(global.vLogFilePath, { flags: 'a' });
  logLine(`LOG FILE: ${vFilename}`);
}

function logLine(vMessage, vLevel = 'INFO') {
  const vLine = `[${timestamp()}] [${vLevel}] ${vMessage}`;
  if (vLevel === 'ERROR') {
    console.error(vLine);
  } else {
    console.log(vLine);
  }
  if (global.vLogStream) {
    global.vLogStream.write(`${vLine}\n`);
  }
}

function logError(vError, vContext) {
  const vDetail = vError && vError.stack ? vError.stack : String(vError);
  const vMessage = vContext ? `${vContext} | ${vDetail}` : vDetail;
  logLine(vMessage, 'ERROR');
}

function parseDsn(vDsn) {
  const vTcpMatch = vDsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (vTcpMatch) {
    return {
      user: decodeURIComponent(vTcpMatch[1]),
      password: decodeURIComponent(vTcpMatch[2]),
      host: vTcpMatch[3],
      port: Number(vTcpMatch[4]),
      database: vTcpMatch[5]
    };
  }

  const vParsed = new URL(vDsn);
  return {
    user: decodeURIComponent(vParsed.username),
    password: decodeURIComponent(vParsed.password),
    host: vParsed.hostname,
    port: Number(vParsed.port || 3306),
    database: vParsed.pathname.replace('/', '')
  };
}

function parseErpConfig() {
  const vRaw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const vData = yaml.parse(vRaw);
  if (!vData || !Array.isArray(vData.connections) || !vData.connections.length) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }

  const vConnection = vData.connections[0];
  if (!vConnection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }

  return {
    name: vConnection.name || '',
    dsn: vConnection.dsn
  };
}

async function initDb() {
  const vConfig = parseErpConfig();
  const vDbConfig = parseDsn(vConfig.dsn);
  const vDatabase = vConfig.name ? vConfig.name : vDbConfig.database;
  logLine(`DB CONFIG: name=${vConfig.name} dsn=${vConfig.dsn}`);

  return mysql.createPool({
    ...vDbConfig,
    database: vDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function logSql(vSql, vParams) {
  const vFormatted = vParams ? `${vSql} | params=${JSON.stringify(vParams)}` : vSql;
  logLine(`SQL: ${vFormatted}`, 'SQL');
}

async function runQuery(vConn, vSql, vParams) {
  logSql(vSql, vParams);
  return vConn.query(vSql, vParams);
}

function extractFirstInteger(vValue) {
  if (vValue === null || vValue === undefined) return null;
  if (typeof vValue === 'number' && Number.isInteger(vValue)) return vValue;
  if (typeof vValue === 'string' && /^-?\d+$/.test(vValue.trim())) return Number(vValue.trim());
  if (Array.isArray(vValue)) {
    for (const vItem of vValue) {
      const vParsed = extractFirstInteger(vItem);
      if (vParsed !== null) return vParsed;
    }
    return null;
  }
  if (typeof vValue === 'object') {
    for (const vKey of Object.keys(vValue)) {
      const vParsed = extractFirstInteger(vValue[vKey]);
      if (vParsed !== null) return vParsed;
    }
    return null;
  }
  return null;
}

function getParamValue(vSource, vKeys) {
  for (const vKey of vKeys) {
    const vValue = vSource ? vSource[vKey] : undefined;
    if (vValue !== undefined && vValue !== null && String(vValue).trim() !== '') {
      return String(vValue).trim();
    }
  }
  return '';
}

function getOptionalJsonRaw(vSource, vHeaders) {
  const vBodyValue = vSource?.['vParámetros'] ?? vSource?.vParametros ?? vSource?.['vParametros'];
  if (vBodyValue !== undefined && vBodyValue !== null && String(vBodyValue).trim() !== '') {
    return typeof vBodyValue === 'string' ? vBodyValue.trim() : vBodyValue;
  }
  const vHeaderValue = vHeaders?.['x-vparametros'];
  if (vHeaderValue !== undefined && vHeaderValue !== null && String(vHeaderValue).trim() !== '') {
    return String(vHeaderValue).trim();
  }
  return null;
}

function parseOptionalJson(vRaw) {
  if (vRaw === null || vRaw === undefined || vRaw === '') {
    return { ok: true, value: null };
  }
  if (typeof vRaw === 'object') {
    return { ok: true, value: vRaw };
  }
  try {
    return { ok: true, value: JSON.parse(String(vRaw)) };
  } catch (_vError) {
    return { ok: false, value: null };
  }
}

function extractAuthParams(vSource = {}, vHeaders = {}) {
  const vCodigoUsuario = getParamValue(vSource, ['Codigo_usuario', 'codigo_usuario', 'vCodigo_usuario', 'vUsuario']);
  const vOTP = getParamValue(vSource, ['OTP', 'otp', 'vOTP']);
  const vCodigoUsuarioHeader = getParamValue(vHeaders, ['x-codigo-usuario']);
  const vOTPHeader = getParamValue(vHeaders, ['x-otp']);
  const vCodigoFinal = vCodigoUsuarioHeader || vCodigoUsuario;
  const vOTPFinal = vOTPHeader || vOTP;
  const vRawParametros = getOptionalJsonRaw(vSource, vHeaders);
  return {
    vCodigo_usuario: vCodigoFinal,
    vOTP: vOTPFinal,
    vParámetrosRaw: vRawParametros
  };
}

function hasValidAuthFormat(vCodigoUsuario, vOTP) {
  if (!vCodigoUsuario || !vOTP) {
    return false;
  }
  if (vCodigoUsuario.length > 36 || vOTP.length > 6) {
    return false;
  }
  return true;
}

function unauthorizedHtml() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acceso no autorizado</title>
</head>
<body>
  <script>
    alert(${JSON.stringify(UNAUTHORIZED_MESSAGE)});
    try { window.open('', '_self'); window.close(); } catch (e) {}
    setTimeout(function () { location.replace('about:blank'); }, 120);
  </script>
</body>
</html>`;
}

async function validarOtp(vConn, vCodigoUsuario, vOTP) {
  let vResult = null;
  try {
    const [vRowsTwoParams] = await runQuery(vConn, 'CALL validar_otp_usuario(?, ?)', [vCodigoUsuario, vOTP]);
    vResult = extractFirstInteger(vRowsTwoParams);
    if (vResult !== null) {
      return vResult;
    }
  } catch (vError) {
    if (vError && vError.code === 'ER_SP_WRONG_NO_OF_ARGS') {
      logLine('SP validar_otp_usuario requiere parametro de salida. Aplicando fallback.', 'WARN');
    } else {
      logError(vError, 'VALIDAR_OTP_TWO_PARAMS_ERROR');
    }
  }

  await runQuery(vConn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [vCodigoUsuario, vOTP]);
  const [vRowsOutput] = await runQuery(vConn, 'SELECT @p_resultado AS resultado');
  return extractFirstInteger(vRowsOutput);
}

function getSqlLines(vRaw) {
  return vRaw
    .split('\n')
    .map((vLine) => vLine.trim())
    .filter((vLine) => vLine.includes('[SQL]') || vLine.includes('SQL:'));
}

function parseCookies(req) {
  const vHeader = String(req.headers?.cookie || '');
  const vResult = {};
  if (!vHeader) return vResult;

  const vPairs = vHeader.split(';');
  for (const vPair of vPairs) {
    const vIdx = vPair.indexOf('=');
    if (vIdx <= 0) continue;
    const vKey = vPair.slice(0, vIdx).trim();
    const vValue = vPair.slice(vIdx + 1).trim();
    if (!vKey) continue;
    vResult[vKey] = decodeURIComponent(vValue);
  }

  return vResult;
}

function createSession(vCodigoUsuario) {
  const vToken = crypto.randomBytes(24).toString('hex');
  sessions.set(vToken, {
    token: vToken,
    vCodigoUsuario: String(vCodigoUsuario || ''),
    createdAt: Date.now(),
    lastSeenAt: Date.now()
  });
  return vToken;
}

function getSessionFromRequest(req) {
  const vCookies = parseCookies(req);
  const vToken = String(vCookies[SESSION_COOKIE_NAME] || '').trim();
  if (!vToken) return null;

  const vSession = sessions.get(vToken);
  if (!vSession) return null;

  if (Date.now() - vSession.lastSeenAt > SESSION_TTL_MS) {
    sessions.delete(vToken);
    return null;
  }

  vSession.lastSeenAt = Date.now();
  return vSession;
}

function setSessionCookie(res, token) {
  const vMaxAge = Math.floor(SESSION_TTL_MS / 1000);
  const vParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${vMaxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (process.env.NODE_ENV === 'production') {
    vParts.push('Secure');
  }
  res.setHeader('Set-Cookie', vParts.join('; '));
}

function isProbablyBase64(vInput) {
  const vText = String(vInput || '').trim();
  if (!vText || vText.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(vText);
}

function validateMagicByMime(vBuffer, vMime) {
  if (!Buffer.isBuffer(vBuffer) || vBuffer.length < 12) return false;

  if (vMime === 'image/jpeg') {
    return vBuffer[0] === 0xff && vBuffer[1] === 0xd8 && vBuffer[2] === 0xff;
  }

  if (vMime === 'image/png') {
    return (
      vBuffer[0] === 0x89 &&
      vBuffer[1] === 0x50 &&
      vBuffer[2] === 0x4e &&
      vBuffer[3] === 0x47 &&
      vBuffer[4] === 0x0d &&
      vBuffer[5] === 0x0a &&
      vBuffer[6] === 0x1a &&
      vBuffer[7] === 0x0a
    );
  }

  if (vMime === 'image/webp') {
    const vRiff = vBuffer.slice(0, 4).toString('ascii');
    const vWebp = vBuffer.slice(8, 12).toString('ascii');
    return vRiff === 'RIFF' && vWebp === 'WEBP';
  }

  return false;
}

function validatePayload(vPayload) {
  const vAsunto = String(vPayload?.vAsunto ?? '').trim();
  const vDescripcion = String(vPayload?.vDescripcion ?? '').trim();
  const vImagenes = Array.isArray(vPayload?.vImagenes) ? vPayload.vImagenes : [];

  if (!vAsunto || !vDescripcion) {
    return { ok: false, code: 'DATOS_REQUERIDOS' };
  }

  if (vAsunto.length > 255) {
    return { ok: false, code: 'ASUNTO_INVALIDO' };
  }

  if (vDescripcion.length > 4096) {
    return { ok: false, code: 'DESCRIPCION_INVALIDA' };
  }

  if (vImagenes.length > MAX_FILES) {
    return { ok: false, code: 'IMAGENES_CANTIDAD_INVALIDA' };
  }

  const vImagenesProcesadas = [];

  for (let vIndex = 0; vIndex < vImagenes.length; vIndex += 1) {
    const vItem = vImagenes[vIndex] || {};
    const vTipoMime = String(vItem.vTipoMime || '').toLowerCase();
    const vBase64 = String(vItem.vBase64 || '').trim();

    if (!ALLOWED_MIME.has(vTipoMime)) {
      return { ok: false, code: 'IMAGEN_TIPO_INVALIDO' };
    }

    if (!isProbablyBase64(vBase64)) {
      return { ok: false, code: 'IMAGEN_BASE64_INVALIDO' };
    }

    const vBuffer = Buffer.from(vBase64, 'base64');
    if (!vBuffer.length) {
      return { ok: false, code: 'IMAGEN_VACIA' };
    }

    if (vBuffer.length > MAX_FILE_SIZE_BYTES) {
      return { ok: false, code: 'IMAGEN_TAMANO_INVALIDO' };
    }

    if (!validateMagicByMime(vBuffer, vTipoMime)) {
      return { ok: false, code: 'IMAGEN_MIME_INVALIDO' };
    }

    vImagenesProcesadas.push(vBuffer);
  }

  return {
    ok: true,
    data: {
      vAsunto,
      vDescripcion,
      vImagenesProcesadas
    }
  };
}

function mapRegistrarTicketError(vError) {
  const vSqlCode = String(vError?.code || '').trim().toUpperCase();
  const vMessage = String(vError?.message || '').trim().toUpperCase();

  if (vMessage === 'INSERT_TICKET_FAILED') {
    return { status: 500, code: 'INSERT_TICKET_FAILED' };
  }
  if (vSqlCode === 'ER_NO_SUCH_TABLE') {
    return { status: 500, code: 'DB_TABLE_MISSING' };
  }
  if (vSqlCode === 'ER_NO_REFERENCED_ROW_2') {
    return { status: 400, code: 'DB_FK_ERROR' };
  }
  if (vSqlCode === 'ER_DATA_TOO_LONG') {
    return { status: 400, code: 'DB_DATA_TOO_LONG' };
  }
  if (vSqlCode === 'ER_BAD_NULL_ERROR') {
    return { status: 400, code: 'DB_NULL_ERROR' };
  }
  if (vSqlCode) {
    return { status: 500, code: `DB_${vSqlCode}` };
  }
  return { status: 500, code: 'REGISTRAR_TICKET_ERROR' };
}

const app = express();
app.use(express.json({ limit: '90mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.originalUrl}`);
  next();
});

app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});

async function authorizeAndServeIndex(req, res) {
  const vExistingSession = getSessionFromRequest(req);
  if (vExistingSession) {
    req.vAuth = {
      vCodigo_usuario: vExistingSession.vCodigoUsuario,
      vOTP: '',
      vParámetros: null
    };
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
    return;
  }

  const vAuth = extractAuthParams(req.query || {}, req.headers || {});
  if (!hasValidAuthFormat(vAuth.vCodigo_usuario, vAuth.vOTP)) {
    res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  const vPool = app.locals.vPool;
  if (!vPool) {
    res.status(503).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }

  let vConn;
  try {
    vConn = await vPool.getConnection();
    const vResultado = await validarOtp(vConn, vAuth.vCodigo_usuario, vAuth.vOTP);
    logLine(`OTP VALIDATION INDEX: usuario=${vAuth.vCodigo_usuario} resultado=${vResultado}`);

    if (vResultado !== 1) {
      res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
      return;
    }

    const vSessionToken = createSession(vAuth.vCodigo_usuario);
    setSessionCookie(res, vSessionToken);
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
  } catch (vError) {
    logError(vError, 'INDEX_OTP_VALIDATION_ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  } finally {
    if (vConn) vConn.release();
  }
}

async function requireOtpApi(req, res, next) {
  const vSession = getSessionFromRequest(req);
  if (vSession) {
    req.vAuth = {
      vCodigo_usuario: vSession.vCodigoUsuario,
      vOTP: '',
      vParámetros: null
    };
    return next();
  }

  const vSource = req.method === 'GET' ? req.query || {} : req.body || {};
  const vAuth = extractAuthParams(vSource, req.headers || {});
  if (!hasValidAuthFormat(vAuth.vCodigo_usuario, vAuth.vOTP)) {
    return res.status(403).json({ ok: false, message: UNAUTHORIZED_MESSAGE });
  }

  const vParsedParametros = parseOptionalJson(vAuth.vParámetrosRaw);
  if (!vParsedParametros.ok) {
    return res.status(400).json({ ok: false, message: 'VPARAMETROS_INVALID_JSON' });
  }

  const vPool = app.locals.vPool;
  if (!vPool) {
    return res.status(503).json({ ok: false, message: 'DB_NOT_READY' });
  }

  let vConn;
  try {
    vConn = await vPool.getConnection();
    const vResultado = await validarOtp(vConn, vAuth.vCodigo_usuario, vAuth.vOTP);
    logLine(`OTP VALIDATION API: usuario=${vAuth.vCodigo_usuario} resultado=${vResultado}`);

    if (vResultado !== 1) {
      return res.status(403).json({ ok: false, message: UNAUTHORIZED_MESSAGE, resultado: vResultado });
    }

    const vSessionToken = createSession(vAuth.vCodigo_usuario);
    setSessionCookie(res, vSessionToken);

    req.vAuth = {
      vCodigo_usuario: vAuth.vCodigo_usuario,
      vOTP: vAuth.vOTP,
      vParámetros: vParsedParametros.value
    };

    return next();
  } catch (vError) {
    logError(vError, 'API_OTP_VALIDATION_ERROR');
    return res.status(500).json({ ok: false, message: 'OTP_VALIDATION_ERROR' });
  } finally {
    if (vConn) vConn.release();
  }
}

app.get('/', authorizeAndServeIndex);
app.get('/index.html', authorizeAndServeIndex);

app.get('/api/init', requireOtpApi, async (req, res) => {
  return res.json({
    ok: true,
    data: {
      vCodigo_usuario: req.vAuth.vCodigo_usuario,
      vFechaServidor: formatDateForDb(new Date()),
      vParámetros: req.vAuth.vParámetros
    }
  });
});

app.post('/api/registrar-ticket', requireOtpApi, async (req, res) => {
  const vCodigo_usuario = req.vAuth.vCodigo_usuario;
  const vValidation = validatePayload(req.body || {});

  if (!vValidation.ok) {
    return res.status(400).json({ ok: false, message: vValidation.code });
  }

  const vPool = app.locals.vPool;
  let vConn;
  let vTransactionStarted = false;
  const vFecha = formatDateForDb(new Date());

  try {
    vConn = await vPool.getConnection();
    logSql('BEGIN');
    await vConn.beginTransaction();
    vTransactionStarted = true;

    const [vInsertTicket] = await runQuery(
      vConn,
      'INSERT INTO ticketsoporte (codigo_usuario, fecha, asunto, descripcion) VALUES (?, ?, ?, ?)',
      [vCodigo_usuario, vFecha, vValidation.data.vAsunto, vValidation.data.vDescripcion]
    );

    const vId_ticket = Number(vInsertTicket?.insertId || 0);
    if (!vId_ticket) {
      throw new Error('INSERT_TICKET_FAILED');
    }

    for (const vImagenBinaria of vValidation.data.vImagenesProcesadas) {
      await runQuery(vConn, 'INSERT INTO ticketsoporte_imagenes (id_ticket, imagen_binaria) VALUES (?, ?)', [
        vId_ticket,
        vImagenBinaria
      ]);
    }

    logSql('COMMIT');
    await vConn.commit();
    vTransactionStarted = false;

    return res.json({
      ok: true,
      data: {
        vId_ticket,
        vFecha
      }
    });
  } catch (vError) {
    if (vTransactionStarted && vConn) {
      logSql('ROLLBACK');
      await vConn.rollback();
    }

    logError(vError, 'REGISTRAR_TICKET_ERROR');
    const vMapped = mapRegistrarTicketError(vError);
    return res.status(vMapped.status).json({ ok: false, message: vMapped.code });
  } finally {
    if (vConn) vConn.release();
  }
});

app.get('/api/sql-logs', requireOtpApi, (req, res) => {
  try {
    if (!global.vLogFilePath || !fs.existsSync(global.vLogFilePath)) {
      return res.json({ ok: true, lines: [] });
    }

    const vRaw = fs.readFileSync(global.vLogFilePath, 'utf-8');
    const vLines = getSqlLines(vRaw);
    return res.json({ ok: true, lines: vLines });
  } catch (vError) {
    logError(vError, 'SQL_LOGS_ERROR');
    return res.status(500).json({ ok: false, message: 'SQL_LOGS_ERROR' });
  }
});

app.use(
  express.static(ROOT_DIR, {
    index: false
  })
);

async function start() {
  ensureLogFile();
  const vPool = await initDb();
  app.locals.vPool = vPool;
  app.listen(PORT, '127.0.0.1', () => {
    logLine(`Servidor CU6-002 escuchando en puerto ${PORT}`);
  });
}

start().catch((vError) => {
  logError(vError, 'FATAL');
  process.exit(1);
});
