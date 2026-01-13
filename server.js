import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || "127.0.0.1";

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

    pushSqlLog(
      "INFO",
      formatSqlWithParams("INSERT INTO pedidos (id, codigo_pedido, fecha) VALUES (?, ?, ?);", [
        codigoPedido,
        codigoPedido,
        fechaPedido,
      ])
    );
    await conn.execute("INSERT INTO pedidos (id, codigo_pedido, fecha) VALUES (?, ?, ?)", [
      codigoPedido,
      codigoPedido,
      fechaPedido,
    ]);

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
          "INSERT INTO pedido_detalle (id, codigo_pedido, ordinal, codigo_producto, cantidad, precio_unitario, saldo) VALUES (?, ?, ?, ?, ?, ?, ?);",
          [ordinalPedido, codigoPedido, ordinalPedido, codigoProducto, cantidad, precioUnitario, saldo]
        )
      );
      await conn.execute(
        "INSERT INTO pedido_detalle (id, codigo_pedido, ordinal, codigo_producto, cantidad, precio_unitario, saldo) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [ordinalPedido, codigoPedido, ordinalPedido, codigoProducto, cantidad, precioUnitario, saldo]
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
        "INSERT INTO mov_contable (id, codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe, iddireccionprov) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          numeroDocumento,
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
          numeroDocumento,
        ]
      )
    );
    await conn.execute(
      "INSERT INTO mov_contable (id, codigo_pedido, fecha_emision, fecha_vencimiento, fecha_valor, codigo_cliente, monto, tipo_documento, numero_documento, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe, iddireccionprov) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        numeroDocumento,
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
        numeroDocumento,
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
          "INSERT INTO mov_contable_detalle (id, tipo_documento, numero_documento, idmov_contable, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
          [
            ordinalFactura,
            tipoDocumento,
            numeroDocumento,
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
        "INSERT INTO mov_contable_detalle (id, tipo_documento, numero_documento, idmov_contable, ordinal, codigo_producto, cantidad, precio_unitario, monto_linea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          ordinalFactura,
          tipoDocumento,
          numeroDocumento,
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
    const [[{ nextMovId }]] = await conn.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextMovId FROM movimientos FOR UPDATE");
    const movId = Number(nextMovId);
    pushSqlLog(
      "INFO",
      formatSqlWithParams(
        "INSERT INTO movimientos (id, fk_mov_codigopedido, tipo_movimiento, numero_movimiento, codigo_cliente, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          movId,
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
      "INSERT INTO movimientos (id, fk_mov_codigopedido, tipo_movimiento, numero_movimiento, codigo_cliente, codigo_base, codigo_packing, codigo_cliente_direccion, ordinal_direccion, codigo_cliente_direccionprov, ordinal_direccionprov, codigo_cliente_numrecibe, ordinal_numrecibe) VALUES (?, ?, 'SALIDA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        movId,
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
          "INSERT INTO movimiento_detalle (id, codigo_producto, cantidad, tipo_movimiento, numero_movimiento, ordinal) VALUES (?, ?, ?, 'SALIDA', ?, ?);",
          [ordinalMov, codigoProducto, cantidad, numeroMovimiento, ordinalMov]
        )
      );
      await conn.execute(
        "INSERT INTO movimiento_detalle (id, codigo_producto, cantidad, tipo_movimiento, numero_movimiento, ordinal) VALUES (?, ?, ?, 'SALIDA', ?, ?)",
        [ordinalMov, codigoProducto, cantidad, numeroMovimiento, ordinalMov]
      );

      pushSqlLog(
        "INFO",
        formatSqlWithParams(
          "UPDATE saldo_stock SET saldo_actual = GREATEST(0, saldo_actual - ?), fecha_saldoactual = NOW() WHERE codigo_base = ? AND codigo_producto = ?;",
          [cantidad, baseId, codigoProducto]
        )
      );
      await conn.execute(
        "UPDATE saldo_stock SET saldo_actual = GREATEST(0, saldo_actual - ?), fecha_saldoactual = NOW() WHERE codigo_base = ? AND codigo_producto = ?",
        [cantidad, baseId, codigoProducto]
      );
    }

    const invoiceHtml = renderInvoiceHtml({ ...payload, ids: { codigoPedido, numeroDocumento, numeroMovimiento } });
    return { codigoPedido, numeroDocumento, numeroMovimiento, invoiceHtml };
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

  if (url.pathname === "/api/sql-logs") return json(res, 200, SQL_LOGS);

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
