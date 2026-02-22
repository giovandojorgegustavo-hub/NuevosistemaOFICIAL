const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { getUseCasePort } = require('../../port-config');

const ROOT_DIR = __dirname;
const ERP_CONFIG = path.join(ROOT_DIR, '..', '..', '..', 'erp.yml');
const LOG_DIR = path.join(ROOT_DIR, 'logs');
const LOG_PREFIX = 'CU2-001';
const PORT = Number(process.env.PORT || getUseCasePort('CU2-001'));
const BUSINESS_TZ_OFFSET = String(process.env.BUSINESS_TZ_OFFSET || '-05:00').trim();

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

function parseOffsetToMinutes(offsetText) {
  const text = String(offsetText || '').trim();
  const match = text.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return -5 * 60;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 14 || minutes > 59) {
    return -5 * 60;
  }
  return sign * (hours * 60 + minutes);
}

function businessTimestamp() {
  const offsetMinutes = parseOffsetToMinutes(BUSINESS_TZ_OFFSET);
  const businessDate = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return `${businessDate.getUTCFullYear()}-${pad(businessDate.getUTCMonth() + 1)}-${pad(
    businessDate.getUTCDate()
  )} ${pad(businessDate.getUTCHours())}:${pad(businessDate.getUTCMinutes())}:${pad(businessDate.getUTCSeconds())}`;
}

function ensureLogFile() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  const now = new Date();
  const base = `${LOG_PREFIX}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  let counter = 1;
  let filename;
  do {
    const suffix = String(counter).padStart(3, '0');
    filename = `${base}-${suffix}.log`;
    counter += 1;
  } while (fs.existsSync(path.join(LOG_DIR, filename)));

  global.logFileName = filename;
  global.logFilePath = path.join(LOG_DIR, filename);
  global.logStream = fs.createWriteStream(global.logFilePath, { flags: 'a' });
  logLine(`LOG FILE: ${filename}`);
}

function logLine(message, level = 'INFO') {
  const line = `[${timestamp()}] [${level}] ${message}`;
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (global.logStream) {
    global.logStream.write(`${line}\n`);
  }
}

function logError(error, context) {
  const detail = error && error.stack ? error.stack : String(error);
  const message = context ? `${context} | ${detail}` : detail;
  logLine(message, 'ERROR');
}

function parseDsn(dsn) {
  const tcpMatch = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
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

function parseErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG, 'utf-8');
  const data = yaml.parse(raw);
  if (!data || !Array.isArray(data.connections) || !data.connections.length) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }
  const connection = data.connections[0];
  if (!connection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }
  return {
    name: connection.name || '',
    dsn: connection.dsn
  };
}

async function initDb() {
  const config = parseErpConfig();
  const dbConfig = parseDsn(config.dsn);
  const database = config.name ? config.name : dbConfig.database;
  logLine(`DB CONFIG: name=${config.name} dsn=${config.dsn}`);
  return mysql.createPool({
    ...dbConfig,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

function logSql(sql, params) {
  const formatted = params ? `${sql} | params=${JSON.stringify(params)}` : sql;
  logLine(`SQL: ${formatted}`, 'SQL');
}

async function runQuery(conn, sql, params) {
  logSql(sql, params);
  return conn.query(sql, params);
}

function normalizeUserCode(value) {
  return String(value ?? '').trim();
}

function hasValidUserCode(value) {
  return /^[A-Za-z0-9-]{1,36}$/.test(String(value || '').trim());
}

function normalizeBaseCode(value) {
  const raw = String(value ?? '').trim();
  return /^\d+$/.test(raw) ? raw : '';
}

function extractCodigoUsuario(source) {
  const raw = source?.Codigo_usuario ?? source?.codigo_usuario ?? source?.vUsuario ?? source?.vCodigo_usuario;
  return normalizeUserCode(raw);
}

function mapPrivRow(row) {
  const values = Object.values(row || {});
  const base = row?.codigo_base ?? row?.base ?? values[0] ?? '';
  const priv = row?.privilegio ?? row?.priv ?? values[1] ?? '';
  const baseAux = row?.base_aux ?? row?.auxiliar ?? values[2] ?? '';

  return {
    vBase: normalizeBaseCode(base),
    vPriv: String(priv ?? '').trim().toUpperCase(),
    vBaseAux: baseAux === null || baseAux === undefined ? '' : String(baseAux).trim()
  };
}

function mapBaseRow(row) {
  return {
    codigo_base: normalizeBaseCode(row?.codigo_base),
    nombre: String(row?.nombre ?? '').trim()
  };
}

function hasBaseAccess(privData, codigoBase) {
  if (!privData) return false;
  if (privData.vPriv === 'ALL') return true;
  return String(codigoBase || '') === String(privData.vBase || '');
}

function normalizePriv(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'PRIV') return 'ALL';
  return raw;
}

function resolveBaseText(privData, allBases) {
  const baseCode = normalizeBaseCode(privData?.vBase);
  const foundBase = (allBases || []).find((row) => String(row.codigo_base) === String(baseCode));
  if (foundBase && foundBase.nombre) {
    return `${foundBase.codigo_base} - ${foundBase.nombre}`;
  }
  if (privData?.vBaseAux) {
    return `${baseCode} - ${privData.vBaseAux}`;
  }
  return baseCode;
}

async function loadPrivData(conn, codigoUsuario) {
  const [result] = await runQuery(conn, 'CALL get_priv_usuario(?)', [codigoUsuario]);
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
  if (!rows.length) {
    return null;
  }
  const mapped = mapPrivRow(rows[0]);
  mapped.vPriv = normalizePriv(mapped.vPriv);
  return mapped;
}

function unwrapProcedureRows(result) {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
}

async function evaluateTurnState(conn, codigoBase, codigoUsuario, referenciaFechaHora) {
  const referencia = String(referenciaFechaHora || '').trim() || businessTimestamp();
  const [[turnoRow]] = await runQuery(conn, 'SELECT get_turno_actual(?, ?) AS turno_actual', [codigoBase, referencia]);
  const turnoActual = String(turnoRow?.turno_actual ?? '').trim();
  if (!turnoActual) {
    return {
      vPuedeAbrirHorario: false,
      vMotivoBloqueo: 'FUERA_DE_HORARIO',
      vTurnoActual: null,
      vYaMarcado: false
    };
  }

  const [[horarioRow]] = await runQuery(
    conn,
    `SELECT TIME(bh.hr_apertura) AS hr_apertura, TIME(bh.hr_cierre) AS hr_cierre
     FROM base_horarios bh
     WHERE bh.codigo_base = ?
       AND bh.dia = DAYOFWEEK(?)
       AND TIME(bh.hr_apertura) = ?
     ORDER BY bh.hr_apertura DESC
     LIMIT 1`,
    [codigoBase, referencia, turnoActual]
  );
  const hrApertura = String(horarioRow?.hr_apertura ?? turnoActual).trim();
  const hrCierre = String(horarioRow?.hr_cierre ?? '').trim();
  if (!hrCierre) {
    return {
      vPuedeAbrirHorario: false,
      vMotivoBloqueo: 'FUERA_DE_HORARIO',
      vTurnoActual: null,
      vYaMarcado: false
    };
  }

  const codigoUsuarioText = String(codigoUsuario ?? '').trim();
  const [[asistenciaRow]] = await runQuery(
    conn,
    `SELECT 1 AS ya_marcado
     FROM bitacoraBase
     WHERE codigo_base = ?
       AND codigo_usuario = ?
       AND DATE(fecha) = DATE(?)
       AND TIME(fecha) >= TIME(?)
       AND TIME(fecha) < TIME(?)
     LIMIT 1`,
    [codigoBase, codigoUsuarioText, referencia, hrApertura, hrCierre]
  );
  const yaMarcado = Boolean(asistenciaRow?.ya_marcado);

  if (yaMarcado) {
    return {
      vPuedeAbrirHorario: false,
      vMotivoBloqueo: 'TURNO_YA_MARCADO',
      vTurnoActual: turnoActual,
      vYaMarcado: true
    };
  }

  return {
    vPuedeAbrirHorario: true,
    vMotivoBloqueo: '',
    vTurnoActual: turnoActual,
    vYaMarcado: false
  };
}

async function loadAllBases(conn) {
  const [result] = await runQuery(conn, 'CALL get_bases()');
  return (Array.isArray(result) && Array.isArray(result[0]) ? result[0] : []).map(mapBaseRow).filter((row) => row.codigo_base);
}

function extractFirstInteger(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = extractFirstInteger(item);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const parsed = extractFirstInteger(value[key]);
      if (parsed !== null) return parsed;
    }
    return null;
  }
  return null;
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  logLine(`ENDPOINT: ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});

function extractAuthParams(source) {
  const codigoUsuarioRaw = source?.vUsuario ?? source?.Codigo_usuario ?? source?.codigo_usuario;
  const otpRaw = source?.vOTP ?? source?.OTP ?? source?.otp;
  const codigoUsuario = String(codigoUsuarioRaw ?? '').trim();
  const otp = String(otpRaw ?? '').trim();
  return { codigoUsuario, otp };
}

function hasValidAuthFormat(codigoUsuario, otp) {
  if (!codigoUsuario || !otp) {
    return false;
  }
  if (codigoUsuario.length > 36 || otp.length > 6) {
    return false;
  }
  return true;
}

function unauthorizedHtml() {
  const text = 'Warning ACCESO NO AUTORIZADO !!!';
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acceso no autorizado</title>
</head>
<body>
  <script>
    alert(${JSON.stringify(text)});
    try { window.open('', '_self'); window.close(); } catch (e) {}
    setTimeout(function () { location.replace('about:blank'); }, 120);
  </script>
</body>
</html>`;
}

async function validarOtp(conn, codigoUsuario, otp) {
  await runQuery(conn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [codigoUsuario, otp]);
  const [rows] = await runQuery(conn, 'SELECT @p_resultado AS resultado');
  return extractFirstInteger(rows);
}

app.get('/', async (req, res) => {
  const { codigoUsuario, otp } = extractAuthParams(req.query || {});
  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const resultado = await validarOtp(conn, codigoUsuario, otp);
      logLine(`OTP VALIDATION GET: usuario=${codigoUsuario} resultado=${resultado}`);
      if (resultado !== 1) {
        res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
        return;
      }
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(ROOT_DIR, 'index.html'));
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'INDEX OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
});

app.get('/index.html', async (req, res) => {
  const { codigoUsuario, otp } = extractAuthParams(req.query || {});
  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
    return;
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const resultado = await validarOtp(conn, codigoUsuario, otp);
      logLine(`OTP VALIDATION GET /index.html: usuario=${codigoUsuario} resultado=${resultado}`);
      if (resultado !== 1) {
        res.status(403).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
        return;
      }
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(ROOT_DIR, 'index.html'));
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'INDEX HTML OTP VALIDATION ERROR');
    res.status(500).set('Cache-Control', 'no-store').type('html').send(unauthorizedHtml());
  }
});

app.post('/api/validar-otp-usuario', async (req, res) => {
  const payload = req.body || {};
  const { codigoUsuario, otp } = extractAuthParams(payload);

  if (!codigoUsuario || !otp) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_OTP_REQUIRED' });
  }

  if (!hasValidAuthFormat(codigoUsuario, otp)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_OTP_INVALID_LENGTH' });
  }

  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const resultado = await validarOtp(conn, codigoUsuario, otp);
      logLine(`OTP VALIDATION API: usuario=${codigoUsuario} resultado=${resultado}`);
      if (resultado === null) {
        return res.status(500).json({ ok: false, message: 'VALIDAR_OTP_RESULT_INVALID' });
      }
      res.json({ ok: true, resultado });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'VALIDAR OTP USUARIO ERROR');
    res.status(500).json({ ok: false, message: 'VALIDAR_OTP_USUARIO_ERROR' });
  }
});

app.get('/api/base-context', async (req, res) => {
  const codigoUsuario = extractCodigoUsuario(req.query || {});
  if (!hasValidUserCode(codigoUsuario)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_USUARIO_REQUIRED' });
  }

  const requestedBase = normalizeBaseCode(req.query.codigo_base);

  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuario);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }

      const allBases = await loadAllBases(conn);
      const allowedBases =
        privData.vPriv === 'ALL'
          ? allBases
          : allBases.filter((row) => String(row.codigo_base) === String(privData.vBase));

      const rows = allowedBases.length
        ? allowedBases
        : [
            {
              codigo_base: privData.vBase,
              nombre: privData.vBaseAux || privData.vBase
            }
          ];

      let selectedBase = String(privData.vBase || '');
      if (privData.vPriv === 'ALL' && requestedBase) {
        const exists = rows.some((row) => String(row.codigo_base) === String(requestedBase));
        if (exists) {
          selectedBase = requestedBase;
        }
      }
      if (!selectedBase && rows.length) {
        selectedBase = String(rows[0].codigo_base || '');
      }

      return res.json({
        ok: true,
        vPriv: privData.vPriv,
        vBase: selectedBase,
        vBaseTexto: resolveBaseText({ ...privData, vBase: selectedBase }, allBases),
        rows
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'BASE_CONTEXT_ERROR');
    return res.status(500).json({ ok: false, message: 'BASE_CONTEXT_ERROR' });
  }
});

app.get('/api/ultima-asistencia', async (req, res) => {
  const codigoBase = normalizeBaseCode(req.query.codigo_base);
  const codigoUsuario = req.query.codigo_usuario;
  const codigoUsuarioAuth = extractCodigoUsuario(req.query || {});

  if (!codigoBase || !codigoUsuario || !hasValidUserCode(codigoUsuarioAuth)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_BASE_USUARIO_REQUIRED' });
  }
  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuarioAuth);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }
      if (!hasBaseAccess(privData, codigoBase)) {
        return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
      }

      const [[row]] = await runQuery(
        conn,
        'SELECT MAX(fecha) AS ultima_asistencia FROM bitacoraBase WHERE codigo_base = ? AND codigo_usuario = ?',
        [codigoBase, codigoUsuario]
      );
      res.json({ ok: true, ultima_asistencia: row?.ultima_asistencia ?? null });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'ULTIMA ASISTENCIA ERROR');
    res.status(500).json({ ok: false, message: 'ULTIMA_ASISTENCIA_ERROR' });
  }
});

app.get('/api/estado-turno', async (req, res) => {
  const codigoBase = normalizeBaseCode(req.query.codigo_base);
  const codigoUsuario = String(req.query.codigo_usuario ?? '').trim();
  const codigoUsuarioAuth = extractCodigoUsuario(req.query || {});

  if (!codigoBase || !codigoUsuario || !hasValidUserCode(codigoUsuarioAuth)) {
    return res.status(400).json({ ok: false, message: 'CODIGO_BASE_USUARIO_REQUIRED' });
  }

  try {
    const pool = app.locals.pool;
    const conn = await pool.getConnection();
    try {
      const privData = await loadPrivData(conn, codigoUsuarioAuth);
      if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
        return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
      }
      if (!hasBaseAccess(privData, codigoBase)) {
        return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
      }

      const referenciaHorario = businessTimestamp();
      const estadoTurno = await evaluateTurnState(conn, codigoBase, codigoUsuario, referenciaHorario);
      return res.json({
        ok: true,
        referencia_horaria: referenciaHorario,
        ...estadoTurno
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    logError(error, 'ESTADO_TURNO_ERROR');
    return res.status(500).json({ ok: false, message: 'ESTADO_TURNO_ERROR' });
  }
});

app.post('/api/abrir-horario', async (req, res) => {
  const payload = req.body || {};
  const vCodigoBase = normalizeBaseCode(payload.vCodigo_base);
  const vCodigoUsuario = payload.vCodigo_usuario;
  const codigoUsuarioAuth = extractCodigoUsuario(payload);
  const marcaAsistencia = businessTimestamp();

  if (!vCodigoBase || !vCodigoUsuario || !hasValidUserCode(codigoUsuarioAuth)) {
    return res.status(400).json({ ok: false, message: 'DATA_REQUIRED' });
  }

  const pool = app.locals.pool;
  const conn = await pool.getConnection();
  let transactionStarted = false;
  try {
    const privData = await loadPrivData(conn, codigoUsuarioAuth);
    if (!privData || (privData.vPriv !== 'ALL' && !privData.vBase)) {
      return res.status(403).json({ ok: false, message: 'UNAUTHORIZED' });
    }
    if (!hasBaseAccess(privData, vCodigoBase)) {
      return res.status(403).json({ ok: false, message: 'BASE_FORBIDDEN' });
    }

    const estadoTurno = await evaluateTurnState(conn, vCodigoBase, vCodigoUsuario, marcaAsistencia);
    if (!estadoTurno.vPuedeAbrirHorario) {
      return res.status(409).json({
        ok: false,
        message: estadoTurno.vMotivoBloqueo,
        ...estadoTurno
      });
    }

    logSql('BEGIN');
    await conn.beginTransaction();
    transactionStarted = true;

    const [[row]] = await runQuery(
      conn,
      'SELECT COALESCE(MAX(codigo_bitacora), 0) + 1 AS next_codigo FROM bitacoraBase FOR UPDATE'
    );
    const nextCodigo = Number(row?.next_codigo) || 1;

    await runQuery(
      conn,
      'INSERT INTO bitacoraBase (codigo_bitacora, fecha, codigo_base, codigo_usuario) VALUES (?, ?, ?, ?)',
      [nextCodigo, marcaAsistencia, vCodigoBase, vCodigoUsuario]
    );

    logSql('COMMIT');
    await conn.commit();

    res.json({
      ok: true,
      ultima_asistencia: marcaAsistencia,
      vTurnoActual: estadoTurno.vTurnoActual
    });
  } catch (error) {
    if (transactionStarted) {
      logSql('ROLLBACK');
      await conn.rollback();
    }
    logError(error, 'ABRIR HORARIO ERROR');
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN') {
      return res.status(403).json({ ok: false, message: code });
    }
    res.status(500).json({ ok: false, message: 'ABRIR_HORARIO_ERROR' });
  } finally {
    conn.release();
  }
});

app.use(
  express.static(ROOT_DIR, {
    index: false
  })
);

async function start() {
  ensureLogFile();
  const pool = await initDb();
  app.locals.pool = pool;
  app.listen(PORT, '127.0.0.1', () => {
    logLine(`Servidor CU2001 escuchando en puerto ${PORT}`);
  });
}

start().catch((error) => {
  logError(error, 'FATAL');
  process.exit(1);
});
