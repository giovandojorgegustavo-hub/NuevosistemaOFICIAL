import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

const ERP_YML_PATH = path.join(__dirname, "erp.yml");

function parseErpYaml(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  let current = null;
  const conns = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const nameListMatch = line.match(/^-+\s*name:\s*["']?(.+?)["']?\s*$/i);
    if (nameListMatch) {
      current = { name: nameListMatch[1], dsn: "" };
      conns.push(current);
      continue;
    }

    const nameMatch = line.match(/^name:\s*["']?(.+?)["']?\s*$/i);
    if (nameMatch) {
      current = current ?? { name: "", dsn: "" };
      current.name = nameMatch[1];
      if (!conns.includes(current)) conns.push(current);
      continue;
    }

    const dsnMatch = line.match(/^dsn:\s*["']?(.+?)["']?\s*$/i);
    if (dsnMatch) {
      current = current ?? { name: "", dsn: "" };
      current.dsn = dsnMatch[1];
      if (!conns.includes(current)) conns.push(current);
    }
  }

  const first = conns.find((c) => c?.dsn && c?.name) || conns.find((c) => c?.dsn) || null;
  if (!first?.dsn) return null;
  return { name: String(first.name || "").trim(), dsn: String(first.dsn || "").trim() };
}

function normalizeDsn(rawDsn) {
  const dsn = String(rawDsn || "").trim();
  if (!dsn) return null;
  if (/^(mysql|mariadb):\/\//i.test(dsn)) return dsn;
  if (dsn.includes("@tcp(") && dsn.includes(")/")) return `mysql://${dsn}`;
  return dsn;
}

function parseMysqlUrlLikeDsn(rawDsn) {
  const dsn = normalizeDsn(rawDsn);
  if (!dsn) return null;

  const fixed = dsn.replace(/@tcp\(([^)]+)\)/i, "@$1");
  let u;
  try {
    u = new URL(fixed);
  } catch {
    return null;
  }
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 3306;
  const user = decodeURIComponent(u.username || "");
  const password = decodeURIComponent(u.password || "");
  const database = decodeURIComponent(String(u.pathname || "").replace(/^\//, ""));
  if (!host || !user) return null;
  return { host, port, user, password, database };
}

async function readErpConfig() {
  const raw = await readFile(ERP_YML_PATH, "utf8");
  const yml = parseErpYaml(raw);
  if (!yml) {
    const err = new Error("invalid_erp_yml");
    err.code = "invalid_erp_yml";
    throw err;
  }
  const parsed = parseMysqlUrlLikeDsn(yml.dsn);
  if (!parsed) {
    const err = new Error("invalid_erp_dsn");
    err.code = "invalid_erp_dsn";
    throw err;
  }
  const database = yml.name || parsed.database;
  if (!database) {
    const err = new Error("missing_database");
    err.code = "missing_database";
    throw err;
  }
  return { ...parsed, database };
}

let _poolState = { key: null, pool: null };
async function getPool() {
  const cfg = await readErpConfig();
  const key = JSON.stringify({ host: cfg.host, port: cfg.port, user: cfg.user, database: cfg.database });

  if (_poolState.pool && _poolState.key === key) return _poolState.pool;
  if (_poolState.pool) {
    try {
      await _poolState.pool.end();
    } catch {
      // ignore
    }
  }
  _poolState = {
    key,
    pool: mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    }),
  };
  return _poolState.pool;
}

const _tableColumnsCache = new Map();
async function getTableColumns(conn, tableName) {
  if (_tableColumnsCache.has(tableName)) return _tableColumnsCache.get(tableName);
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName]
  );
  const cols = new Set(rows.map((r) => String(r.COLUMN_NAME)));
  _tableColumnsCache.set(tableName, cols);
  return cols;
}

async function getFirstExistingTableColumns(conn, tableNames) {
  for (const name of tableNames) {
    const cols = await getTableColumns(conn, name);
    if (cols.size > 0) return { name, cols };
  }
  return null;
}

const SQL_LOGS = [];
function pushSqlLog(level, sql) {
  SQL_LOGS.unshift({ at: new Date().toISOString(), level, sql });
  if (SQL_LOGS.length > 200) SQL_LOGS.length = 200;
}

function formatSqlWithParams(sql, params) {
  if (!Array.isArray(params) || params.length === 0) return sql;
  let i = 0;
  return String(sql).replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    const s = String(v).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    return `'${s}'`;
  });
}

async function callSp(connOrPool, spName, params = []) {
  const placeholders = params.length ? params.map(() => "?").join(", ") : "";
  const sql = `CALL \`${spName}\`(${placeholders});`;
  pushSqlLog("INFO", formatSqlWithParams(sql, params));
  const [out] = await connOrPool.query(sql, params);
  return Array.isArray(out) ? out[0] ?? [] : [];
}

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(data.length),
  });
  res.end(data);
}

function text(res, status, body, contentType) {
  const data = Buffer.from(body);
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": String(data.length),
  });
  res.end(data);
}

function notFound(res) {
  text(res, 404, "Not found", "text/plain; charset=utf-8");
}

function badRequest(res, message) {
  json(res, 400, { error: message || "bad_request" });
}

function serverError(res, message, detail) {
  json(res, 500, { error: message || "server_error", detail });
}

async function readBody(req, limitBytes = 512_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error("payload_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function renderInvoiceHtml(payload) {
  const safe = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const products = payload?.factura?.productos ?? [];
  const total = products.reduce((acc, r) => acc + Number(r?.monto || 0), 0);
  const rows = products
    .map(
      (p) => `
        <tr>
          <td>${safe(p.idProducto)}</td>
          <td>${safe(p.descripcion)}</td>
          <td style="text-align:right">${safe(p.cantidad)}</td>
          <td style="text-align:right">${Number(p.precio || 0).toFixed(2)}</td>
          <td style="text-align:right">${Number(p.monto || 0).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const ids = payload?.ids ?? {};
  const numeroDocumento = ids?.numeroDocumento ? String(ids.numeroDocumento) : "";
  const title = numeroDocumento ? `Factura ${numeroDocumento}` : "Factura";

  return `<!doctype html>
<html lang="${payload?.locale === "en" ? "en" : "es"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safe(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica,Arial; padding:24px;}
    .meta{color:#555; margin-bottom:16px;}
    table{width:100%; border-collapse:collapse;}
    th,td{border:1px solid #ddd; padding:8px; vertical-align:top;}
    th{background:#f6f6f6; text-align:left;}
    .right{text-align:right;}
  </style>
</head>
<body>
  <h1>${safe(title)}</h1>
  <div class="meta">
    ${ids?.codigoPedido ? `<div><strong>Pedido:</strong> ${safe(ids.codigoPedido)}</div>` : ""}
    ${ids?.numeroDocumento ? `<div><strong>Documento:</strong> ${safe(ids.numeroDocumento)}</div>` : ""}
    ${ids?.numeroMovimiento ? `<div><strong>Movimiento:</strong> ${safe(ids.numeroMovimiento)}</div>` : ""}
    <div><strong>Cliente:</strong> ${safe(payload?.pedido?.clienteId)}</div>
    <div><strong>Fecha pedido:</strong> ${safe(payload?.pedido?.fecha)} ${safe(payload?.pedido?.hora)}</div>
    <div><strong>Fecha emisión:</strong> ${safe(payload?.factura?.fecha_emision)}</div>
    <div><strong>Base/Packing:</strong> ${safe(payload?.factura?.codigo_base)} / ${safe(payload?.factura?.codigo_packing)}</div>
    <div><strong>Dirección:</strong> ${safe(payload?.entrega?.codigo_cliente_direccion)}</div>
    <div><strong>Receptor:</strong> ${safe(payload?.entrega?.codigo_cliente_numrecibe)}</div>
    <div><strong>Lugar envío:</strong> ${safe(payload?.entrega?.codigo_cliente_direccionprov)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Id</th>
        <th>Descripción</th>
        <th class="right">Cant.</th>
        <th class="right">Precio</th>
        <th class="right">Monto</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5" style="color:#777">—</td></tr>`}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="right"><strong>Total</strong></td>
        <td class="right"><strong>${total.toFixed(2)}</strong></td>
      </tr>
    </tfoot>
  </table>
  <p style="color:#777; margin-top:16px">Generado por el wizard.</p>
</body>
</html>`;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/Compras" || pathname === "/compras") pathname = "/compras.html";
  if (pathname === "/Remito" || pathname === "/remito" || pathname === "/Remitos" || pathname === "/remitos") {
    pathname = "/remito.html";
  }
  if (
    pathname === "/Fabricacion" ||
    pathname === "/fabricacion" ||
    pathname === "/Fabricaciones" ||
    pathname === "/fabricaciones"
  ) {
    pathname = "/fabricacion.html";
  }
  if (
    pathname === "/Transferencias" ||
    pathname === "/transferencias" ||
    pathname === "/Transferencia" ||
    pathname === "/transferencia"
  ) {
    pathname = "/transferencias.html";
  }
  if (pathname === "/Ajustes" || pathname === "/ajustes" || pathname === "/Ajuste" || pathname === "/ajuste") {
    pathname = "/ajustes.html";
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(__dirname, safePath);
  try {
    const st = await stat(filePath);
    if (!st.isFile()) return false;
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const ct =
      ext === ".html"
        ? "text/html; charset=utf-8"
        : ext === ".js"
          ? "text/javascript; charset=utf-8"
          : ext === ".css"
            ? "text/css; charset=utf-8"
            : "application/octet-stream";
    res.writeHead(200, { "content-type": ct });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function parseIdFromPath(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest.startsWith("/")) return null;
  const idStr = rest.slice(1).split("/")[0];
  const id = Number(idStr);
  if (!Number.isFinite(id)) return null;
  return id;
}

async function withTx(pool, fn) {
  const conn = await pool.getConnection();
  try {
    pushSqlLog("INFO", "BEGIN;");
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    pushSqlLog("INFO", "COMMIT;");
    return out;
  } catch (e) {
    try {
      pushSqlLog("ERROR", "ROLLBACK;");
      await conn.rollback();
    } catch {
      // ignore
    }
    throw e;
  } finally {
    conn.release();
  }
}

function requiredNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const err = new Error(`invalid_${field}`);
    err.code = `invalid_${field}`;
    throw err;
  }
  return n;
}

function requiredString(value, field) {
  const s = String(value ?? "").trim();
  if (!s) {
    const err = new Error(`invalid_${field}`);
    err.code = `invalid_${field}`;
    throw err;
  }
  return s;
}

function toMysqlDateTime(dateStr, timeStr) {
  const d = requiredString(dateStr, "fecha");
  const t = requiredString(timeStr, "hora");
  // Expect YYYY-MM-DD and HH:mm
  return `${d} ${t}:00`;
}

function requiredDate(value, field) {
  const s = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const err = new Error(`invalid_${field}`);
    err.code = `invalid_${field}`;
    throw err;
  }
  return s;
}

function requiredDecimal(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const err = new Error(`invalid_${field}`);
    err.code = `invalid_${field}`;
    throw err;
  }
  return n;
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalString(value) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function pickRowValue(row, keys) {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return row[key];
  }
  return null;
}

function formatDateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function splitDateTime(value) {
  if (!value) return { date: "", time: "" };
  if (value instanceof Date) {
    const iso = value.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
  const s = String(value);
  if (s.includes("T")) {
    const [d, rest] = s.split("T");
    return { date: d, time: String(rest || "").slice(0, 5) };
  }
  if (s.includes(" ")) {
    const [d, rest] = s.split(" ");
    return { date: d, time: String(rest || "").slice(0, 5) };
  }
  return { date: s.slice(0, 10), time: "" };
}

function resolveColumn(cols, candidates, field) {
  for (const c of candidates) {
    if (cols.has(c)) return c;
  }
  const err = new Error(`missing_column_${field}`);
  err.code = `missing_column_${field}`;
  throw err;
}

function findColumn(cols, candidates) {
  for (const c of candidates) {
    if (cols.has(c)) return c;
  }
  return null;
}

async function handleViajesSave(pool, payload, { dispatch }) {
  return await withTx(pool, async (conn) => {
    const viaje = payload?.viaje ?? {};
    const vFechaViaje = requiredDate(viaje?.vFechaViaje, "vFechaViaje");
    const Vnombre_motorizado = requiredString(viaje?.Vnombre_motorizado, "Vnombre_motorizado");
    const vBaseSelected = requiredNumber(viaje?.vBaseSelected, "vBaseSelected");
    const viajeFechaTs = `${vFechaViaje} 00:00:00`;

    const detalles = Array.isArray(payload?.detalles) ? payload.detalles : [];
    if (detalles.length === 0) {
      const err = new Error("viaje_sin_detalle");
      err.code = "viaje_sin_detalle";
      throw err;
    }

    const viajesCols = await getTableColumns(conn, "viajes");
    const viajeIdCol = resolveColumn(
      viajesCols,
      ["vCodigo_viaje", "codigo_viaje", "id_viaje", "viaje_id", "codigoviaje"],
      "viajeId"
    );

    const suppliedId = optionalNumber(viaje?.vCodigo_viaje);
    let codigoViaje = null;
    let exists = false;
    if (suppliedId) {
      const [rows] = await conn.query(`SELECT 1 AS ok FROM viajes WHERE \`${viajeIdCol}\` = ? LIMIT 1`, [suppliedId]);
      exists = rows.length > 0;
      if (exists) codigoViaje = suppliedId;
    }

    if (!exists) {
      if (suppliedId) {
        codigoViaje = suppliedId;
      } else {
        const [rows] = await conn.query(
          `SELECT COALESCE(MAX(\`${viajeIdCol}\`), 0) + 1 AS nextId FROM viajes FOR UPDATE`
        );
        codigoViaje = Number(rows?.[0]?.nextId || 0) || null;
      }
    }

    const columns = [];
    const values = [];
    const addColumnValue = (col, value) => {
      if (!col || columns.includes(col)) return;
      columns.push(col);
      values.push(value);
    };
    const pushIf = (fieldKey, candidateCols, value, { required } = {}) => {
      const col = required ? resolveColumn(viajesCols, candidateCols, fieldKey) : findColumn(viajesCols, candidateCols);
      if (!col) return;
      if (value === null && !required) return;
      addColumnValue(col, value);
    };

    if (!exists && codigoViaje !== null) {
      if (viajesCols.has("id")) addColumnValue("id", codigoViaje);
      if (viajeIdCol && viajeIdCol !== "id") addColumnValue(viajeIdCol, codigoViaje);
    }

    pushIf("vFechaViaje", ["vFechaViaje", "fecha_viaje", "fecha"], vFechaViaje, { required: true });
    pushIf("Vnombre_motorizado", ["Vnombre_motorizado", "nombre_motorizado"], Vnombre_motorizado, { required: true });
    pushIf("Vnumero_wsp", ["Vnumero_wsp", "numero_wsp", "whatsapp"], optionalString(viaje?.Vnumero_wsp));
    pushIf("Vnum_llamadas", ["Vnum_llamadas", "num_llamadas"], optionalNumber(viaje?.Vnum_llamadas));
    pushIf("Vnum_yape", ["Vnum_yape", "num_yape"], optionalNumber(viaje?.Vnum_yape));
    pushIf("Vlink", ["Vlink", "link"], optionalString(viaje?.Vlink));
    pushIf("Vobservacion", ["Vobservacion", "observacion"], optionalString(viaje?.Vobservacion));
    pushIf("vBaseSelected", ["vBaseSelected", "codigo_base", "base"], vBaseSelected, { required: true });

    if (dispatch) {
      if (viajesCols.has("estado")) pushIf("estado", ["estado"], "DESPACHADO");
      if (viajesCols.has("status")) pushIf("status", ["status"], "DESPACHADO");
      if (viajesCols.has("despachado")) pushIf("despachado", ["despachado"], 1);
      if (viajesCols.has("fecha_despacho")) pushIf("fecha_despacho", ["fecha_despacho"], new Date());
    }

    if (exists) {
      const setSql = columns.map((c) => `\`${c}\` = ?`).join(", ");
      const sql = `UPDATE viajes SET ${setSql} WHERE \`${viajeIdCol}\` = ?`;
      const params = [...values, codigoViaje];
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, params));
      await conn.execute(sql, params);
    } else {
      const colsSql = columns.map((c) => `\`${c}\``).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT INTO viajes (${colsSql}) VALUES (${placeholders})`;
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, values));
      const [result] = await conn.execute(sql, values);
      codigoViaje = codigoViaje ?? (Number(result.insertId || suppliedId || 0) || suppliedId || null);
    }

    if (!codigoViaje) {
      const err = new Error("viaje_id_missing");
      err.code = "viaje_id_missing";
      throw err;
    }

    const detalleInfo = await getFirstExistingTableColumns(conn, ["viajes_detalle", "detalleviaje"]);
    if (!detalleInfo) {
      const err = new Error("missing_viaje_detalle_table");
      err.code = "missing_viaje_detalle_table";
      throw err;
    }
    const detalleCols = detalleInfo.cols;
    const detalleFkCol = resolveColumn(
      detalleCols,
      ["vCodigo_viaje", "codigo_viaje", "id_viaje", "viaje_id", "codigoviaje"],
      "viajeDetalleFk"
    );
    const detalleDocCol = resolveColumn(detalleCols, ["numero_documento"], "numero_documento");
    const detalleTipoCol = findColumn(detalleCols, ["tipo_documento"]);
    const detalleFechaInicioCol = findColumn(detalleCols, ["fecha_inicio"]);
    const detalleFechaFinCol = findColumn(detalleCols, ["fecha_fin"]);

    const movCols = await getTableColumns(conn, "mov_contable");
    const movTipoCol = findColumn(movCols, ["tipo_documento"]);
    const movDocCol = resolveColumn(movCols, ["numero_documento"], "numero_documento");
    const movPackCol = resolveColumn(movCols, ["codigo_packing"], "codigo_packing");

    pushSqlLog(
      "INFO",
      formatSqlWithParams(`DELETE FROM ${detalleInfo.name} WHERE \`${detalleFkCol}\` = ?;`, [codigoViaje])
    );
    await conn.execute(`DELETE FROM ${detalleInfo.name} WHERE \`${detalleFkCol}\` = ?`, [codigoViaje]);

    for (const row of detalles) {
      const doc = requiredString(row?.numero_documento, "numero_documento");
      if (!/^[0-9]+$/.test(doc)) {
        const err = new Error("invalid_numero_documento");
        err.code = "invalid_numero_documento";
        throw err;
      }
      const packing = requiredNumber(row?.codigo_packing, "codigo_packing");
      const detalleColumns = [detalleFkCol, detalleDocCol];
      const detalleValues = [codigoViaje, doc];
      if (detalleCols.has("id")) {
        detalleColumns.unshift("id");
        detalleValues.unshift(codigoViaje);
      }
      if (detalleTipoCol) {
        detalleColumns.push(detalleTipoCol);
        detalleValues.push("FAC");
      }
      if (detalleFechaInicioCol) {
        detalleColumns.push(detalleFechaInicioCol);
        detalleValues.push(viajeFechaTs);
      }
      if (detalleFechaFinCol) {
        detalleColumns.push(detalleFechaFinCol);
        detalleValues.push(viajeFechaTs);
      }
      const detalleColsSql = detalleColumns.map((c) => `\`${c}\``).join(", ");
      const detallePlaceholders = detalleColumns.map(() => "?").join(", ");
      const detalleSql = `INSERT INTO ${detalleInfo.name} (${detalleColsSql}) VALUES (${detallePlaceholders})`;
      const detalleParams = [...detalleValues];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);

      const movWhere = movTipoCol ? `\`${movTipoCol}\` = ? AND \`${movDocCol}\` = ?` : `\`${movDocCol}\` = ?`;
      const movSql = `UPDATE mov_contable SET \`${movPackCol}\` = ? WHERE ${movWhere}`;
      const movParams = movTipoCol ? [packing, "FAC", doc] : [packing, doc];
      pushSqlLog("INFO", formatSqlWithParams(`${movSql};`, movParams));
      const [movResult] = await conn.execute(movSql, movParams);
      if (!movResult || movResult.affectedRows === 0) {
        const err = new Error("mov_contable_not_found");
        err.code = "mov_contable_not_found";
        err.detail = { numero_documento: doc };
        throw err;
      }
    }

    return { codigo_viaje: codigoViaje, despachado: Boolean(dispatch) };
  });
}

async function handlePagosSave(pool, payload) {
  return await withTx(pool, async (conn) => {
    const pago = payload?.pago ?? {};
    const vFecha = requiredDate(pago?.vFecha, "vFecha");
    const cuentaId = optionalNumber(pago?.vCuenta_bancariaSelect);
    const monto = optionalNumber(pago?.vMonto);
    const codigoCliente = requiredNumber(pago?.vCodigo_cliente, "vCodigo_cliente");

    const movCols = await getTableColumns(conn, "mov_contable");
    const movIdCol = findColumn(movCols, ["id"]);
    const movTipoCol = resolveColumn(movCols, ["tipo_documento"], "tipo_documento");
    const movDocCol = resolveColumn(movCols, ["numero_documento"], "numero_documento");
    const movClienteCol = resolveColumn(movCols, ["codigo_cliente"], "codigo_cliente");
    const movMontoCol = findColumn(movCols, ["monto", "monto_total", "monto_pago"]);
    const movCuentaCol = findColumn(movCols, ["codigo_cuentabancaria", "cuenta_bancaria", "vCuenta_bancariaSelect"]);
    const movFechaEmisionCol = findColumn(movCols, ["fecha_emision"]);
    const movFechaVencCol = findColumn(movCols, ["fecha_vencimiento"]);
    const movFechaValorCol = findColumn(movCols, ["fecha_valor"]);

    const tipoDocumento = "REC";
    const selectSql = movTipoCol
      ? `SELECT COALESCE(MAX(\`${movDocCol}\`), 0) + 1 AS nextRec FROM mov_contable WHERE \`${movTipoCol}\` = ? FOR UPDATE`
      : `SELECT COALESCE(MAX(\`${movDocCol}\`), 0) + 1 AS nextRec FROM mov_contable FOR UPDATE`;
    const selectParams = movTipoCol ? [tipoDocumento] : [];
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, selectParams));
    const [[{ nextRec }]] = await conn.query(selectSql, selectParams);
    const numeroDocumento = Number(nextRec || 0) || 1;

    const columns = [];
    const values = [];
    const addColumnValue = (col, value) => {
      if (!col || columns.includes(col)) return;
      if (value === null || value === undefined) return;
      columns.push(col);
      values.push(value);
    };

    if (movIdCol) addColumnValue(movIdCol, numeroDocumento);
    addColumnValue(movTipoCol, tipoDocumento);
    addColumnValue(movDocCol, numeroDocumento);
    addColumnValue(movClienteCol, codigoCliente);
    addColumnValue(movMontoCol, monto);
    addColumnValue(movCuentaCol, cuentaId);

    const fechaPago = `${vFecha} 00:00:00`;
    addColumnValue(movFechaEmisionCol, fechaPago);
    addColumnValue(movFechaVencCol, fechaPago);
    addColumnValue(movFechaValorCol, fechaPago);

    const colsSql = columns.map((c) => `\`${c}\``).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO mov_contable (${colsSql}) VALUES (${placeholders})`;
    pushSqlLog("INFO", formatSqlWithParams(`${sql};`, values));
    await conn.execute(sql, values);

    return { numero_documento: numeroDocumento, tipo_documento: tipoDocumento };
  });
}

async function handleNotaCreditoEmit(pool, payload) {
  return await withTx(pool, async (conn) => {
    const nota = payload?.nota ?? {};
    const fechaEmision = requiredDate(nota?.vFecha_emision, "vFecha_emision");
    const codigoCliente = requiredNumber(nota?.vCodigo_cliente, "vCodigo_cliente");
    const tipoDocumento = String(nota?.vTipo_Documento || "NC").trim().toUpperCase();
    if (tipoDocumento !== "NC") {
      const err = new Error("invalid_tipo_documento");
      err.code = "invalid_tipo_documento";
      throw err;
    }

    const codigoBase = optionalNumber(nota?.vCodigo_base);
    const lineas = Array.isArray(nota?.vProdNotaCredito) ? nota.vProdNotaCredito : [];
    if (codigoBase && lineas.length === 0) {
      const err = new Error("nota_credito_sin_detalle");
      err.code = "nota_credito_sin_detalle";
      throw err;
    }

    const movCols = await getTableColumns(conn, "mov_contable");
    const movTipoCol = resolveColumn(movCols, ["tipo_documento"], "tipo_documento");
    const movDocCol = resolveColumn(movCols, ["numero_documento"], "numero_documento");
    const movClienteCol = resolveColumn(movCols, ["codigo_cliente"], "codigo_cliente");
    const movBaseCol = findColumn(movCols, ["codigo_base"]);
    const movMontoCol = findColumn(movCols, ["monto", "monto_total", "total"]);
    const movFechaEmisionCol = findColumn(movCols, ["fecha_emision"]);
    const movFechaVencCol = findColumn(movCols, ["fecha_vencimiento"]);
    const movFechaValorCol = findColumn(movCols, ["fecha_valor"]);

    const selectSql = `SELECT COALESCE(MAX(\`${movDocCol}\`), 0) + 1 AS nextDoc FROM mov_contable WHERE \`${movTipoCol}\` = ? FOR UPDATE`;
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextDoc }]] = await conn.query(selectSql, [tipoDocumento]);
    const numeroDocumento = Number(nextDoc || 0) || 1;

    const columns = [];
    const values = [];
    const addColumnValue = (col, value) => {
      if (!col || columns.includes(col)) return;
      if (value === null || value === undefined) return;
      columns.push(col);
      values.push(value);
    };

    const fechaEmisionDt = `${fechaEmision} 00:00:00`;
    addColumnValue(movTipoCol, tipoDocumento);
    addColumnValue(movDocCol, numeroDocumento);
    addColumnValue(movClienteCol, codigoCliente);
    addColumnValue(movBaseCol, codigoBase);
    addColumnValue(movMontoCol, 0);
    addColumnValue(movFechaEmisionCol, fechaEmisionDt);
    addColumnValue(movFechaVencCol, fechaEmisionDt);
    addColumnValue(movFechaValorCol, fechaEmisionDt);

    const colsSql = columns.map((c) => `\`${c}\``).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO mov_contable (${colsSql}) VALUES (${placeholders})`;
    pushSqlLog("INFO", formatSqlWithParams(`${sql};`, values));
    await conn.execute(sql, values);

    if (lineas.length > 0) {
      const detalleCols = await getTableColumns(conn, "mov_contable_detalle");
      const detTipoCol = resolveColumn(detalleCols, ["tipo_documento"], "tipo_documento");
      const detDocCol = resolveColumn(detalleCols, ["numero_documento"], "numero_documento");
      const detOrdinalCol = resolveColumn(detalleCols, ["ordinal"], "ordinal");
      const detProdCol = resolveColumn(detalleCols, ["codigo_producto"], "codigo_producto");
      const detQtyCol = resolveColumn(detalleCols, ["cantidad"], "cantidad");

      let ordinal = 0;
      for (const row of lineas) {
        const codigoProducto = requiredNumber(row?.codigo_producto ?? row?.idProducto, "codigo_producto");
        const cantidad = Number(row?.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          const err = new Error("invalid_cantidad");
          err.code = "invalid_cantidad";
          throw err;
        }
        ordinal += 1;
        const detColumns = [detTipoCol, detDocCol, detOrdinalCol, detProdCol, detQtyCol];
        const detValues = [tipoDocumento, numeroDocumento, ordinal, codigoProducto, cantidad];
        const detColsSql = detColumns.map((c) => `\`${c}\``).join(", ");
        const detPlaceholders = detColumns.map(() => "?").join(", ");
        const detSql = `INSERT INTO mov_contable_detalle (${detColsSql}) VALUES (${detPlaceholders})`;
        pushSqlLog("INFO", formatSqlWithParams(`${detSql};`, detValues));
        await conn.execute(detSql, detValues);
      }
    }

    return { numero_documento: numeroDocumento, tipo_documento: tipoDocumento };
  });
}

async function handleComprasFacturar(pool, payload) {
  return await withTx(pool, async (conn) => {
    const compra = payload?.compra ?? {};
    const vFecha = requiredDate(compra?.vFecha, "vFecha");
    const vCodigo_provedor = requiredNumber(compra?.vCodigo_provedor, "vCodigo_provedor");
    const tipoDocumento = String(compra?.vTipo_documento_compra || "FC").trim().toUpperCase();
    if (tipoDocumento !== "FC") {
      const err = new Error("invalid_tipo_documento_compra");
      err.code = "invalid_tipo_documento_compra";
      throw err;
    }

    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    if (detalle.length === 0) {
      const err = new Error("compra_sin_detalle");
      err.code = "compra_sin_detalle";
      throw err;
    }

    const selectSql =
      "SELECT COALESCE(MAX(`num_documento_compra`), 0) + 1 AS nextNum FROM mov_contable_compras WHERE `tipo_documento_compra` = ? FOR UPDATE";
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextNum }]] = await conn.query(selectSql, [tipoDocumento]);
    const numDocumento = Number(nextNum || 0) || 1;

    const fechaTs = `${vFecha} 00:00:00`;
    const insertCompraSql =
      "INSERT INTO mov_contable_compras (tipo_documento_compra, num_documento_compra, codigo_provedor, fecha) VALUES (?, ?, ?, ?)";
    const compraParams = [tipoDocumento, numDocumento, vCodigo_provedor, fechaTs];
    pushSqlLog("INFO", formatSqlWithParams(`${insertCompraSql};`, compraParams));
    await conn.execute(insertCompraSql, compraParams);

    let ordinal = 0;
    for (const row of detalle) {
      const codigoProducto = requiredNumber(row?.codigo_producto, "codigo_producto");
      const cantidad = requiredDecimal(row?.cantidad, "cantidad");
      if (cantidad <= 0) {
        const err = new Error("invalid_cantidad");
        err.code = "invalid_cantidad";
        throw err;
      }
      const saldo = requiredDecimal(row?.saldo, "saldo");
      const precioCompra = requiredDecimal(row?.precio_compra, "precio_compra");
      if (precioCompra < 0) {
        const err = new Error("invalid_precio_compra");
        err.code = "invalid_precio_compra";
        throw err;
      }
      ordinal += 1;
      const detalleSql =
        "INSERT INTO detalle_mov_contable_compras (tipo_documento_compra, num_documento_compra, codigo_provedor, ordinal, codigo_producto, cantidad, saldo, precio_compra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      const detalleParams = [
        tipoDocumento,
        numDocumento,
        vCodigo_provedor,
        ordinal,
        codigoProducto,
        cantidad,
        saldo,
        precioCompra,
      ];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);
    }

    return { num_documento_compra: numDocumento, tipo_documento_compra: tipoDocumento };
  });
}

async function handleRemitoCrear(pool, payload) {
  return await withTx(pool, async (conn) => {
    const remito = payload?.remito ?? {};
    const vFecha = requiredDate(remito?.vFecha, "vFecha");
    const vCodigo_base = requiredNumber(remito?.vCodigo_base, "vCodigo_base");
    const tipoDocumento = String(remito?.vTipo_documento || "REM").trim().toUpperCase();
    if (tipoDocumento !== "REM") {
      const err = new Error("invalid_tipo_documento_remito");
      err.code = "invalid_tipo_documento_remito";
      throw err;
    }

    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    if (detalle.length === 0) {
      const err = new Error("remito_sin_detalle");
      err.code = "remito_sin_detalle";
      throw err;
    }

    const selectSql =
      "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ? FOR UPDATE";
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextNum }]] = await conn.query(selectSql, [tipoDocumento]);
    const numDocumento = Number(nextNum || 0) || 1;

    const fechaTs = `${vFecha} 00:00:00`;
    const insertRemitoSql =
      "INSERT INTO movimiento_stock (tipo_documento, num_documento, fecha, codigo_base) VALUES (?, ?, ?, ?)";
    const remitoParams = [tipoDocumento, numDocumento, fechaTs, vCodigo_base];
    pushSqlLog("INFO", formatSqlWithParams(`${insertRemitoSql};`, remitoParams));
    await conn.execute(insertRemitoSql, remitoParams);

    let ordinal = 0;
    for (const row of detalle) {
      const codigoProducto = requiredNumber(row?.codigo_producto, "codigo_producto");
      const cantidad = requiredDecimal(row?.cantidad, "cantidad");
      if (cantidad <= 0) {
        const err = new Error("invalid_cantidad");
        err.code = "invalid_cantidad";
        throw err;
      }
      ordinal += 1;
      const detalleSql =
        "INSERT INTO detalle_movimiento_stock (tipo_documento, num_documento, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)";
      const detalleParams = [tipoDocumento, numDocumento, ordinal, codigoProducto, cantidad];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);
    }

    return { num_documento: numDocumento, tipo_documento: tipoDocumento };
  });
}

async function handleAjusteCrear(pool, payload) {
  return await withTx(pool, async (conn) => {
    const ajuste = payload?.ajuste ?? {};
    const vFecha = requiredDate(ajuste?.vFecha, "vFecha");
    const vCodigo_base = requiredNumber(ajuste?.vCodigo_base, "vCodigo_base");
    const tipoDocumento = String(ajuste?.vTipo_documento || "AJU").trim().toUpperCase();
    if (tipoDocumento !== "AJU") {
      const err = new Error("invalid_tipo_documento_ajuste");
      err.code = "invalid_tipo_documento_ajuste";
      throw err;
    }

    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    if (detalle.length === 0) {
      const err = new Error("ajuste_sin_detalle");
      err.code = "ajuste_sin_detalle";
      throw err;
    }

    const selectSql =
      "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ? FOR UPDATE";
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextNum }]] = await conn.query(selectSql, [tipoDocumento]);
    const numDocumento = Number(nextNum || 0) || 1;

    const fechaTs = `${vFecha} 00:00:00`;
    const insertSql =
      "INSERT INTO movimiento_stock (tipo_documento, num_documento, fecha, codigo_base) VALUES (?, ?, ?, ?)";
    const ajusteParams = [tipoDocumento, numDocumento, fechaTs, vCodigo_base];
    pushSqlLog("INFO", formatSqlWithParams(`${insertSql};`, ajusteParams));
    await conn.execute(insertSql, ajusteParams);

    let ordinal = 0;
    for (const row of detalle) {
      const codigoProducto = requiredNumber(row?.codigo_producto, "codigo_producto");
      const cantidad = requiredDecimal(row?.cantidad, "cantidad");
      if (cantidad <= 0) {
        const err = new Error("invalid_cantidad");
        err.code = "invalid_cantidad";
        throw err;
      }
      ordinal += 1;
      const detalleSql =
        "INSERT INTO detalle_movimiento_stock (tipo_documento, num_documento, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)";
      const detalleParams = [tipoDocumento, numDocumento, ordinal, codigoProducto, cantidad];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);
    }

    return { num_documento: numDocumento, tipo_documento: tipoDocumento };
  });
}

async function handleTransferenciaCrear(pool, payload) {
  return await withTx(pool, async (conn) => {
    const transferencia = payload?.transferencia ?? {};
    const vFecha = requiredDate(transferencia?.vFecha, "vFecha");
    const vCodigo_base = requiredNumber(transferencia?.vCodigo_base, "vCodigo_base");
    const vCodigo_basedestino = requiredNumber(transferencia?.vCodigo_basedestino, "vCodigo_basedestino");
    const tipoDocumento = String(transferencia?.vTipo_documento || "TRA").trim().toUpperCase();
    if (tipoDocumento !== "TRA") {
      const err = new Error("invalid_tipo_documento_transferencia");
      err.code = "invalid_tipo_documento_transferencia";
      throw err;
    }

    const detalle = Array.isArray(payload?.detalle) ? payload.detalle : [];
    if (detalle.length === 0) {
      const err = new Error("transferencia_sin_detalle");
      err.code = "transferencia_sin_detalle";
      throw err;
    }

    const selectSql =
      "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ? FOR UPDATE";
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextNum }]] = await conn.query(selectSql, [tipoDocumento]);
    const numDocumento = Number(nextNum || 0) || 1;

    const fechaTs = `${vFecha} 00:00:00`;
    const insertSql =
      "INSERT INTO movimiento_stock (tipo_documento, num_documento, fecha, codigo_base, codigo_basedestino) VALUES (?, ?, ?, ?, ?)";
    const transferenciaParams = [tipoDocumento, numDocumento, fechaTs, vCodigo_base, vCodigo_basedestino];
    pushSqlLog("INFO", formatSqlWithParams(`${insertSql};`, transferenciaParams));
    await conn.execute(insertSql, transferenciaParams);

    let ordinal = 0;
    for (const row of detalle) {
      const codigoProducto = requiredNumber(row?.codigo_producto, "codigo_producto");
      const cantidad = requiredDecimal(row?.cantidad, "cantidad");
      if (cantidad <= 0) {
        const err = new Error("invalid_cantidad");
        err.code = "invalid_cantidad";
        throw err;
      }
      ordinal += 1;
      const detalleSql =
        "INSERT INTO detalle_movimiento_stock (tipo_documento, num_documento, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)";
      const detalleParams = [tipoDocumento, numDocumento, ordinal, codigoProducto, cantidad];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);
    }

    return { num_documento: numDocumento, tipo_documento: tipoDocumento };
  });
}

async function handleFabricacionCrear(pool, payload) {
  return await withTx(pool, async (conn) => {
    const fabricacion = payload?.fabricacion ?? {};
    const vFecha = requiredDate(fabricacion?.vFecha, "vFecha");
    const vCodigo_base = requiredNumber(fabricacion?.vCodigo_base, "vCodigo_base");
    const tipoDocumento = String(fabricacion?.vTipo_documento || "FAB").trim().toUpperCase();
    if (tipoDocumento !== "FAB") {
      const err = new Error("invalid_tipo_documento_fabricacion");
      err.code = "invalid_tipo_documento_fabricacion";
      throw err;
    }

    const consumo = Array.isArray(payload?.detalleConsumo) ? payload.detalleConsumo : [];
    const fabricado = Array.isArray(payload?.detalleFabricado) ? payload.detalleFabricado : [];
    if (consumo.length === 0) {
      const err = new Error("fabricacion_sin_consumo");
      err.code = "fabricacion_sin_consumo";
      throw err;
    }
    if (fabricado.length === 0) {
      const err = new Error("fabricacion_sin_fabricado");
      err.code = "fabricacion_sin_fabricado";
      throw err;
    }

    const selectSql =
      "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ? FOR UPDATE";
    pushSqlLog("INFO", formatSqlWithParams(`${selectSql};`, [tipoDocumento]));
    const [[{ nextNum }]] = await conn.query(selectSql, [tipoDocumento]);
    const numDocumento = Number(nextNum || 0) || 1;

    const fechaTs = `${vFecha} 00:00:00`;
    const insertSql =
      "INSERT INTO movimiento_stock (tipo_documento, num_documento, fecha, codigo_base) VALUES (?, ?, ?, ?)";
    const insertParams = [tipoDocumento, numDocumento, fechaTs, vCodigo_base];
    pushSqlLog("INFO", formatSqlWithParams(`${insertSql};`, insertParams));
    await conn.execute(insertSql, insertParams);

    let ordinal = 0;
    const insertDetalle = async (row, qtySign) => {
      const codigoProducto = requiredNumber(row?.codigo_producto, "codigo_producto");
      const cantidad = requiredDecimal(row?.cantidad, "cantidad");
      if (cantidad <= 0) {
        const err = new Error("invalid_cantidad");
        err.code = "invalid_cantidad";
        throw err;
      }
      ordinal += 1;
      const signedQty = qtySign * Math.abs(cantidad);
      const detalleSql =
        "INSERT INTO detalle_movimiento_stock (tipo_documento, num_documento, ordinal, codigo_producto, cantidad) VALUES (?, ?, ?, ?, ?)";
      const detalleParams = [tipoDocumento, numDocumento, ordinal, codigoProducto, signedQty];
      pushSqlLog("INFO", formatSqlWithParams(`${detalleSql};`, detalleParams));
      await conn.execute(detalleSql, detalleParams);
    };

    for (const row of consumo) {
      await insertDetalle(row, -1);
    }
    for (const row of fabricado) {
      await insertDetalle(row, 1);
    }

    return { num_documento: numDocumento, tipo_documento: tipoDocumento };
  });
}

function pickInvoiceLines(payload) {
  const facturaLines = payload?.factura?.productos;
  if (Array.isArray(facturaLines) && facturaLines.length) return facturaLines;
  const pedidoLines = payload?.pedido?.productos;
  return Array.isArray(pedidoLines) ? pedidoLines : [];
}

function parseCompositeKey(value, field) {
  const s = requiredString(value, field);
  const [a, b] = s.split("|");
  const codigo = Number(a);
  const ordinal = Number(b);
  if (!Number.isFinite(codigo) || !Number.isFinite(ordinal)) {
    const err = new Error(`invalid_${field}`);
    err.code = `invalid_${field}`;
    throw err;
  }
  return { codigo, ordinal };
}

async function handleErpEmit(pool, payload) {
  return await withTx(pool, async (conn) => {
    const clienteId = requiredNumber(payload?.pedido?.clienteId, "clienteId");
    const fechaPedido = toMysqlDateTime(payload?.pedido?.fecha, payload?.pedido?.hora);

    const factura = payload?.factura ?? {};
    const fechaEmision = requiredDate(factura?.fecha_emision, "fecha_emision");
    const baseId = requiredNumber(factura?.codigo_base, "codigo_base");
    const packingId = requiredNumber(factura?.codigo_packing, "codigo_packing");

    const entrega = payload?.entrega ?? {};
    const dir = parseCompositeKey(entrega?.codigo_cliente_direccion, "codigo_cliente_direccion");
    const dirProv = parseCompositeKey(entrega?.codigo_cliente_direccionprov, "codigo_cliente_direccionprov");
    const numRec = parseCompositeKey(entrega?.codigo_cliente_numrecibe, "codigo_cliente_numrecibe");

    const pedidoProductos = Array.isArray(payload?.pedido?.productos) ? payload.pedido.productos : [];
    if (pedidoProductos.length === 0) {
      const err = new Error("pedido_sin_productos");
      err.code = "pedido_sin_productos";
      throw err;
    }

    const invoiceLines = pickInvoiceLines(payload);
    if (invoiceLines.length === 0) {
      const err = new Error("factura_sin_productos");
      err.code = "factura_sin_productos";
      throw err;
    }

    const [[{ nextPedido }]] = await conn.query(
      "SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS nextPedido FROM pedidos FOR UPDATE"
    );
    const codigoPedido = Number(nextPedido);
    const pedidosCols = await getTableColumns(conn, "pedidos");
    const pedidoColumns = ["codigo_pedido"];
    const pedidoValues = [codigoPedido];
    if (pedidosCols.has("id")) {
      pedidoColumns.unshift("id");
      pedidoValues.unshift(codigoPedido);
    }

    if (pedidosCols.has("fecha")) {
      pedidoColumns.push("fecha");
      pedidoValues.push(fechaPedido);
    }
    if (pedidosCols.has("vFechaPedido")) {
      pedidoColumns.push("vFechaPedido");
      pedidoValues.push(payload?.pedido?.fecha ?? null);
    }
    if (pedidosCols.has("vHoraPedido")) {
      pedidoColumns.push("vHoraPedido");
      pedidoValues.push(payload?.pedido?.hora ?? null);
    }
    if (pedidosCols.has("hora")) {
      pedidoColumns.push("hora");
      pedidoValues.push(payload?.pedido?.hora ?? null);
    }
    if (pedidosCols.has("codigo_cliente")) {
      pedidoColumns.push("codigo_cliente");
      pedidoValues.push(clienteId);
    }
    if (pedidosCols.has("cliente_id")) {
      pedidoColumns.push("cliente_id");
      pedidoValues.push(clienteId);
    }
    if (pedidosCols.has("cliente")) {
      pedidoColumns.push("cliente");
      pedidoValues.push(clienteId);
    }
    if (pedidosCols.has("vClienteSelected")) {
      pedidoColumns.push("vClienteSelected");
      pedidoValues.push(clienteId);
    }

    const pedidoColsSql = pedidoColumns.map((c) => `\`${c}\``).join(", ");
    const pedidoPlaceholders = pedidoColumns.map(() => "?").join(", ");
    const pedidoSql = `INSERT INTO pedidos (${pedidoColsSql}) VALUES (${pedidoPlaceholders})`;
    pushSqlLog("INFO", formatSqlWithParams(`${pedidoSql};`, pedidoValues));
    await conn.execute(pedidoSql, pedidoValues);

    let ordinalPedido = 0;
    for (const row of pedidoProductos) {
      ordinalPedido += 1;
      const codigoProducto = requiredNumber(row?.idProducto, "idProducto");
      const cantidad = Number(row?.cantidad || 0);
      const precioUnitario = Number(row?.precio || 0);
      const saldo = Number(row?.saldo ?? 0);
      if (!(cantidad > 0)) {
        const err = new Error("cantidad_invalida");
        err.code = "cantidad_invalida";
        throw err;
      }
      pushSqlLog(
        "INFO",
        formatSqlWithParams(
          "INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_unitario, saldo) VALUES (?, ?, ?, ?, ?, ?);",
          [codigoPedido, ordinalPedido, codigoProducto, cantidad, precioUnitario, saldo]
        )
      );
      await conn.execute(
        "INSERT INTO pedido_detalle (codigo_pedido, ordinal, codigo_producto, cantidad, precio_unitario, saldo) VALUES (?, ?, ?, ?, ?, ?)",
        [codigoPedido, ordinalPedido, codigoProducto, cantidad, precioUnitario, saldo]
      );
    }

    const [[{ nextFactura }]] = await conn.query(
      "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS nextFactura FROM mov_contable WHERE tipo_documento = 'FAC' FOR UPDATE"
    );
    const numeroDocumento = Number(nextFactura);
    const tipoDocumento = "FAC";

    const montoTotal = invoiceLines.reduce((acc, r) => acc + Number(r?.monto || 0), 0);
    const fechaEmisionDt = `${fechaEmision} 00:00:00`;

    pushSqlLog(
      "INFO",
      formatSqlWithParams(
        "INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          codigoPedido,
          fechaEmisionDt,
          fechaEmisionDt,
          fechaEmisionDt,
          clienteId,
          montoTotal,
          tipoDocumento,
          numeroDocumento,
          baseId,
          packingId,
          dir.codigo,
          dir.ordinal,
          dirProv.codigo,
          dirProv.ordinal,
          numRec.codigo,
          numRec.ordinal,
        ]
      )
    );
    await conn.execute(
      "INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        codigoPedido,
        fechaEmisionDt,
        fechaEmisionDt,
        fechaEmisionDt,
        clienteId,
        montoTotal,
        tipoDocumento,
        numeroDocumento,
        baseId,
        packingId,
        dir.codigo,
        dir.ordinal,
        dirProv.codigo,
        dirProv.ordinal,
        numRec.codigo,
        numRec.ordinal,
      ]
    );

    let ordinalFactura = 0;
    for (const row of invoiceLines) {
      ordinalFactura += 1;
      const codigoProducto = requiredNumber(row?.idProducto, "idProducto");
      const cantidad = Number(row?.cantidad || 0);
      const precioUnitario = Number(row?.precio || 0);
      const montoLinea = Number(row?.monto || 0);
      if (!(cantidad > 0)) {
        const err = new Error("cantidad_invalida");
        err.code = "cantidad_invalida";
        throw err;
      }
      pushSqlLog(
        "INFO",
        formatSqlWithParams(
          "INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?);",
          [
            tipoDocumento,
            numeroDocumento,
            ordinalFactura,
            codigoProducto,
            cantidad,
            precioUnitario,
            montoLinea,
          ]
        )
      );
      await conn.execute(
        "INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          tipoDocumento,
          numeroDocumento,
          ordinalFactura,
          codigoProducto,
          cantidad,
          precioUnitario,
          montoLinea,
        ]
      );
    }

    const numeroMovimiento = `SAL-${numeroDocumento}`;
    pushSqlLog(
      "INFO",
      formatSqlWithParams(
        "INSERT INTO movimientos (fk_mov_codigopedido, tipo_movimiento, numero_movimiento, codigo_cliente, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          codigoPedido,
          numeroMovimiento,
          clienteId,
          baseId,
          packingId,
          dir.codigo,
          dir.ordinal,
          dirProv.codigo,
          dirProv.ordinal,
          numRec.codigo,
          numRec.ordinal,
        ]
      )
    );
    await conn.execute(
      "INSERT INTO movimientos (fk_mov_codigopedido, tipo_movimiento, numero_movimiento, codigo_cliente, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        codigoPedido,
        numeroMovimiento,
        clienteId,
        baseId,
        packingId,
        dir.codigo,
        dir.ordinal,
        dirProv.codigo,
        dirProv.ordinal,
        numRec.codigo,
        numRec.ordinal,
      ]
    );

    let ordinalMov = 0;
    for (const row of invoiceLines) {
      ordinalMov += 1;
      const codigoProducto = requiredNumber(row?.idProducto, "idProducto");
      const cantidad = Number(row?.cantidad || 0);
      if (!(cantidad > 0)) continue;

      pushSqlLog(
        "INFO",
        formatSqlWithParams(
          "INSERT INTO movimiento_detalle (codigo_producto, cantidad, tipo_movimiento, numero_movimiento, ordinal) VALUES (?, ?, 'SALIDA', ?, ?);",
          [codigoProducto, cantidad, numeroMovimiento, ordinalMov]
        )
      );
      await conn.execute(
        "INSERT INTO movimiento_detalle (codigo_producto, cantidad, tipo_movimiento, numero_movimiento, ordinal) VALUES (?, ?, 'SALIDA', ?, ?)",
        [codigoProducto, cantidad, numeroMovimiento, ordinalMov]
      );
    }

    await callSp(conn, "salidasinventario", [tipoDocumento, numeroDocumento]);
    await callSp(conn, "salidaspedidos", [tipoDocumento, numeroDocumento]);

    const invoiceHtml = renderInvoiceHtml({ ...payload, ids: { codigoPedido, numeroDocumento, numeroMovimiento } });
    return { codigoPedido, numeroDocumento, numeroMovimiento, invoiceHtml };
  });
}

async function handlePedidoFacturaEmit(pool, payload) {
  return await withTx(pool, async (conn) => {
    const pedidoId = requiredNumber(payload?.pedido?.codigo_pedido, "codigo_pedido");
    const factura = payload?.factura ?? {};
    const fechaEmision = requiredDate(factura?.fecha_emision, "fecha_emision");
    const baseId = requiredNumber(factura?.codigo_base, "codigo_base");
    const tipoDocumento = "F";

    const entrega = payload?.entrega ?? {};
    const dir = parseCompositeKey(entrega?.codigo_cliente_direccion, "codigo_cliente_direccion");
    const dirProv = parseCompositeKey(entrega?.codigo_cliente_direccionprov, "codigo_cliente_direccionprov");
    const numRec = parseCompositeKey(entrega?.codigo_cliente_numrecibe, "codigo_cliente_numrecibe");

    const invoiceLines = Array.isArray(factura?.productos) ? factura.productos : [];
    if (invoiceLines.length === 0) {
      const err = new Error("factura_sin_productos");
      err.code = "factura_sin_productos";
      throw err;
    }

    const pedidoSql = "SELECT codigo_cliente, fecha FROM pedidos WHERE codigo_pedido = ? LIMIT 1";
    pushSqlLog("INFO", formatSqlWithParams(`${pedidoSql};`, [pedidoId]));
    const [pedidoRows] = await conn.query(pedidoSql, [pedidoId]);
    const pedidoRow = pedidoRows?.[0];
    if (!pedidoRow) {
      const err = new Error("pedido_not_found");
      err.code = "pedido_not_found";
      throw err;
    }
    const clienteId = requiredNumber(pedidoRow.codigo_cliente, "codigo_cliente");
    const pedidoFechaParts = splitDateTime(pedidoRow.fecha);

    const [[{ nextFactura }]] = await conn.query(
      "SELECT COALESCE(MAX(numero_documento), 0) + 1 AS nextFactura FROM mov_contable WHERE tipo_documento = ? FOR UPDATE",
      [tipoDocumento]
    );
    const numeroDocumento = Number(nextFactura);

    const montoTotal = invoiceLines.reduce((acc, r) => acc + Number(r?.monto || 0), 0);
    const fechaEmisionDt = `${fechaEmision} 00:00:00`;

    pushSqlLog(
      "INFO",
      formatSqlWithParams(
        "INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          pedidoId,
          fechaEmisionDt,
          fechaEmisionDt,
          fechaEmisionDt,
          clienteId,
          montoTotal,
          tipoDocumento,
          numeroDocumento,
          baseId,
          null,
          dir.codigo,
          dir.ordinal,
          dirProv.codigo,
          dirProv.ordinal,
          numRec.codigo,
          numRec.ordinal,
        ]
      )
    );
    await conn.execute(
      "INSERT INTO mov_contable (codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        pedidoId,
        fechaEmisionDt,
        fechaEmisionDt,
        fechaEmisionDt,
        clienteId,
        montoTotal,
        tipoDocumento,
        numeroDocumento,
        baseId,
        null,
        dir.codigo,
        dir.ordinal,
        dirProv.codigo,
        dirProv.ordinal,
        numRec.codigo,
        numRec.ordinal,
      ]
    );

    let ordinalFactura = 0;
    for (const row of invoiceLines) {
      ordinalFactura += 1;
      const codigoProducto = requiredNumber(row?.idProducto, "idProducto");
      const cantidad = Number(row?.cantidad || 0);
      const precioUnitario = Number(row?.precio || 0);
      const montoLinea = Number(row?.monto || 0);
      if (!(cantidad > 0)) {
        const err = new Error("cantidad_invalida");
        err.code = "cantidad_invalida";
        throw err;
      }
      pushSqlLog(
        "INFO",
        formatSqlWithParams(
          "INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?);",
          [
            tipoDocumento,
            numeroDocumento,
            ordinalFactura,
            codigoProducto,
            cantidad,
            precioUnitario,
            montoLinea,
          ]
        )
      );
      await conn.execute(
        "INSERT INTO mov_contable_detalle (tipo_documento, numero_documento, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          tipoDocumento,
          numeroDocumento,
          ordinalFactura,
          codigoProducto,
          cantidad,
          precioUnitario,
          montoLinea,
        ]
      );
    }

    await callSp(conn, "salidasinventario", [tipoDocumento, numeroDocumento]);
    await callSp(conn, "salidaspedidos", [tipoDocumento, numeroDocumento]);

    const invoicePayload = {
      ...payload,
      pedido: {
        ...(payload?.pedido ?? {}),
        clienteId,
        fecha: pedidoFechaParts.date,
        hora: pedidoFechaParts.time,
      },
      factura: {
        ...(payload?.factura ?? {}),
        codigo_packing: "",
      },
      ids: { codigoPedido: pedidoId, numeroDocumento },
    };
    const invoiceHtml = renderInvoiceHtml(invoicePayload);
    return { codigoPedido: pedidoId, numeroDocumento, invoiceHtml };
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/db-status") {
    try {
      const pool = await getPool();
      const conn = await pool.getConnection();
      try {
        await conn.ping();
      } finally {
        conn.release();
      }
      const cfg = await readErpConfig();
      return json(res, 200, { ok: true, database: cfg.database, host: cfg.host, port: cfg.port, user: cfg.user });
    } catch (e) {
      return json(res, 200, { ok: false, error: e?.code || e?.message || String(e) });
    }
  }

  if (url.pathname === "/api/clients") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_clientes");
      return json(
        res,
        200,
        rows.map((r) => ({ id: Number(r.codigo_cliente), name: String(r.nombre) }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/proveedores") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_proveedores");
      return json(
        res,
        200,
        rows.map((r) => ({ id: Number(r.codigo_provedor), name: String(r.nombre) }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/bases") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_bases");
      return json(
        res,
        200,
        rows.map((r) => ({ id: Number(r.codigo_base), name: String(r.nombre) }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/packings") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_packing");
      return json(
        res,
        200,
        rows.map((r) => ({ id: Number(r.codigo_packing), name: String(r.nombre) }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/pedidos/pendientes") {
    try {
      const filtroCliente = optionalNumber(url.searchParams.get("clienteId"));
      const filtroFecha = optionalString(url.searchParams.get("fecha"));
      if (filtroFecha && !/^\d{4}-\d{2}-\d{2}$/.test(filtroFecha)) {
        return badRequest(res, "invalid_fecha");
      }
      const pool = await getPool();
      const [pendientes, clientes] = await Promise.all([callSp(pool, "get_pedidospendientes"), callSp(pool, "get_clientes")]);
      const clientNameById = new Map(
        (Array.isArray(clientes) ? clientes : []).map((c) => [Number(c.codigo_cliente), String(c.nombre)])
      );
      const rows = (Array.isArray(pendientes) ? pendientes : [])
        .map((r) => {
          const codigo_pedido = Number(pickRowValue(r, ["codigo_pedido", "pedido", "codigoPedido"]));
          const codigo_cliente = Number(pickRowValue(r, ["codigo_cliente", "cliente", "codigoCliente"]));
          const fechaRaw = pickRowValue(r, ["fecha", "created_at", "fecha_pedido"]);
          const fecha = formatDateOnly(fechaRaw);
          return {
            codigo_pedido,
            codigo_cliente,
            nombre_cliente: clientNameById.get(codigo_cliente) || "",
            fecha,
          };
        })
        .filter((r) => Number.isFinite(r.codigo_pedido) && Number.isFinite(r.codigo_cliente));

      const filtered = rows.filter((r) => {
        if (filtroCliente !== null && r.codigo_cliente !== filtroCliente) return false;
        if (filtroFecha && r.fecha !== filtroFecha) return false;
        return true;
      });
      return json(res, 200, filtered);
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/cuentasbancarias") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_cuentasbancarias");
      return json(
        res,
        200,
        rows.map((r) => ({
          id: Number(r.codigo_cuentabancaria),
          name: `${r.codigo_cuentabancaria} · ${r.nombre} (${r.banco})`,
          banco: String(r.banco),
          nombre: String(r.nombre),
        }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname.startsWith("/api/documentos/")) {
    try {
      const numeroDocumento = parseIdFromPath(url.pathname, "/api/documentos");
      if (!numeroDocumento) return badRequest(res, "invalid_numero_documento");
      const tipoDocumento = optionalString(url.searchParams.get("tipo"));
      const pool = await getPool();
      const conn = await pool.getConnection();
      try {
        const movCols = await getTableColumns(conn, "mov_contable");
        const movMontoCol = resolveColumn(movCols, ["monto", "monto_total", "total"], "monto");
        const movTipoCol = findColumn(movCols, ["tipo_documento"]);
        const movDocCol = resolveColumn(movCols, ["numero_documento"], "numero_documento");

        const where = movTipoCol && tipoDocumento ? `\`${movTipoCol}\` = ? AND \`${movDocCol}\` = ?` : `\`${movDocCol}\` = ?`;
        const params = movTipoCol && tipoDocumento ? [tipoDocumento, numeroDocumento] : [numeroDocumento];
        const sql = `SELECT \`${movMontoCol}\` AS monto, ${movTipoCol ? `\`${movTipoCol}\` AS tipo_documento, ` : ""}\`${movDocCol}\` AS numero_documento FROM mov_contable WHERE ${where} LIMIT 1`;
        pushSqlLog("INFO", formatSqlWithParams(`${sql};`, params));
        const [rows] = await conn.query(sql, params);
        const row = rows?.[0];
        if (!row) return json(res, 404, { error: "not_found" });
        return json(res, 200, {
          numero_documento: Number(row.numero_documento),
          tipo_documento: movTipoCol ? String(row.tipo_documento || "") : null,
          monto: Number(row.monto),
        });
      } finally {
        conn.release();
      }
    } catch (e) {
      if (e?.code?.startsWith("missing_column_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/sql-logs") return json(res, 200, SQL_LOGS);

  if (url.pathname === "/api/viajes/registrar" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleViajesSave(pool, payload, { dispatch: false });
      return json(res, 200, out);
    } catch (e) {
      if (
        e?.code?.startsWith("invalid_") ||
        e?.code?.startsWith("missing_column_") ||
        e?.code?.includes("viaje_") ||
        e?.code === "mov_contable_not_found" ||
        e?.code === "missing_viaje_detalle_table"
      ) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "register_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/pagos/registrar" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handlePagosSave(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.startsWith("missing_column_") || e?.code?.includes("pago_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "register_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/notas-credito/emitir" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleNotaCreditoEmit(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.startsWith("missing_column_") || e?.code?.includes("nota_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "emit_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/remitos/crear" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleRemitoCrear(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("remito_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "create_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/ajustes/crear" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleAjusteCrear(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("ajuste_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "create_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/transferencias/crear" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleTransferenciaCrear(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("transferencia_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "create_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/fabricaciones/crear" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleFabricacionCrear(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("fabricacion_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "create_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/compras/facturar" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleComprasFacturar(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("compra_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "facturar_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/viajes/dispatch" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleViajesSave(pool, payload, { dispatch: true });
      return json(res, 200, out);
    } catch (e) {
      if (
        e?.code?.startsWith("invalid_") ||
        e?.code?.startsWith("missing_column_") ||
        e?.code?.includes("viaje_") ||
        e?.code === "mov_contable_not_found" ||
        e?.code === "missing_viaje_detalle_table"
      ) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "dispatch_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/products") {
    try {
      const pool = await getPool();
      const rows = await callSp(pool, "get_productos");
      return json(
        res,
        200,
        rows.map((r) => ({ id: Number(r.codigo_producto), name: String(r.nombre) }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/compras/next-num") {
    try {
      const tipoDocumento = String(url.searchParams.get("tipo") || "FC").trim().toUpperCase();
      if (tipoDocumento !== "FC") return badRequest(res, "invalid_tipo_documento_compra");
      const pool = await getPool();
      const sql =
        "SELECT COALESCE(MAX(`num_documento_compra`), 0) + 1 AS nextNum FROM mov_contable_compras WHERE `tipo_documento_compra` = ?";
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [tipoDocumento]));
      const [[{ nextNum }]] = await pool.query(sql, [tipoDocumento]);
      return json(res, 200, { next_num: Number(nextNum || 0) || 1, tipo_documento_compra: tipoDocumento });
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/remitos/next-num") {
    try {
      const tipoDocumento = String(url.searchParams.get("tipo") || "REM").trim().toUpperCase();
      if (tipoDocumento !== "REM") return badRequest(res, "invalid_tipo_documento_remito");
      const pool = await getPool();
      const sql =
        "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ?";
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [tipoDocumento]));
      const [[{ nextNum }]] = await pool.query(sql, [tipoDocumento]);
      return json(res, 200, { next_num: Number(nextNum || 0) || 1, tipo_documento: tipoDocumento });
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/ajustes/next-num") {
    try {
      const tipoDocumento = String(url.searchParams.get("tipo") || "AJU").trim().toUpperCase();
      if (tipoDocumento !== "AJU") return badRequest(res, "invalid_tipo_documento_ajuste");
      const pool = await getPool();
      const sql =
        "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ?";
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [tipoDocumento]));
      const [[{ nextNum }]] = await pool.query(sql, [tipoDocumento]);
      return json(res, 200, { next_num: Number(nextNum || 0) || 1, tipo_documento: tipoDocumento });
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/transferencias/next-num") {
    try {
      const tipoDocumento = String(url.searchParams.get("tipo") || "TRA").trim().toUpperCase();
      if (tipoDocumento !== "TRA") return badRequest(res, "invalid_tipo_documento_transferencia");
      const pool = await getPool();
      const sql =
        "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ?";
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [tipoDocumento]));
      const [[{ nextNum }]] = await pool.query(sql, [tipoDocumento]);
      return json(res, 200, { next_num: Number(nextNum || 0) || 1, tipo_documento: tipoDocumento });
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/fabricaciones/next-num") {
    try {
      const tipoDocumento = String(url.searchParams.get("tipo") || "FAB").trim().toUpperCase();
      if (tipoDocumento !== "FAB") return badRequest(res, "invalid_tipo_documento_fabricacion");
      const pool = await getPool();
      const sql =
        "SELECT COALESCE(MAX(`num_documento`), 0) + 1 AS nextNum FROM movimiento_stock WHERE `tipo_documento` = ?";
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [tipoDocumento]));
      const [[{ nextNum }]] = await pool.query(sql, [tipoDocumento]);
      return json(res, 200, { next_num: Number(nextNum || 0) || 1, tipo_documento: tipoDocumento });
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname.startsWith("/api/pedidos/") && url.pathname.endsWith("/detalle")) {
    try {
      const pedidoId = parseIdFromPath(url.pathname, "/api/pedidos");
      if (!pedidoId) return badRequest(res, "invalid_codigo_pedido");
      const pool = await getPool();
      const sql = `
        SELECT pd.codigo_producto, pd.cantidad, pd.precio_unitario, pd.saldo, p.nombre
        FROM pedido_detalle pd
        LEFT JOIN productos p ON p.codigo_producto = pd.codigo_producto
        WHERE pd.codigo_pedido = ?
        ORDER BY pd.ordinal
      `;
      pushSqlLog("INFO", formatSqlWithParams(`${sql};`, [pedidoId]));
      const [rows] = await pool.query(sql, [pedidoId]);
      return json(
        res,
        200,
        rows.map((r) => ({
          codigo_producto: Number(r.codigo_producto),
          cantidad: Number(r.cantidad),
          precio_unitario: Number(r.precio_unitario),
          saldo: r.saldo == null ? null : Number(r.saldo),
          nombre: String(r.nombre || ""),
        }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname.endsWith("/direcciones") && url.pathname.startsWith("/api/clients/")) {
    try {
      const clientId = parseIdFromPath(url.pathname, "/api/clients");
      if (!clientId) return badRequest(res, "invalid_clientId");
      const pool = await getPool();
      const rows = await callSp(pool, "get_direcciones", [clientId]);
      return json(
        res,
        200,
        rows.map((r) => ({
          id: `${r.codigo_cliente_direccion}|${r.ordinal_direccion}`,
          name: `${r.provincia} / ${r.localidad} / ${r.distrito} - ${r.direccion}`,
          codigo_cliente_direccion: Number(r.codigo_cliente_direccion),
          ordinal_direccion: Number(r.ordinal_direccion),
          provincia: String(r.provincia),
          localidad: String(r.localidad),
          distrito: String(r.distrito),
          direccion: String(r.direccion),
        }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname.endsWith("/direccionesprov") && url.pathname.startsWith("/api/clients/")) {
    try {
      const clientId = parseIdFromPath(url.pathname, "/api/clients");
      if (!clientId) return badRequest(res, "invalid_clientId");
      const pool = await getPool();
      const rows = await callSp(pool, "get_direccionesprov", [clientId]);
      return json(
        res,
        200,
        rows.map((r) => ({
          id: `${r.codigo_cliente_direccionprov}|${r.ordinal_direccionprov}`,
          name: `${r.nombre_completo} (${r.dni}) - ${r.lugar_envio}`,
          codigo_cliente_direccionprov: Number(r.codigo_cliente_direccionprov),
          ordinal_direccionprov: Number(r.ordinal_direccionprov),
          nombre_completo: String(r.nombre_completo),
          dni: String(r.dni),
          lugar_envio: String(r.lugar_envio),
        }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname.endsWith("/numrecibe") && url.pathname.startsWith("/api/clients/")) {
    try {
      const clientId = parseIdFromPath(url.pathname, "/api/clients");
      if (!clientId) return badRequest(res, "invalid_clientId");
      const pool = await getPool();
      const rows = await callSp(pool, "get_numrecibe", [clientId]);
      return json(
        res,
        200,
        rows.map((r) => ({
          id: `${r.codigo_cliente_numrecibe}|${r.ordinal_numrecibe}`,
          name: `${r.numero}${r.nombre ? ` - ${r.nombre}` : ""}`,
          codigo_cliente_numrecibe: Number(r.codigo_cliente_numrecibe),
          ordinal_numrecibe: Number(r.ordinal_numrecibe),
          numero: String(r.numero),
          nombre: r.nombre == null ? null : String(r.nombre),
        }))
      );
    } catch (e) {
      return serverError(res, "db_error", e?.code || e?.message);
    }
  }

  if (url.pathname === "/api/erp/emit" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handleErpEmit(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("stock_") || e?.code?.includes("pedido_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "emit_failed", e?.code || e?.message || String(e));
    }
  }

  if (url.pathname === "/api/pedidos/emitir" && req.method === "POST") {
    try {
      const pool = await getPool();
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}");
      const out = await handlePedidoFacturaEmit(pool, payload);
      return json(res, 200, out);
    } catch (e) {
      if (e?.code?.startsWith("invalid_") || e?.code?.includes("pedido_") || e?.code?.includes("factura_")) {
        return json(res, 400, { error: e.code, detail: e.detail });
      }
      return serverError(res, "emit_failed", e?.code || e?.message || String(e));
    }
  }

  if (await serveStatic(req, res)) return;
  return notFound(res);
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running: http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error(`Server error: ${err?.code || ""} ${err?.message || err}`);
  process.exitCode = 1;
});
