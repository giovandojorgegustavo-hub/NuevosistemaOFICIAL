const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 4',
  moduleCode: 'M4',
  portKeys: ['bk_modulo4_port', 'bk_contabilidad_port'],
  defaultPort: 4003,
  cuDefs: [
    { id: 'CU4-001', dir: 'CU4-001', internalPort: 3017 },
    { id: 'CU4-002', dir: 'CU4-002', internalPort: 3018 },
    { id: 'CU4-003', dir: 'CU4-003', internalPort: 3019 },
    { id: 'CU4-004', dir: 'CU4-004', internalPort: 3020 }
  ]
});
