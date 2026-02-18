const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 3',
  moduleCode: 'M3',
  portKeys: ['bk_modulo3_port', 'bk_compras_port'],
  defaultPort: 4002,
  cuDefs: [
    { id: 'CU3-001', dir: 'CU3-001', internalPort: 3013 },
    { id: 'CU3-002', dir: 'CU3-002', internalPort: 3014 },
    { id: 'CU3-003', dir: 'CU3-003', internalPort: 3015 }
  ]
});
