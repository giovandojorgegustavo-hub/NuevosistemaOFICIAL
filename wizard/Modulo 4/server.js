const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 4',
  moduleCode: 'M4',
  cuDefs: [
    { id: 'CU4-001', dir: 'CU4-001' },
    { id: 'CU4-002', dir: 'CU4-002' },
    { id: 'CU4-003', dir: 'CU4-003' },
    { id: 'CU4-004', dir: 'CU4-004' }
  ]
});
