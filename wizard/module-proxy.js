const express = require('express');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { loadErpConfig, getModulePort, getUseCasePort } = require('./port-config');

function writeLine(stream, line) {
  stream.write(`[${new Date().toISOString()}] ${line}\n`);
}

function discoverCuDefs(moduleDir) {
  const entries = fs.readdirSync(moduleDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^CU\d+-\d{3}$/i.test(name))
    .filter((name) => fs.existsSync(path.join(moduleDir, name, 'server.js')))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: name.toUpperCase(), dir: name }));
}

function fallbackUseCasePort(cuId) {
  const raw = String(cuId || '').trim().toUpperCase();
  const dashed = raw.match(/^CU(\d+)-(\d{3})$/);
  if (dashed) {
    const moduleNum = Number(dashed[1]);
    const sequence = Number(dashed[2]);
    if (Number.isFinite(moduleNum) && Number.isFinite(sequence)) {
      return 3000 + moduleNum * 100 + sequence;
    }
  }

  const compact = raw.match(/^CU(\d)(\d{3})$/);
  if (compact) {
    const moduleNum = Number(compact[1]);
    const sequence = Number(compact[2]);
    if (Number.isFinite(moduleNum) && Number.isFinite(sequence)) {
      return 3000 + moduleNum * 100 + sequence;
    }
  }

  let hash = 0;
  for (const ch of raw) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return 45000 + (hash % 10000);
}

function resolveUseCasePort(cuId, config) {
  try {
    return getUseCasePort(cuId, config);
  } catch (error) {
    const fallbackPort = fallbackUseCasePort(cuId);
    console.warn(
      `[${new Date().toISOString()}] [${String(cuId || '').toUpperCase()}] puerto interno no definido en erp.yml; usando fallback ${fallbackPort}`
    );
    return fallbackPort;
  }
}

function startCuServices(moduleDir, moduleCode, cuDefs, config) {
  const logsDir = path.join(moduleDir, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const cuMap = {};
  cuDefs.forEach((cu) => {
    const cuDir = path.join(moduleDir, cu.dir);
    const cuServer = path.join(cuDir, 'server.js');
    if (!fs.existsSync(cuServer)) {
      throw new Error(`No existe ${cuServer}`);
    }
    const cuLogsDir =
      moduleCode === 'M2' && String(cu.id).toUpperCase() === 'CU2-004' ? path.join(cuDir, 'logs') : logsDir;
    if (!fs.existsSync(cuLogsDir)) fs.mkdirSync(cuLogsDir, { recursive: true });

    cuMap[cu.id.toUpperCase()] = {
      id: cu.id.toUpperCase(),
      rawId: cu.id,
      internalPort: resolveUseCasePort(cu.id, config),
      cuDir,
      logsDir: cuLogsDir,
      moduleCode,
      child: null,
      out: null,
      startPromise: null
    };
  });

  return { cuMap };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let settled = false;

    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(600, () => done(false));
  });
}

async function waitForPort(port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(port)) return;
    await sleep(120);
  }
  throw new Error(`Timeout esperando puerto ${port}`);
}

function isAlive(child) {
  return Boolean(child) && !child.killed && child.exitCode === null;
}

function normalizeCuId(value) {
  const text = String(value || '').trim().toUpperCase();
  return text || null;
}

function getCuIdFromReferer(referer) {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const [firstSegment] = url.pathname.split('/').filter(Boolean);
    return normalizeCuId(firstSegment);
  } catch {
    return null;
  }
}

function resolveCuFromRequest(req, cuMap) {
  const fromQuery = normalizeCuId(req.query?.cuId || req.query?.usecase || req.query?.cu);
  if (fromQuery && cuMap[fromQuery]) return cuMap[fromQuery];

  const fromHeader = normalizeCuId(req.headers['x-cu-id']);
  if (fromHeader && cuMap[fromHeader]) return cuMap[fromHeader];

  const fromReferer = getCuIdFromReferer(req.headers.referer);
  if (fromReferer && cuMap[fromReferer]) return cuMap[fromReferer];

  return null;
}

async function ensureCuStarted(cu) {
  if (isAlive(cu.child)) return;
  // Si el puerto ya responde, probablemente hay una instancia previa/orfana
  // atendiendo este CU. Evitamos levantar un segundo proceso en el mismo puerto.
  if (await canConnect(cu.internalPort)) return;
  if (cu.startPromise) {
    await cu.startPromise;
    return;
  }

  cu.startPromise = (async () => {
    const outPath = path.join(cu.logsDir, `${cu.moduleCode}-${cu.rawId}.log`);
    const out = fs.createWriteStream(outPath, { flags: 'a' });
    out.on('error', (error) => {
      console.error(
        `[${new Date().toISOString()}] [${cu.rawId}] LOG_STREAM_ERROR ${error && error.message ? error.message : error}`
      );
    });
    cu.out = out;
    writeLine(out, `[${cu.rawId}] START requested on port ${cu.internalPort}`);

    const child = spawn(process.execPath, ['server.js'], {
      cwd: cu.cuDir,
      env: { ...process.env, PORT: String(cu.internalPort) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    cu.child = child;

    child.stdout.on('data', (chunk) => writeLine(out, `[${cu.rawId}] ${String(chunk).trimEnd()}`));
    child.stderr.on('data', (chunk) => writeLine(out, `[${cu.rawId}] ERROR ${String(chunk).trimEnd()}`));
    child.on('exit', (code, signal) => {
      writeLine(out, `[${cu.rawId}] EXIT code=${code} signal=${signal || 'none'}`);
      cu.child = null;
      cu.out = null;
      out.end();
    });

    await waitForPort(cu.internalPort, 12000);
    writeLine(out, `[${cu.rawId}] READY port=${cu.internalPort}`);
  })()
    .finally(() => {
      cu.startPromise = null;
    });

  await cu.startPromise;
}

function proxyRequest(req, res, targetPort, targetPath) {
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers
  };

  const upstream = http.request(options, (upstreamRes) => {
    res.status(upstreamRes.statusCode || 502);
    Object.entries(upstreamRes.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    });
    upstreamRes.pipe(res);
  });

  upstream.on('error', (error) => {
    res.status(502).json({
      ok: false,
      error: 'UPSTREAM_UNAVAILABLE',
      detail: error.message
    });
  });

  req.pipe(upstream);
}

function startModuleServer({
  moduleName,
  moduleCode,
  cuDefs,
  configureApp
}) {
  const moduleDir = __dirname && moduleName ? path.join(__dirname, moduleName) : process.cwd();
  const rootDir = path.resolve(moduleDir, '..');
  const config = loadErpConfig();
  const port = getModulePort(moduleCode, config);
  const resolvedCuDefs = Array.isArray(cuDefs) && cuDefs.length ? cuDefs : discoverCuDefs(moduleDir);
  if (!resolvedCuDefs.length) {
    throw new Error(`No se encontraron CUs con server.js en ${moduleDir}`);
  }

  const { cuMap } = startCuServices(moduleDir, moduleCode, resolvedCuDefs, config);
  const app = express();
  const context = {
    app,
    moduleName,
    moduleCode,
    port,
    moduleDir,
    rootDir,
    config,
    cuMap
  };

  if (typeof configureApp === 'function') {
    configureApp(context);
  }

  app.get('/api/health', (req, res) => {
    const running = Object.values(cuMap)
      .filter((cu) => isAlive(cu.child))
      .map((cu) => cu.id);
    res.json({
      ok: true,
      module: moduleName,
      port,
      usecases: Object.keys(cuMap),
      runningUsecases: running
    });
  });

  app.get('/', (req, res) => {
    res.json({
      ok: true,
      module: moduleName,
      hint: 'Use /<CU-ID> e.g. /CU1-001',
      usecases: Object.keys(cuMap)
    });
  });

  // Compatibilidad: varios CU antiguos consumen APIs con '/api/...' absoluto.
  // Usamos Referer/X-CU-ID para enrutar la API al CU correcto.
  app.use('/api', async (req, res, next) => {
    if (req.path === '/health') return next();

    const target = resolveCuFromRequest(req, cuMap);
    if (!target) {
      return res.status(400).json({
        ok: false,
        error: 'USECASE_CONTEXT_REQUIRED',
        detail: 'No se pudo resolver el CU para /api. Use ruta relativa ./api o header x-cu-id.'
      });
    }

    try {
      await ensureCuStarted(target);
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'USECASE_START_FAILED',
        cuId: target.id,
        detail: error.message
      });
    }

    return proxyRequest(req, res, target.internalPort, `/api${req.url || ''}`);
  });

  // Garantiza base URL con slash final para que assets relativos (styles.css, app.js) resuelvan bien.
  app.get('/:cuId', (req, res, next) => {
    const cuId = String(req.params.cuId || '').toUpperCase();
    if (!cuMap[cuId]) return next();

    const expectedPath = `/${req.params.cuId}`;
    if (req.path !== expectedPath) return next();

    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    return res.redirect(302, `${expectedPath}/${query}`);
  });

  app.use('/:cuId', async (req, res) => {
    const cuId = String(req.params.cuId || '').toUpperCase();
    const target = cuMap[cuId];
    if (!target) {
      return res.status(404).json({ ok: false, error: 'USECASE_NOT_FOUND', cuId });
    }

    try {
      await ensureCuStarted(target);
    } catch (error) {
      return res.status(502).json({
        ok: false,
        error: 'USECASE_START_FAILED',
        cuId,
        detail: error.message
      });
    }

    const targetPath = req.url && req.url.length ? req.url : '/';
    return proxyRequest(req, res, target.internalPort, targetPath);
  });

  const server = app.listen(port, () => {
    console.log(`${moduleCode} escuchando en puerto ${port}`);
  });

  const shutdown = () => {
    Object.values(cuMap).forEach((cu) => {
      if (isAlive(cu.child)) cu.child.kill('SIGTERM');
    });
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { startModuleServer };
