const fs = require("fs");
const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");

const ROOT_DIR = path.resolve(__dirname);
const LOG_DIR = path.join(ROOT_DIR, "logs");
const ERP_CONFIG = path.resolve(ROOT_DIR, "..", "..", "erp.yml");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function formatStamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function humanStamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function getLogFilePath() {
  ensureDir(LOG_DIR);
  const base = `CU-005-${formatStamp()}`;
  let suffix = 1;
  while (suffix < 1000) {
    const name = `${base}-${String(suffix).padStart(3, "0")}.log`;
    const full = path.join(LOG_DIR, name);
    if (!fs.existsSync(full)) return full;
    suffix += 1;
  }
  return path.join(LOG_DIR, `${base}-999.log`);
}

const logFile = getLogFilePath();
const logBuffer = [];

function logLine(level, message) {
  const ts = humanStamp();
  const line = `[${ts}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`);
  logBuffer.push({ ts, level, message });
  if (logBuffer.length > 500) logBuffer.shift();
}

function parseErpConfig() {
  const content = fs.readFileSync(ERP_CONFIG, "utf8");
  const nameMatch = content.match(/name:\s*"?([^"\n]+)"?/i);
  const dsnMatch = content.match(/dsn:\s*"?([^"\n]+)"?/i);
  if (!nameMatch || !dsnMatch) {
    throw new Error("No se pudo leer erp.yml");
  }
  return { name: nameMatch[1].trim(), dsn: dsnMatch[1].trim() };
}

function parseMysqlDsn(dsn) {
  const match = dsn.match(/^mysql:\/\/([^:]+):([^@]+)@tcp\(([^:]+):(\d+)\)\/(.+)$/i);
  if (!match) throw new Error("DSN invalido");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: Number(match[4]),
    database: match[5],
  };
}

const { name: dbName, dsn } = parseErpConfig();
const dsnParsed = parseMysqlDsn(dsn);
const pool = mysql.createPool({
  host: dsnParsed.host,
  port: dsnParsed.port,
  user: dsnParsed.user,
  password: dsnParsed.password,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
});

async function execQuery(sql, params = []) {
  logLine("SQL", `SQL: ${sql} | params: ${JSON.stringify(params)}`);
  return pool.query(sql, params);
}

async function execConn(conn, sql, params = []) {
  logLine("SQL", `SQL: ${sql} | params: ${JSON.stringify(params)}`);
  return conn.query(sql, params);
}

function unwrapRows(rows) {
  if (!Array.isArray(rows)) return [];
  if (Array.isArray(rows[0])) return rows[0];
  return rows;
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  logLine("INFO", `Endpoint ${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.static(ROOT_DIR));

app.get("/api/db-status", async (req, res) => {
  try {
    await execQuery("SELECT 1");
    res.json({ ok: true, database: dbName });
  } catch (err) {
    logLine("ERROR", err.stack || err.message);
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

app.get("/api/paquetes/standby", async (req, res) => {
  try {
    const [rows] = await execQuery("CALL get_paquetes_por_estado(?)", ["standby"]);
    res.json(unwrapRows(rows));
  } catch (err) {
    logLine("ERROR", err.stack || err.message);
    res.status(500).json({ error: "error_paquetes" });
  }
});

app.get("/api/paquetes/:codigo/detalle", async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const [detalleRows] = await execQuery("CALL get_mov_contable_detalle(?, ?)", ["FAC", codigo]);
    const [viajeRows] = await execQuery("CALL get_viaje_por_documento(?)", [codigo]);
    const [ordinalRows] = await execQuery(
      "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [codigo]
    );
    const ordinal = unwrapRows(ordinalRows)[0]?.next ?? 1;
    res.json({
      detalle: unwrapRows(detalleRows),
      viaje: unwrapRows(viajeRows)[0] ?? {},
      ordinal,
    });
  } catch (err) {
    logLine("ERROR", err.stack || err.message);
    res.status(500).json({ error: "error_detalle" });
  }
});

app.post("/api/paquetes/:codigo/confirmar", async (req, res) => {
  const codigo = req.params.codigo;
  const estado = String(req.body?.estado || "");
  if (!/^(robado|devuelto|empacado|llegado)$/.test(estado)) {
    return res.status(400).json({ ok: false, error: "estado_invalido" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await execConn(conn, "CALL cambiar_estado_paquete(?, ?)", [codigo, estado]);

    const [ordinalRows] = await execConn(
      conn,
      "SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = ? AND tipo_documento = 'FAC'",
      [codigo]
    );
    const ordinal = unwrapRows(ordinalRows)[0]?.next ?? 1;

    await execConn(
      conn,
      "INSERT INTO paquetedetalle (codigo_paquete, ordinal, estado, tipo_documento) VALUES (?, ?, ?, 'FAC')",
      [codigo, ordinal, estado]
    );

    await execConn(conn, "INSERT INTO detalleviaje (codigo_paquete, fecha_fin) VALUES (?, NOW())", [codigo]);

    await conn.commit();
    res.json({ ok: true, ordinal });
  } catch (err) {
    await conn.rollback();
    logLine("ERROR", err.stack || err.message);
    res.status(500).json({ ok: false, error: "error_guardar" });
  } finally {
    conn.release();
  }
});

app.get("/api/sql-logs", (req, res) => {
  res.json(logBuffer.slice(-200));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  logLine("INFO", `Servidor CU-005 iniciado en puerto ${PORT}`);
});
