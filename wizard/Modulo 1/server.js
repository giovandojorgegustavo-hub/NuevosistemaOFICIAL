const { startModuleServer } = require('../module-proxy');

startModuleServer({
  moduleName: 'Modulo 1',
  moduleCode: 'M1',
  cuDefs: [
    { id: 'CU1-001', dir: 'CU1-001' },
    { id: 'CU1-002', dir: 'CU1-002' },
    { id: 'CU1-003', dir: 'CU1-003' },
    { id: 'CU1-004', dir: 'CU1-004' },
    { id: 'CU1-005', dir: 'CU1-005' },
    { id: 'CU1-006', dir: 'CU1-006' },
    { id: 'CU1-007', dir: 'CU1-007' },
    { id: 'CU1-008', dir: 'CU1-008' },
    { id: 'CU1-009', dir: 'CU1-009' }
  ]
});
