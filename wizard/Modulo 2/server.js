const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const yaml = require('yaml');
const { startModuleServer } = require('../module-proxy');

const vRootDir = __dirname;
const vCu005Id = 'CU2-005';
const vCu005Dir = path.join(vRootDir, vCu005Id);
const vCu006Id = 'CU2-006';
const vCu006Dir = path.join(vRootDir, vCu006Id);
const vCu007Id = 'CU2-007';
const vCu007Dir = path.join(vRootDir, vCu007Id);
const vLog005Dir = path.join(vCu005Dir, 'logs');
const vLog006Dir = path.join(vCu006Dir, 'logs');
const vLog007Dir = path.join(vCu007Dir, 'logs');
const vErpConfigPath = path.join(vRootDir, '..', '..', 'erp.yml');
const vLogPrefix005 = 'CU2-005';
const vLogPrefix006 = 'CU2-006';
const vLogPrefix007 = 'CU2-007';
const vSessionCookie005Name = 'cu2_005_session';
const vSessionCookie006Name = 'cu2_006_session';
const vSessionCookie007Name = 'cu2_007_session';
const vSessionTtlMs = 2 * 60 * 60 * 1000;

const vDbState = {
  vPool: null,
  vPoolPromise: null
};
const vSessionStore005 = new Map();
const vSessionStore006 = new Map();
const vSessionStore007 = new Map();

function vPad(vValue) {
  return String(vValue).padStart(2, '0');
}

function vTimestamp() {
  const vNow = new Date();
  return `${vNow.getFullYear()}-${vPad(vNow.getMonth() + 1)}-${vPad(vNow.getDate())} ${vPad(vNow.getHours())}:${vPad(
    vNow.getMinutes()
  )}:${vPad(vNow.getSeconds())}`;
}

function vBuildLogFilePath(vTargetLogDir, vTargetPrefix) {
  if (!fs.existsSync(vTargetLogDir)) {
    fs.mkdirSync(vTargetLogDir, { recursive: true });
  }

  const vNow = new Date();
  const vBaseName = `${vTargetPrefix}-${vNow.getFullYear()}${vPad(vNow.getMonth() + 1)}${vPad(vNow.getDate())}-${vPad(
    vNow.getHours()
  )}${vPad(vNow.getMinutes())}${vPad(vNow.getSeconds())}`;

  let vCounter = 1;
  let vFilename = '';
  do {
    vFilename = `${vBaseName}-${String(vCounter).padStart(3, '0')}.log`;
    vCounter += 1;
  } while (fs.existsSync(path.join(vTargetLogDir, vFilename)));

  return path.join(vTargetLogDir, vFilename);
}

function vCreateLogger(vTargetLogDir, vTargetPrefix) {
  const vLogFilePath = vBuildLogFilePath(vTargetLogDir, vTargetPrefix);
  const vStream = fs.createWriteStream(vLogFilePath, { flags: 'a' });

  const vLog = (vLevel, vMessage) => {
    const vLine = `[${vTimestamp()}] [${vLevel}] ${vMessage}`;
    if (vLevel === 'ERROR') {
      console.error(vLine);
    } else {
      console.log(vLine);
    }
    vStream.write(`${vLine}\n`);
  };

  return {
    vLogFilePath,
    info(vMessage) {
      vLog('INFO', vMessage);
    },
    sql(vSql, vParams) {
      const vFormatted = Array.isArray(vParams) ? `${vSql} | params=${JSON.stringify(vParams)}` : vSql;
      vLog('SQL', `SQL: ${vFormatted}`);
    },
    error(vError, vContext) {
      const vDetail = vError && vError.stack ? vError.stack : String(vError);
      const vMessage = vContext ? `${vContext} | ${vDetail}` : vDetail;
      vLog('ERROR', vMessage);
    },
    close() {
      vStream.end();
    }
  };
}

function vParseDsn(vDsn) {
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

function vParseErpConfig() {
  const vRaw = fs.readFileSync(vErpConfigPath, 'utf8');
  const vData = yaml.parse(vRaw);

  if (!vData || !Array.isArray(vData.connections) || !vData.connections.length) {
    throw new Error('No se encontro configuracion de conexiones en erp.yml');
  }

  const vConnection = vData.connections[0];
  if (!vConnection.dsn) {
    throw new Error('No se encontro DSN en erp.yml');
  }

  return {
    vDsn: vConnection.dsn,
    vName: vConnection.name || ''
  };
}

async function vGetPool(vLogger) {
  if (vDbState.vPool) {
    return vDbState.vPool;
  }

  if (!vDbState.vPoolPromise) {
    vDbState.vPoolPromise = (async () => {
      const vErpConfig = vParseErpConfig();
      const vParsed = vParseDsn(vErpConfig.vDsn);
      const vDatabase = vErpConfig.vName || vParsed.database;

      vLogger.info(`DB_CONFIG: name=${vErpConfig.vName} dsn=${vErpConfig.vDsn}`);

      const vPool = mysql.createPool({
        ...vParsed,
        database: vDatabase,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      const vConn = await vPool.getConnection();
      vConn.release();

      vDbState.vPool = vPool;
      vLogger.info('DB_POOL_READY');
      return vPool;
    })().catch((vError) => {
      vDbState.vPoolPromise = null;
      throw vError;
    });
  }

  return vDbState.vPoolPromise;
}

async function vRunQuery(vLogger, vConn, vSql, vParams) {
  vLogger.sql(vSql, vParams);
  return vConn.query(vSql, vParams);
}

function vExtractFirstInteger(vValue) {
  if (vValue === null || vValue === undefined) return null;
  if (typeof vValue === 'number' && Number.isInteger(vValue)) return vValue;
  if (typeof vValue === 'string' && /^-?\d+$/.test(vValue.trim())) return Number(vValue.trim());

  if (Array.isArray(vValue)) {
    for (const vItem of vValue) {
      const vParsed = vExtractFirstInteger(vItem);
      if (vParsed !== null) return vParsed;
    }
    return null;
  }

  if (typeof vValue === 'object') {
    for (const vKey of Object.keys(vValue)) {
      const vParsed = vExtractFirstInteger(vValue[vKey]);
      if (vParsed !== null) return vParsed;
    }
    return null;
  }

  return null;
}

function vUnwrapRows(vResult) {
  if (Array.isArray(vResult) && Array.isArray(vResult[0])) {
    return vResult[0];
  }
  return Array.isArray(vResult) ? vResult : [];
}

function vExtractAuthParams(vSource) {
  const vCodigoUsuarioRaw =
    vSource?.Codigo_usuario ?? vSource?.codigo_usuario ?? vSource?.vUsuario ?? vSource?.vCodigo_usuario;
  const vOtpRaw = vSource?.OTP ?? vSource?.otp ?? vSource?.vOTP;
  const vParametrosRaw =
    vSource?.['vParámetros'] ??
    vSource?.vParametros ??
    vSource?.vparametros ??
    vSource?.['vParÃ¡metros'] ??
    null;

  return {
    vCodigoUsuario: String(vCodigoUsuarioRaw ?? '').trim(),
    vOTP: String(vOtpRaw ?? '').trim(),
    vParametrosRaw: vParametrosRaw
  };
}

function vParseOptionalParametros(vRaw) {
  if (vRaw === null || vRaw === undefined || vRaw === '') {
    return {};
  }

  if (typeof vRaw === 'object' && !Array.isArray(vRaw)) {
    return vRaw;
  }

  try {
    const vParsed = JSON.parse(String(vRaw));
    return typeof vParsed === 'object' && vParsed !== null ? vParsed : {};
  } catch {
    return {};
  }
}

function vHasValidAuthFormat(vCodigoUsuario, vOTP) {
  const vCodigoRegex = /^[A-Za-z0-9-]{1,36}$/;
  const vOtpRegex = /^\d{1,6}$/;
  return vCodigoRegex.test(vCodigoUsuario) && vOtpRegex.test(vOTP);
}

function vParseCookies(vCookieHeader) {
  const vResult = {};
  const vRaw = String(vCookieHeader || '');
  if (!vRaw) return vResult;

  for (const vPart of vRaw.split(';')) {
    const vTrimmed = vPart.trim();
    if (!vTrimmed) continue;
    const vEqIndex = vTrimmed.indexOf('=');
    if (vEqIndex <= 0) continue;
    const vKey = vTrimmed.slice(0, vEqIndex).trim();
    const vValue = vTrimmed.slice(vEqIndex + 1).trim();
    if (!vKey) continue;
    try {
      vResult[vKey] = decodeURIComponent(vValue);
    } catch {
      vResult[vKey] = vValue;
    }
  }

  return vResult;
}

function vCleanupSessions(vSessionStore) {
  const vNow = Date.now();
  for (const [vToken, vSession] of vSessionStore.entries()) {
    if (!vSession || vNow - Number(vSession.vLastSeenAt || 0) > vSessionTtlMs) {
      vSessionStore.delete(vToken);
    }
  }
}

function vCreateSession(vReq, vCodigoUsuario, vSessionStore) {
  vCleanupSessions(vSessionStore);
  const vToken = crypto.randomBytes(24).toString('hex');
  const vNow = Date.now();
  vSessionStore.set(vToken, {
    vCodigoUsuario: String(vCodigoUsuario || '').trim(),
    vIp: String(vReq.ip || ''),
    vCreatedAt: vNow,
    vLastSeenAt: vNow
  });
  return vToken;
}

function vGetSessionFromRequest(vReq, vSessionStore, vSessionCookieName) {
  vCleanupSessions(vSessionStore);
  const vCookies = vParseCookies(vReq.headers?.cookie);
  const vToken = String(vCookies[vSessionCookieName] || '').trim();
  if (!vToken) return null;

  const vSession = vSessionStore.get(vToken);
  if (!vSession) return null;
  vSession.vLastSeenAt = Date.now();
  return {
    vToken,
    ...vSession
  };
}

function vAttachSessionCookie(vRes, vToken, vSessionCookieName) {
  const vMaxAgeSeconds = Math.floor(vSessionTtlMs / 1000);
  vRes.append('Set-Cookie', `${vSessionCookieName}=${encodeURIComponent(vToken)}; Path=/; Max-Age=${vMaxAgeSeconds}; HttpOnly; SameSite=Lax`);
}

function vUnauthorizedHtml() {
  const vText = 'Warning ACCESO NO AUTORIZADO !!!';
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Acceso no autorizado</title>
</head>
<body>
  <script>
    alert(${JSON.stringify(vText)});
    try { window.open('', '_self'); window.close(); } catch (e) {}
    setTimeout(function () { location.replace('about:blank'); }, 120);
  </script>
</body>
</html>`;
}

function vSendUnauthorizedJson(vRes) {
  return vRes.status(403).json({
    ok: false,
    message: 'Warning ACCESO NO AUTORIZADO !!!'
  });
}

async function vValidarOtp(vLogger, vConn, vCodigoUsuario, vOTP) {
  await vRunQuery(vLogger, vConn, 'CALL validar_otp_usuario(?, ?, @p_resultado)', [vCodigoUsuario, vOTP]);
  const [vRows] = await vRunQuery(vLogger, vConn, 'SELECT @p_resultado AS resultado', []);
  return vExtractFirstInteger(vRows);
}

function vMapPrivRow(vRow) {
  const vValues = Object.values(vRow || {});
  const vBase = vRow?.codigo_base ?? vRow?.base ?? vValues[0] ?? '';
  const vPriv = vRow?.privilegio ?? vRow?.priv ?? vValues[1] ?? '';
  const vBaseAux = vRow?.base_aux ?? vRow?.auxiliar ?? vValues[2] ?? '';

  return {
    vBase: String(vBase ?? '').trim(),
    vPriv: String(vPriv ?? '').trim().toUpperCase(),
    vBaseAux: vBaseAux === null || vBaseAux === undefined ? '' : String(vBaseAux).trim()
  };
}

function vMapBaseRow(vRow) {
  return {
    codigo_base: String(vRow?.codigo_base ?? '').trim(),
    nombre: String(vRow?.nombre ?? '').trim()
  };
}

function vToNumber(vValue) {
  const vNumber = Number(vValue);
  return Number.isFinite(vNumber) ? vNumber : 0;
}

function vMapStockRow(vRow) {
  const vValues = Object.values(vRow || {});

  return {
    codigo_base: String(vRow?.codigo_base ?? vValues[0] ?? '').trim(),
    nombre_base: String(vRow?.nombre_base ?? vRow?.Base ?? vValues[1] ?? '').trim(),
    codigo_producto: String(vRow?.codigo_producto ?? vValues[2] ?? '').trim(),
    nombre_producto: String(vRow?.nombre_producto ?? vRow?.Producto ?? vValues[3] ?? '').trim(),
    fecha_saldoactual: vRow?.fecha_saldoactual ?? vRow?.Hora ?? vValues[4] ?? null,
    saldo_actual: vToNumber(vRow?.saldo_actual ?? vValues[5]),
    costo_unitario: vToNumber(vRow?.costo_unitario ?? vValues[6]),
    saldo_reservado: vToNumber(vRow?.saldo_reservado ?? vRow?.Reserva ?? vValues[7]),
    saldo_disponible: vToNumber(vRow?.saldo_disponible ?? vRow?.SaldoDisponible ?? vValues[8])
  };
}

function vResolveBaseText(vState) {
  const vBaseCode = String(vState.vBase || '').trim();
  const vFoundBase = (vState.vBases || []).find((vItem) => String(vItem.codigo_base) === vBaseCode);
  if (vFoundBase && vFoundBase.nombre) {
    return `${vFoundBase.codigo_base} - ${vFoundBase.nombre}`;
  }

  const vStockBaseName = (vState.vStockBase || []).find((vRow) => String(vRow.codigo_base) === vBaseCode)?.nombre_base;
  if (vStockBaseName) {
    return `${vBaseCode} - ${vStockBaseName}`;
  }

  if (vState.vBaseAux) {
    return `${vBaseCode} - ${vState.vBaseAux}`;
  }

  return vBaseCode;
}

function vNormalizeBaseCode(vValue) {
  const vText = String(vValue ?? '').trim();
  return /^\d+$/.test(vText) ? vText : '';
}

function vNormalizeCu2006Priv(vPriv) {
  const vRaw = String(vPriv || '').trim().toUpperCase();
  if (vRaw === 'ALL') return 'PRIV';
  if (vRaw === 'PRIV' || vRaw === 'ONE') return vRaw;
  return '';
}

function vNormalizeOptionalCode(vValue, vMaxLength = 60) {
  const vText = String(vValue ?? '').trim();
  if (!vText) return '';
  if (vText.length > vMaxLength) return '';
  return /^[A-Za-z0-9_-]+$/.test(vText) ? vText : '';
}

function vNormalizeIsoDate(vValue) {
  const vText = String(vValue ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vText)) return '';

  const [vYear, vMonth, vDay] = vText.split('-').map((vPart) => Number(vPart));
  if (!Number.isInteger(vYear) || !Number.isInteger(vMonth) || !Number.isInteger(vDay)) return '';

  const vDate = new Date(Date.UTC(vYear, vMonth - 1, vDay));
  if (
    vDate.getUTCFullYear() !== vYear ||
    vDate.getUTCMonth() + 1 !== vMonth ||
    vDate.getUTCDate() !== vDay
  ) {
    return '';
  }

  return vText;
}

function vToIsoDate(vDate) {
  return `${vDate.getFullYear()}-${vPad(vDate.getMonth() + 1)}-${vPad(vDate.getDate())}`;
}

function vGetTodayIsoDate() {
  return vToIsoDate(new Date());
}

function vGetLastWeekStartIsoDate() {
  const vNow = new Date();
  vNow.setDate(vNow.getDate() - 6);
  return vToIsoDate(vNow);
}

function vIsDateRangeValid(vFechaDesde, vFechaHasta) {
  const vDesde = vNormalizeIsoDate(vFechaDesde);
  const vHasta = vNormalizeIsoDate(vFechaHasta);
  if (!vDesde || !vHasta) return false;
  return vDesde <= vHasta;
}

function vMapProductoRow(vRow) {
  return {
    codigo_producto: String(vRow?.codigo_producto ?? '').trim(),
    nombre: String(vRow?.nombre ?? '').trim()
  };
}

function vMapHistorialRow(vRow) {
  const vValues = Object.values(vRow || {});
  return {
    fecha: vRow?.fecha ?? vValues[0] ?? null,
    tipo_documento: String(vRow?.tipo_documento ?? vValues[1] ?? '').trim(),
    numero_documento: String(vRow?.numero_documento ?? vValues[2] ?? '').trim(),
    codigo_base: String(vRow?.codigo_base ?? vValues[3] ?? '').trim(),
    nombre_base: String(vRow?.nombre_base ?? vValues[4] ?? '').trim(),
    codigo_producto: String(vRow?.codigo_producto ?? vValues[5] ?? '').trim(),
    nombre_producto: String(vRow?.nombre_producto ?? vValues[6] ?? '').trim(),
    cantidad: vToNumber(vRow?.cantidad ?? vValues[7])
  };
}

function vBuildValidationError(vMessage) {
  const vError = new Error(vMessage);
  vError.vCode = vMessage;
  vError.vStatus = 400;
  return vError;
}

function vResolveCu2006Filters(vInput) {
  const vPriv = vInput.vPriv;
  const vBaseUsuario = String(vInput.vBaseUsuario || '').trim();
  const vBases = Array.isArray(vInput.vBases) ? vInput.vBases : [];
  const vProductos = Array.isArray(vInput.vProductos) ? vInput.vProductos : [];
  const vStrictDates = Boolean(vInput.vStrictDates);

  let vFecha_desde = vNormalizeIsoDate(vInput.vFecha_desde);
  let vFecha_hasta = vNormalizeIsoDate(vInput.vFecha_hasta);

  if (!vStrictDates) {
    if (!vFecha_desde) vFecha_desde = vGetLastWeekStartIsoDate();
    if (!vFecha_hasta) vFecha_hasta = vGetTodayIsoDate();
    if (!vIsDateRangeValid(vFecha_desde, vFecha_hasta)) {
      vFecha_desde = vGetLastWeekStartIsoDate();
      vFecha_hasta = vGetTodayIsoDate();
    }
  } else {
    if (!vFecha_desde || !vFecha_hasta) {
      throw vBuildValidationError('VALIDATION_DATE_REQUIRED');
    }
    if (!vIsDateRangeValid(vFecha_desde, vFecha_hasta)) {
      throw vBuildValidationError('VALIDATION_DATE_RANGE');
    }
  }

  let vCodigo_producto = vNormalizeOptionalCode(vInput.vCodigo_producto, 80);
  if (vCodigo_producto) {
    const vExists = vProductos.some((vRow) => String(vRow.codigo_producto) === vCodigo_producto);
    if (!vExists) {
      vCodigo_producto = '';
    }
  }

  let vCodigo_base = '';
  if (vPriv === 'ONE') {
    vCodigo_base = vBaseUsuario;
  } else if (vPriv === 'PRIV') {
    const vCandidateBase = vNormalizeOptionalCode(vInput.vCodigo_base, 40);
    if (vCandidateBase) {
      const vExists = vBases.some((vRow) => String(vRow.codigo_base) === vCandidateBase);
      vCodigo_base = vExists ? vCandidateBase : '';
    }
  }

  return {
    vFecha_desde,
    vFecha_hasta,
    vCodigo_producto,
    vCodigo_base,
    vSpCodigo_producto: vCodigo_producto || null,
    vSpCodigo_base: vPriv === 'ONE' ? vBaseUsuario : vCodigo_base || null
  };
}

async function vLoadCu2006Privileges(vLogger, vConn, vCodigoUsuario) {
  const [vPrivResult] = await vRunQuery(vLogger, vConn, 'CALL get_priv_usuario(?)', [vCodigoUsuario]);
  const vPrivRows = vUnwrapRows(vPrivResult);

  if (!Array.isArray(vPrivRows) || !vPrivRows.length) {
    return {
      ok: false,
      unauthorized: true,
      reason: 'PRIVILEGE_NOT_FOUND'
    };
  }

  const vPrivDataRaw = vMapPrivRow(vPrivRows[0]);
  const vPriv = vNormalizeCu2006Priv(vPrivDataRaw.vPriv);
  if (!vPriv) {
    return {
      ok: false,
      unauthorized: true,
      reason: 'PRIVILEGE_INVALID'
    };
  }

  return {
    ok: true,
    data: {
      vBaseUsuario: vPrivDataRaw.vBase,
      vPriv,
      vBaseAux: vPrivDataRaw.vBaseAux
    }
  };
}

async function vLoadCu2006Catalogs(vLogger, vConn, vPriv) {
  let vBases = [];
  if (vPriv === 'PRIV') {
    const [vBasesResult] = await vRunQuery(vLogger, vConn, 'CALL get_bases()', []);
    vBases = vUnwrapRows(vBasesResult).map(vMapBaseRow);
  }

  const [vProductosResult] = await vRunQuery(vLogger, vConn, 'CALL get_productos()', []);
  const vProductos = vUnwrapRows(vProductosResult).map(vMapProductoRow);

  return {
    vBases,
    vProductos
  };
}

async function vLoadCu2006Historial(vLogger, vConn, vFiltros) {
  const [vHistorialResult] = await vRunQuery(
    vLogger,
    vConn,
    'CALL get_historial_movimientos_rango(?, ?, ?, ?)',
    [vFiltros.vFecha_desde, vFiltros.vFecha_hasta, vFiltros.vSpCodigo_producto, vFiltros.vSpCodigo_base]
  );

  return vUnwrapRows(vHistorialResult).map(vMapHistorialRow);
}

async function vLoadCu2006State(vLogger, vInput) {
  const vPool = await vGetPool(vLogger);
  const vConn = await vPool.getConnection();

  try {
    const vPrivResult = await vLoadCu2006Privileges(vLogger, vConn, vInput.vCodigoUsuario);
    if (!vPrivResult.ok) {
      return vPrivResult;
    }

    const vPrivData = vPrivResult.data;
    const vCatalogs = await vLoadCu2006Catalogs(vLogger, vConn, vPrivData.vPriv);

    const vFiltros = vResolveCu2006Filters({
      vPriv: vPrivData.vPriv,
      vBaseUsuario: vPrivData.vBaseUsuario,
      vBases: vCatalogs.vBases,
      vProductos: vCatalogs.vProductos,
      vFecha_desde: vInput.vFecha_desde,
      vFecha_hasta: vInput.vFecha_hasta,
      vCodigo_producto: vInput.vCodigo_producto,
      vCodigo_base: vInput.vCodigo_base,
      vStrictDates: vInput.vStrictDates
    });

    const vHistorialMovimientos = await vLoadCu2006Historial(vLogger, vConn, vFiltros);

    return {
      ok: true,
      data: {
        vBaseUsuario: vPrivData.vBaseUsuario,
        vPriv: vPrivData.vPriv,
        vBaseAux: vPrivData.vBaseAux,
        vBases: vCatalogs.vBases,
        vProductos: vCatalogs.vProductos,
        vFecha_desde: vFiltros.vFecha_desde,
        vFecha_hasta: vFiltros.vFecha_hasta,
        vCodigo_producto: vFiltros.vCodigo_producto,
        vCodigo_base: vPrivData.vPriv === 'ONE' ? vPrivData.vBaseUsuario : vFiltros.vCodigo_base,
        vHistorialMovimientos
      }
    };
  } finally {
    vConn.release();
  }
}

function vNormalizeCu2007Priv(vPriv) {
  const vRaw = String(vPriv || '').trim().toUpperCase();
  if (vRaw === 'ALL') return 'PRIV';
  if (vRaw === 'PRIV' || vRaw === 'ONE') return vRaw;
  return '';
}

function vNormalizeCu2007BaseCode(vValue, vMaxLength = 40) {
  const vText = String(vValue ?? '').trim();
  if (!vText) return '';
  if (vText.length > vMaxLength) return '';
  return /^[A-Za-z0-9_-]+$/.test(vText) ? vText : '';
}

function vMapAsistenciaRow(vRow) {
  const vValues = Object.values(vRow || {});
  return {
    FECHA: vRow?.FECHA ?? vRow?.fecha ?? vValues[0] ?? null,
    TURNO: String(vRow?.TURNO ?? vRow?.turno ?? vValues[1] ?? '').trim(),
    codigo_base: String(vRow?.codigo_base ?? vRow?.CODIGO_BASE ?? vValues[2] ?? '').trim(),
    FechaRegistro: vRow?.FechaRegistro ?? vRow?.fecha_registro ?? vValues[3] ?? null,
    TurnoRegistro: String(vRow?.TurnoRegistro ?? vRow?.turno_registro ?? vValues[4] ?? '').trim(),
    codigo_usuario: String(vRow?.codigo_usuario ?? vRow?.CODIGO_USUARIO ?? vValues[5] ?? '').trim(),
    codigo_bitacora: String(vRow?.codigo_bitacora ?? vRow?.CODIGO_BITACORA ?? vValues[6] ?? '').trim()
  };
}

function vResolveCu2007Filters(vInput) {
  const vPriv = vInput.vPriv;
  const vBaseUsuario = String(vInput.vBaseUsuario || '').trim();
  const vBases = Array.isArray(vInput.vBases) ? vInput.vBases : [];
  const vStrictDate = Boolean(vInput.vStrictDate);

  let vFecha_consulta = vNormalizeIsoDate(vInput.vFecha_consulta);
  if (!vFecha_consulta && !vStrictDate) {
    vFecha_consulta = vGetTodayIsoDate();
  }

  if (vStrictDate && !vFecha_consulta) {
    throw vBuildValidationError('VALIDATION_DATE_REQUIRED');
  }

  let vCodigo_base = '';
  if (vPriv === 'ONE') {
    vCodigo_base = vBaseUsuario;
  } else if (vPriv === 'PRIV') {
    const vCandidateBase = vNormalizeCu2007BaseCode(vInput.vCodigo_base, 40);
    if (vCandidateBase) {
      const vExists = vBases.some((vRow) => String(vRow.codigo_base) === vCandidateBase);
      vCodigo_base = vExists ? vCandidateBase : '';
    }
  }

  return {
    vFecha_consulta,
    vCodigo_base,
    vSpCodigo_base: vPriv === 'ONE' ? vBaseUsuario : vCodigo_base || null
  };
}

async function vLoadCu2007State(vLogger, vInput) {
  const vPool = await vGetPool(vLogger);
  const vConn = await vPool.getConnection();

  try {
    const [vPrivResult] = await vRunQuery(vLogger, vConn, 'CALL get_priv_usuario(?)', [vInput.vCodigoUsuario]);
    const vPrivRows = vUnwrapRows(vPrivResult);

    if (!Array.isArray(vPrivRows) || !vPrivRows.length) {
      return {
        ok: false,
        unauthorized: true,
        reason: 'PRIVILEGE_NOT_FOUND'
      };
    }

    const vPrivDataRaw = vMapPrivRow(vPrivRows[0]);
    const vPriv = vNormalizeCu2007Priv(vPrivDataRaw.vPriv);
    if (!vPriv) {
      return {
        ok: false,
        unauthorized: true,
        reason: 'PRIVILEGE_INVALID'
      };
    }

    let vBases = [];
    if (vPriv === 'PRIV') {
      const [vBasesResult] = await vRunQuery(vLogger, vConn, 'CALL get_bases()', []);
      vBases = vUnwrapRows(vBasesResult).map(vMapBaseRow);
    }

    const vFiltros = vResolveCu2007Filters({
      vPriv,
      vBaseUsuario: vPrivDataRaw.vBase,
      vBases,
      vFecha_consulta: vInput.vFecha_consulta,
      vCodigo_base: vInput.vCodigo_base,
      vStrictDate: vInput.vStrictDate
    });

    const [vAsistenciaResult] = await vRunQuery(
      vLogger,
      vConn,
      'CALL get_asistencia_dia_filtrado(?, ?)',
      [vFiltros.vFecha_consulta, vFiltros.vSpCodigo_base]
    );
    const vAsistenciaDia = vUnwrapRows(vAsistenciaResult).map(vMapAsistenciaRow);

    return {
      ok: true,
      data: {
        vBaseUsuario: vPrivDataRaw.vBase,
        vPriv,
        vBaseAux: vPrivDataRaw.vBaseAux,
        vBases,
        vFecha_consulta: vFiltros.vFecha_consulta,
        vCodigo_base: vPriv === 'ONE' ? vPrivDataRaw.vBase : vFiltros.vCodigo_base,
        vAsistenciaDia
      }
    };
  } finally {
    vConn.release();
  }
}

async function vLoadWizardState(vLogger, vInput) {
  const vPool = await vGetPool(vLogger);
  const vConn = await vPool.getConnection();

  try {
    const [vPrivResult] = await vRunQuery(vLogger, vConn, 'CALL get_priv_usuario(?)', [vInput.vCodigoUsuario]);
    const vPrivRows = vUnwrapRows(vPrivResult);
    if (!Array.isArray(vPrivRows) || !vPrivRows.length) {
      return {
        ok: false,
        unauthorized: true,
        reason: 'PRIVILEGE_NOT_FOUND'
      };
    }

    const vPrivData = vMapPrivRow(vPrivRows[0]);
    let vBase = vPrivData.vBase;
    const vPriv = vPrivData.vPriv;
    const vBaseAux = vPrivData.vBaseAux;
    let vBases = [];

    if (vPriv === 'ALL') {
      const [vBasesResult] = await vRunQuery(vLogger, vConn, 'CALL get_bases()', []);
      vBases = vUnwrapRows(vBasesResult).map(vMapBaseRow);

      const vRequestedBaseCode = vNormalizeBaseCode(vInput.vRequestedBaseCode);
      if (vRequestedBaseCode) {
        const vExists = vBases.some((vRow) => String(vRow.codigo_base) === vRequestedBaseCode);
        if (vExists) {
          vBase = vRequestedBaseCode;
        }
      }
    }

    const [vStockResult] = await vRunQuery(vLogger, vConn, 'CALL get_stock_xBase(?)', [vBase]);
    const vRawStockRows = vUnwrapRows(vStockResult).map(vMapStockRow);

    // El SP actual devuelve varias bases; forzamos comportamiento "stock por base" en backend.
    const vStockBase = vRawStockRows.filter((vRow) => String(vRow.codigo_base) === String(vBase));

    const vState = {
      vBase,
      vPriv,
      vBaseAux,
      vBases,
      vStockBase
    };

    return {
      ok: true,
      data: {
        vBase,
        vPriv,
        vBaseAux,
        vBaseTexto: vResolveBaseText(vState),
        vBases,
        vStockBase
      }
    };
  } finally {
    vConn.release();
  }
}

function vAttachNoStoreHeaders(vRes) {
  vRes.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  vRes.set('Pragma', 'no-cache');
  vRes.set('Expires', '0');
  vRes.set('Surrogate-Control', 'no-store');
}

startModuleServer({
  moduleName: 'Modulo 2',
  moduleCode: 'M2',
  cuDefs: [
    { id: 'CU2-001', dir: 'CU2-001' },
    { id: 'CU2-002', dir: 'CU2-002' },
    { id: 'CU2-003', dir: 'CU2-003' },
    { id: 'CU2-004', dir: 'CU2-004' }
  ],
  configureApp({ app, port }) {
    const vLogger005 = vCreateLogger(vLog005Dir, vLogPrefix005);
    const vLogger006 = vCreateLogger(vLog006Dir, vLogPrefix006);
    const vLogger007 = vCreateLogger(vLog007Dir, vLogPrefix007);
    const vLoggers = [vLogger005, vLogger006, vLogger007];

    vLogger005.info(`SERVER_START: ${vCu005Id} integrado en servidor compartido M2 puerto ${port}`);
    vLogger005.info(`LOG_FILE: ${vLogger005.vLogFilePath}`);
    vLogger006.info(`SERVER_START: ${vCu006Id} integrado en servidor compartido M2 puerto ${port}`);
    vLogger006.info(`LOG_FILE: ${vLogger006.vLogFilePath}`);
    vLogger007.info(`SERVER_START: ${vCu007Id} integrado en servidor compartido M2 puerto ${port}`);
    vLogger007.info(`LOG_FILE: ${vLogger007.vLogFilePath}`);

    process.on('exit', () => vLoggers.forEach((vLogger) => vLogger.close()));
    process.on('SIGINT', () => vLoggers.forEach((vLogger) => vLogger.close()));
    process.on('SIGTERM', () => vLoggers.forEach((vLogger) => vLogger.close()));

    void vGetPool(vLogger005).catch((vError) => {
      vLogger005.error(vError, 'DB_BOOTSTRAP_ERROR');
      vLogger006.error(vError, 'DB_BOOTSTRAP_ERROR');
      vLogger007.error(vError, 'DB_BOOTSTRAP_ERROR');
    });

    function vRegisterCuRoutes(vConfig) {
      const vCuPath = `/${vConfig.vCuId}`;

      app.get(vCuPath, (vReq, vRes, vNext) => {
        if (vReq.path.endsWith('/')) {
          vNext();
          return;
        }
        const vQueryIndex = vReq.originalUrl.indexOf('?');
        const vQuery = vQueryIndex >= 0 ? vReq.originalUrl.slice(vQueryIndex) : '';
        vRes.redirect(302, `${vCuPath}/${vQuery}`);
      });

      async function vAuthorizeAndServeIndex(vReq, vRes) {
        const { vCodigoUsuario, vOTP } = vExtractAuthParams(vReq.query || {});
        vConfig.vLogger.info(`ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vCodigoUsuario || '-'} OTP_GATE`);

        const vCurrentSession = vGetSessionFromRequest(vReq, vConfig.vSessionStore, vConfig.vSessionCookieName);
        if (vCurrentSession && (!vCodigoUsuario || vCurrentSession.vCodigoUsuario === vCodigoUsuario)) {
          vAttachNoStoreHeaders(vRes);
          vRes.sendFile(path.join(vConfig.vCuDir, 'index.html'));
          return;
        }

        if (!vHasValidAuthFormat(vCodigoUsuario, vOTP)) {
          vAttachNoStoreHeaders(vRes);
          vRes.status(403).type('html').send(vUnauthorizedHtml());
          return;
        }

        try {
          const vPool = await vGetPool(vConfig.vLogger);
          const vConn = await vPool.getConnection();

          try {
            const vResultado = await vValidarOtp(vConfig.vLogger, vConn, vCodigoUsuario, vOTP);
            vConfig.vLogger.info(`OTP_VALIDATION: usuario=${vCodigoUsuario} resultado=${vResultado}`);
            if (vResultado !== 1) {
              vAttachNoStoreHeaders(vRes);
              vRes.status(403).type('html').send(vUnauthorizedHtml());
              return;
            }

            const vSessionToken = vCreateSession(vReq, vCodigoUsuario, vConfig.vSessionStore);
            vAttachSessionCookie(vRes, vSessionToken, vConfig.vSessionCookieName);
          } finally {
            vConn.release();
          }

          vAttachNoStoreHeaders(vRes);
          vRes.sendFile(path.join(vConfig.vCuDir, 'index.html'));
        } catch (vError) {
          vConfig.vLogger.error(vError, 'INDEX_OTP_VALIDATION_ERROR');
          vAttachNoStoreHeaders(vRes);
          vRes.status(500).type('html').send(vUnauthorizedHtml());
        }
      }

      app.get(`${vCuPath}/`, vAuthorizeAndServeIndex);
      app.get(`${vCuPath}/index.html`, vAuthorizeAndServeIndex);

      app.use(vCuPath, (vReq, vRes, vNext) => {
        if (vReq.path.endsWith('.js') || vReq.path.endsWith('.css') || vReq.path === '/') {
          vAttachNoStoreHeaders(vRes);
        }
        vNext();
      });

      app.use(vCuPath, express.static(vConfig.vCuDir, { index: false }));
    }

    vRegisterCuRoutes({
      vCuId: vCu005Id,
      vCuDir: vCu005Dir,
      vLogger: vLogger005,
      vSessionStore: vSessionStore005,
      vSessionCookieName: vSessionCookie005Name
    });

    vRegisterCuRoutes({
      vCuId: vCu006Id,
      vCuDir: vCu006Dir,
      vLogger: vLogger006,
      vSessionStore: vSessionStore006,
      vSessionCookieName: vSessionCookie006Name
    });

    vRegisterCuRoutes({
      vCuId: vCu007Id,
      vCuDir: vCu007Dir,
      vLogger: vLogger007,
      vSessionStore: vSessionStore007,
      vSessionCookieName: vSessionCookie007Name
    });

    app.post('/api/cu2-005/init', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const { vParametrosRaw } = vExtractAuthParams(vPayload);
      const vParametros = vParseOptionalParametros(vParametrosRaw);
      const vRequestedBaseCode = vNormalizeBaseCode(vParametros?.codigo_base);
      const vSession = vGetSessionFromRequest(vReq, vSessionStore005, vSessionCookie005Name);

      vLogger005.info(`ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} base_param=${vRequestedBaseCode || '-'}`);

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadWizardState(vLogger005, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vRequestedBaseCode
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: vResult.data
        });
      } catch (vError) {
        vLogger005.error(vError, 'INIT_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
      }
    });

    app.post('/api/cu2-005/stock', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const vSession = vGetSessionFromRequest(vReq, vSessionStore005, vSessionCookie005Name);
      const vRequestedBaseCode = vNormalizeBaseCode(vPayload?.codigo_base);

      vLogger005.info(`ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} base=${vRequestedBaseCode || '-'}`);

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadWizardState(vLogger005, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vRequestedBaseCode
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'STOCK_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: {
            vBase: vResult.data.vBase,
            vPriv: vResult.data.vPriv,
            vBaseAux: vResult.data.vBaseAux,
            vBaseTexto: vResult.data.vBaseTexto,
            vStockBase: vResult.data.vStockBase
          }
        });
      } catch (vError) {
        vLogger005.error(vError, 'STOCK_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'STOCK_ERROR' });
      }
    });

    app.post('/api/cu2-006/init', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const { vParametrosRaw } = vExtractAuthParams(vPayload);
      const vParametros = vParseOptionalParametros(vParametrosRaw);
      const vSession = vGetSessionFromRequest(vReq, vSessionStore006, vSessionCookie006Name);

      vLogger006.info(
        `ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} fecha_desde=${String(vParametros?.fecha_desde || '') || '-'} fecha_hasta=${String(vParametros?.fecha_hasta || '') || '-'}`
      );

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadCu2006State(vLogger006, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vFecha_desde: vParametros?.fecha_desde,
          vFecha_hasta: vParametros?.fecha_hasta,
          vCodigo_producto: vParametros?.codigo_producto,
          vCodigo_base: vParametros?.codigo_base,
          vStrictDates: false
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: vResult.data
        });
      } catch (vError) {
        if (vError?.vStatus === 400) {
          return vRes.status(400).json({ ok: false, message: vError.vCode || 'VALIDATION_ERROR' });
        }
        vLogger006.error(vError, 'INIT_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
      }
    });

    app.post('/api/cu2-006/consultar', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const vSession = vGetSessionFromRequest(vReq, vSessionStore006, vSessionCookie006Name);

      vLogger006.info(
        `ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} fecha_desde=${String(vPayload?.vFecha_desde || '') || '-'} fecha_hasta=${String(vPayload?.vFecha_hasta || '') || '-'} producto=${String(vPayload?.vCodigo_producto || '') || '-'} base=${String(vPayload?.vCodigo_base || '') || '-'}`
      );

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadCu2006State(vLogger006, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vFecha_desde: vPayload?.vFecha_desde,
          vFecha_hasta: vPayload?.vFecha_hasta,
          vCodigo_producto: vPayload?.vCodigo_producto,
          vCodigo_base: vPayload?.vCodigo_base,
          vStrictDates: true
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'QUERY_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: vResult.data
        });
      } catch (vError) {
        if (vError?.vStatus === 400) {
          return vRes.status(400).json({ ok: false, message: vError.vCode || 'VALIDATION_ERROR' });
        }
        vLogger006.error(vError, 'QUERY_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'QUERY_ERROR' });
      }
    });

    app.post('/api/cu2-007/init', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const { vParametrosRaw } = vExtractAuthParams(vPayload);
      const vParametros = vParseOptionalParametros(vParametrosRaw);
      const vSession = vGetSessionFromRequest(vReq, vSessionStore007, vSessionCookie007Name);

      vLogger007.info(
        `ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} fecha=${String(vParametros?.fecha_consulta || '') || '-'} base=${String(vParametros?.codigo_base || '') || '-'}`
      );

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadCu2007State(vLogger007, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vFecha_consulta: vParametros?.fecha_consulta,
          vCodigo_base: vParametros?.codigo_base,
          vStrictDate: false
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: vResult.data
        });
      } catch (vError) {
        if (vError?.vStatus === 400) {
          return vRes.status(400).json({ ok: false, message: vError.vCode || 'VALIDATION_ERROR' });
        }
        vLogger007.error(vError, 'INIT_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'INIT_ERROR' });
      }
    });

    app.post('/api/cu2-007/consultar', express.json({ limit: '1mb' }), async (vReq, vRes) => {
      const vPayload = vReq.body || {};
      const vSession = vGetSessionFromRequest(vReq, vSessionStore007, vSessionCookie007Name);

      vLogger007.info(
        `ENDPOINT: ${vReq.method} ${vReq.path} usuario=${vSession?.vCodigoUsuario || '-'} fecha=${String(vPayload?.vFecha_consulta || '') || '-'} base=${String(vPayload?.vCodigo_base || '') || '-'}`
      );

      if (!vSession || !vSession.vCodigoUsuario) {
        return vSendUnauthorizedJson(vRes);
      }

      try {
        const vResult = await vLoadCu2007State(vLogger007, {
          vCodigoUsuario: vSession.vCodigoUsuario,
          vFecha_consulta: vPayload?.vFecha_consulta,
          vCodigo_base: vPayload?.vCodigo_base,
          vStrictDate: true
        });

        if (!vResult.ok && vResult.unauthorized) {
          return vSendUnauthorizedJson(vRes);
        }

        if (!vResult.ok) {
          return vRes.status(500).json({ ok: false, message: 'QUERY_ERROR' });
        }

        return vRes.json({
          ok: true,
          data: vResult.data
        });
      } catch (vError) {
        if (vError?.vStatus === 400) {
          return vRes.status(400).json({ ok: false, message: vError.vCode || 'VALIDATION_ERROR' });
        }
        vLogger007.error(vError, 'QUERY_ENDPOINT_ERROR');
        return vRes.status(500).json({ ok: false, message: 'QUERY_ERROR' });
      }
    });
  }
});
