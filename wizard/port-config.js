const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const ROOT_DIR = path.resolve(__dirname, '..');
const ERP_CONFIG_PATH = path.join(ROOT_DIR, 'erp.yml');

function asPort(value, keyName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Puerto invalido para ${keyName}`);
  }
  return parsed;
}

function loadErpConfig() {
  const raw = fs.readFileSync(ERP_CONFIG_PATH, 'utf8');
  return yaml.parse(raw) || {};
}

function getPorts(config = loadErpConfig()) {
  if (!config.ports || typeof config.ports !== 'object') {
    throw new Error('erp.yml no contiene el bloque ports');
  }
  return config.ports;
}

function getLauncherPort(config = loadErpConfig()) {
  const ports = getPorts(config);
  return asPort(ports.launcher, 'ports.launcher');
}

function getModulePort(moduleCode, config = loadErpConfig()) {
  const key = String(moduleCode || '').trim().toUpperCase();
  const ports = getPorts(config);
  if (!ports.modules || typeof ports.modules !== 'object') {
    throw new Error('erp.yml no contiene ports.modules');
  }
  if (!(key in ports.modules)) {
    throw new Error(`erp.yml no contiene ports.modules.${key}`);
  }
  return asPort(ports.modules[key], `ports.modules.${key}`);
}

function getServicePort(serviceName, config = loadErpConfig()) {
  const key = String(serviceName || '').trim().toLowerCase();
  const ports = getPorts(config);
  if (!ports.services || typeof ports.services !== 'object') {
    throw new Error('erp.yml no contiene ports.services');
  }
  if (!(key in ports.services)) {
    throw new Error(`erp.yml no contiene ports.services.${key}`);
  }
  return asPort(ports.services[key], `ports.services.${key}`);
}

function getUseCasePort(cuId, config = loadErpConfig()) {
  const key = String(cuId || '').trim().toUpperCase();
  const ports = getPorts(config);
  if (!ports.usecases || typeof ports.usecases !== 'object') {
    throw new Error('erp.yml no contiene ports.usecases');
  }
  if (!(key in ports.usecases)) {
    throw new Error(`erp.yml no contiene ports.usecases.${key}`);
  }
  return asPort(ports.usecases[key], `ports.usecases.${key}`);
}

module.exports = {
  loadErpConfig,
  getLauncherPort,
  getModulePort,
  getServicePort,
  getUseCasePort
};
