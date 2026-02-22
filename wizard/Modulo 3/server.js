const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 3',
  moduleCode: 'M3',
  cuDefs: [
    { id: 'CU3-001', dir: 'CU3-001' },
    { id: 'CU3-002', dir: 'CU3-002' },
    { id: 'CU3-003', dir: 'CU3-003' }
  ]
});
