const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 1',
  moduleCode: 'M1',
  portKeys: ['bk_modulo1_port', 'bk_ventas_port'],
  defaultPort: 4000,
  cuDefs: [
    { id: 'CU1-001', dir: 'CU1-001', internalPort: 3001 },
    { id: 'CU1-002', dir: 'CU1-002', internalPort: 3002 },
    { id: 'CU1-003', dir: 'CU1-003', internalPort: 3003 },
    { id: 'CU1-004', dir: 'CU1-004', internalPort: 3004 },
    { id: 'CU1-005', dir: 'CU1-005', internalPort: 3005 },
    { id: 'CU1-006', dir: 'CU1-006', internalPort: 3006 },
    { id: 'CU1-007', dir: 'CU1-007', internalPort: 3007 },
    { id: 'CU1-008', dir: 'CU1-008', internalPort: 3008 }
  ]
});
