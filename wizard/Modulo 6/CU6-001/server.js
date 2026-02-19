const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU6-001';
const PORT = Number(process.env.PORT || 3021);
const UNAUTHORIZED_MESSAGE = 'Warning ACCESO NO AUTORIZADO !!!';

function pad(vValue) {
  return String(vValue).padStart(2, '0');
}

function timestamp() {
  const vNow = new Date();
  return `${vNow.getFullYear()}-${pad(vNow.getMonth() + 1)}-${pad(vNow.getDate())} ${pad(vNow.getHours())}:${pad(
    vNow.getMinutes()
  )}:${pad(vNow.getSeconds())}`;
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
  } catch (vError) {
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

const app = express();
app.use(express.json({ limit: '1mb' }));

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
  const vCodigoUsuario = req.vAuth.vCodigo_usuario;
  const vPool = app.locals.vPool;
  let vConn;
  try {
    vConn = await vPool.getConnection();
    const [vRows] = await runQuery(vConn, 'SELECT password FROM usuarios WHERE codigo_usuario = ? LIMIT 1', [vCodigoUsuario]);
    const vRow = Array.isArray(vRows) ? vRows[0] : null;
    if (!vRow) {
      return res.status(404).json({ ok: false, message: 'USUARIO_INEXISTENTE' });
    }

    return res.json({
      ok: true,
      data: {
        vCodigo_usuario: vCodigoUsuario,
        vPasswordActualBD: String(vRow.password ?? ''),
        vParámetros: req.vAuth.vParámetros
      }
    });
  } catch (vError) {
    logError(vError, 'INIT_ERROR');
    return res.status(500).json({ ok: false, message: 'INIT_ERROR' });
  } finally {
    if (vConn) vConn.release();
  }
});

function hasValidNuevaContrasena(vContrasenaNueva) {
  const vRegexLongitud = /^.{8,255}$/;
  const vRegexMayuscula = /[A-Z]/;
  if (!vRegexLongitud.test(vContrasenaNueva || '')) return false;
  if (!vRegexMayuscula.test(vContrasenaNueva || '')) return false;
  return true;
}

app.post('/api/cambiar-contrasena', requireOtpApi, async (req, res) => {
  const vPayload = req.body || {};
  const vCodigoUsuario = req.vAuth.vCodigo_usuario;
  const vContrasenaAntigua = String(vPayload.vContrasenaAntigua ?? '');
  const vContrasenaNueva = String(vPayload.vContrasenaNueva ?? '');
  const vContrasenaNuevaRepetir = String(vPayload.vContrasenaNuevaRepetir ?? '');

  if (!vContrasenaAntigua || !vContrasenaNueva || !vContrasenaNuevaRepetir) {
    return res.status(400).json({ ok: false, message: 'DATOS_REQUERIDOS' });
  }
  if (vContrasenaNueva !== vContrasenaNuevaRepetir) {
    return res.status(400).json({ ok: false, message: 'CONTRASENAS_NUEVAS_NO_COINCIDEN' });
  }
  if (!hasValidNuevaContrasena(vContrasenaNueva)) {
    return res.status(400).json({ ok: false, message: 'CONTRASENA_NUEVA_INVALIDA' });
  }

  const vPool = app.locals.vPool;
  let vConn;
  let vTransactionStarted = false;

  try {
    vConn = await vPool.getConnection();
    logSql('BEGIN');
    await vConn.beginTransaction();
    vTransactionStarted = true;

    const [vRows] = await runQuery(vConn, 'SELECT password FROM usuarios WHERE codigo_usuario = ? LIMIT 1 FOR UPDATE', [
      vCodigoUsuario
    ]);
    const vRow = Array.isArray(vRows) ? vRows[0] : null;

    if (!vRow) {
      throw new Error('USUARIO_INEXISTENTE');
    }
    if (String(vRow.password ?? '') !== vContrasenaAntigua) {
      throw new Error('CONTRASENA_ANTIGUA_INCORRECTA');
    }
    if (vContrasenaNueva === String(vRow.password ?? '')) {
      throw new Error('NUEVA_CONTRASENA_IGUAL_ACTUAL');
    }

    const [vUpdateResult] = await runQuery(
      vConn,
      'UPDATE usuarios SET password = ? WHERE codigo_usuario = ? AND password = ?',
      [vContrasenaNueva, vCodigoUsuario, vContrasenaAntigua]
    );
    const vAffectedRows = Number(vUpdateResult?.affectedRows || 0);
    if (vAffectedRows !== 1) {
      throw new Error('ACTUALIZACION_NO_APLICADA');
    }

    logSql('COMMIT');
    await vConn.commit();
    vTransactionStarted = false;

    return res.json({
      ok: true,
      message: 'CONTRASENA_ACTUALIZADA'
    });
  } catch (vError) {
    if (vTransactionStarted) {
      logSql('ROLLBACK');
      await vConn.rollback();
    }

    const vCode = String(vError?.message || '').trim().toUpperCase();
    if (vCode === 'USUARIO_INEXISTENTE') {
      return res.status(404).json({ ok: false, message: 'USUARIO_INEXISTENTE' });
    }
    if (vCode === 'CONTRASENA_ANTIGUA_INCORRECTA') {
      return res.status(400).json({ ok: false, message: 'CONTRASENA_ANTIGUA_INCORRECTA' });
    }
    if (vCode === 'NUEVA_CONTRASENA_IGUAL_ACTUAL' || vCode === 'ACTUALIZACION_NO_APLICADA') {
      return res.status(400).json({ ok: false, message: 'NUEVA_CONTRASENA_IGUAL_ACTUAL' });
    }

    logError(vError, 'CAMBIAR_CONTRASENA_ERROR');
    return res.status(500).json({ ok: false, message: 'CAMBIAR_CONTRASENA_ERROR' });
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
  app.listen(PORT, () => {
    logLine(`Servidor CU6-001 escuchando en puerto ${PORT}`);
  });
}

start().catch((vError) => {
  logError(vError, 'FATAL');
  process.exit(1);
});
