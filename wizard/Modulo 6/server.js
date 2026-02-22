const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 6',
  moduleCode: 'M6',
  cuDefs: [{ id: 'CU6-001', dir: 'CU6-001' }]
});
