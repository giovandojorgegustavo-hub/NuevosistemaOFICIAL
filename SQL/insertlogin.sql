USE erpdb;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Perfiles
INSERT INTO perfiles (codigo_perfil, descripcion)
VALUES
  ('Administrador', 'Administrador'),
  ('AdminOp', 'Administrador Operativo'),
  ('Base', 'Base'),
  ('Ventas', 'Ventas');

-- Usuarios base
INSERT INTO usuarios (codigo_usuario, nombre, numero, password)
VALUES
  ('cusco', 'CUSCO', 1, '1111'),
  ('coffee', 'COFFEE', 2, '1111'),
  ('thunder', 'THUNDER', 3, '1111'),
  ('amsterdan', 'AMSTERDAN', 4, '1111'),
  ('tot', 'TOT', 5, '1111'),
  ('leviatan', 'LEVIATAN', 6, '1111'),
  ('fiax', 'FIAX', 7, '1111'),
  ('cielo', 'CIELO', 8, '1111'),
  ('perropeluche', 'PERROPELUCHE', 9, '1111');

-- Usuarios -> perfiles
INSERT INTO usuarios_perfiles (codigo_usuario, codigo_perfil)
VALUES
  ('cusco', 'AdminOp'),
  ('coffee', 'Base'),
  ('thunder', 'Base'),
  ('amsterdan', 'Base'),
  ('tot', 'Base'),
  ('leviatan', 'Base'),
  ('fiax', 'Administrador'),
  ('cielo', 'AdminOp'),
  ('perropeluche', 'AdminOp');

-- Casos de uso (wizard) con URL por modulo (1 puerto por modulo)
INSERT INTO usecases (codigo_usecase, caption, linktolaunch)
VALUES
  ('CU001',  'Pedidos',                     'http://167.99.173.100:4000/CU1-001'),
  ('CU002',  'Reasignar Base',              'http://167.99.173.100:4000/CU1-002'),
  ('CU003',  'Gestionar Paquetes en Camino','http://167.99.173.100:4000/CU1-003'),
  ('CU004',  'Gestionar Paquetes en Standby','http://167.99.173.100:4000/CU1-004'),
  ('CU005',  'Gestion Pedido',              'http://167.99.173.100:4000/CU1-005'),
  ('CU006',  'Crear Recibos',               'http://167.99.173.100:4000/CU1-006'),
  ('CU007',  'Nota Credito Pedido',         'http://167.99.173.100:4000/CU1-007'),
  ('CU008',  'Anular Facturas',             'http://167.99.173.100:4000/CU1-008'),
  ('CU009',  'Anular Pedidos',              'http://167.99.173.100:4000/CU1-009'),
  ('CU2001', 'Abrir Horario',               'http://167.99.173.100:4001/CU2-001'),
  ('CU2002', 'Empacar',                     'http://167.99.173.100:4001/CU2-002'),
  ('CU2003', 'Viaje',                       'http://167.99.173.100:4001/CU2-003'),
  ('CU2004', 'Packing por Base',            'http://167.99.173.100:4001/CU2-004'),
  ('CU2005', 'Stock por Base',              '/CU2-005'),
  ('CU2006', 'Historial Movimientos Stock', 'http://167.99.173.100:4001/CU2-006'),
  ('CU2007', 'Asistencia por Base',         'http://167.99.173.100:4001/CU2-007'),
  ('CU3001', 'Compras Factura',             'http://167.99.173.100:4002/CU3-001'),
  ('CU3002', 'Recibo Provedor',             'http://167.99.173.100:4002/CU3-002'),
  ('CU3003', 'Nota Credito Provedor',       'http://167.99.173.100:4002/CU3-003'),
  ('CU3004', 'Borrar FCC',                  'http://167.99.173.100:4002/CU3-004'),
  ('CU4001', 'Transferencias',              'http://167.99.173.100:4003/CU4-001'),
  ('CU4002', 'Ajuste Stock',                'http://167.99.173.100:4003/CU4-002'),
  ('CU4003', 'Gestion Compras',             'http://167.99.173.100:4003/CU4-003'),
  ('CU4004', 'Fabricacion',                 'http://167.99.173.100:4003/CU4-004'),
  ('CU6001', 'Cambiar Contrasena',          'http://167.99.173.100:4005/CU6-001'),
  ('CU6002', 'Tickets Soporte',             'http://167.99.173.100:4005/CU6-002'),
  ('CU7001', 'Consola Paquetes',            'http://167.99.173.100:4004/CU7-001');

-- Modulos
INSERT INTO modulos (codigo_modulo, descripcion, caption)
VALUES
  ('BASE',        'Base',        'Base'),
  ('BANCOS',      'Bancos',      'Bancos'),
  ('VENTAS',      'Ventas',      'Ventas'),
  ('COMPRAS',     'Compras',     'Compras'),
  ('OPERACIONES', 'Operaciones', 'Operaciones'),
  ('SEGURIDAD',   'Seguridad',   'Seguridad'),
  ('M7',          'Modulo 7',    'Modulo 7');

-- Vinculo modulo <-> usecases
INSERT INTO modulo_usecases (codigo_modulo, codigo_usecase)
VALUES
  -- VENTAS (Modulo 1)
  ('VENTAS', 'CU001'),
  ('VENTAS', 'CU002'),
  ('VENTAS', 'CU003'),
  ('VENTAS', 'CU004'),
  ('VENTAS', 'CU005'),
  ('VENTAS', 'CU006'),
  ('VENTAS', 'CU007'),
  ('VENTAS', 'CU008'),
  ('VENTAS', 'CU009'),

  -- BASE (Modulo 2)
  ('BASE', 'CU2001'),
  ('BASE', 'CU2002'),
  ('BASE', 'CU2003'),
  ('BASE', 'CU2004'),
  ('BASE', 'CU2005'),
  ('BASE', 'CU2006'),
  ('BASE', 'CU2007'),

  -- COMPRAS (Modulo 3)
  ('COMPRAS', 'CU3001'),
  ('COMPRAS', 'CU3002'),
  ('COMPRAS', 'CU3003'),
  ('COMPRAS', 'CU3004'),

  -- OPERACIONES (Modulo 4)
  ('OPERACIONES', 'CU4001'),
  ('OPERACIONES', 'CU4002'),
  ('OPERACIONES', 'CU4003'),
  ('OPERACIONES', 'CU4004'),

  -- SEGURIDAD (Modulo 6)
  ('SEGURIDAD', 'CU6001'),
  ('SEGURIDAD', 'CU6002'),

  -- MODULO 7
  ('M7', 'CU7001');

-- Perfil Base -> usecases del modulo Base + Seguridad (M6) + Modulo 7
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  ('Base', 'CU2001'),
  ('Base', 'CU2003'),
  ('Base', 'CU2004'),
  ('Base', 'CU2005'),
  ('Base', 'CU2006'),
  ('Base', 'CU2007'),
  ('Base', 'CU6001'),
  ('Base', 'CU6002'),
  ('Base', 'CU7001');

-- Perfil Ventas -> Ventas + Base + solo Stock/Historial de Operaciones
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  -- Ventas (Modulo 1)
  ('Ventas', 'CU001'),
  ('Ventas', 'CU002'),
  ('Ventas', 'CU005'),
  ('Ventas', 'CU006'),
  ('Ventas', 'CU007'),
  ('Ventas', 'CU008'),
  ('Ventas', 'CU009'),

  -- Base (Modulo 2)
  ('Ventas', 'CU2001'),
  ('Ventas', 'CU2003'),
  ('Ventas', 'CU2004'),
  ('Ventas', 'CU2005'),
  ('Ventas', 'CU2006'),
  ('Ventas', 'CU2007'),

  -- Operaciones (subset)
  ('Ventas', 'CU4001'),
  ('Ventas', 'CU4002');

-- Perfil Administrador -> todos los usecases
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  ('Administrador', 'CU001'),
  ('Administrador', 'CU002'),
  ('Administrador', 'CU003'),
  ('Administrador', 'CU004'),
  ('Administrador', 'CU005'),
  ('Administrador', 'CU006'),
  ('Administrador', 'CU007'),
  ('Administrador', 'CU008'),
  ('Administrador', 'CU009'),
  ('Administrador', 'CU2001'),
  ('Administrador', 'CU2002'),
  ('Administrador', 'CU2003'),
  ('Administrador', 'CU2004'),
  ('Administrador', 'CU2005'),
  ('Administrador', 'CU2006'),
  ('Administrador', 'CU2007'),
  ('Administrador', 'CU3001'),
  ('Administrador', 'CU3002'),
  ('Administrador', 'CU3003'),
  ('Administrador', 'CU3004'),
  ('Administrador', 'CU4001'),
  ('Administrador', 'CU4002'),
  ('Administrador', 'CU4003'),
  ('Administrador', 'CU4004'),
  ('Administrador', 'CU6001'),
  ('Administrador', 'CU6002'),
  ('Administrador', 'CU7001');

-- Perfil AdminOp -> todos los usecases excepto Compras (Modulo 3)
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  ('AdminOp', 'CU001'),
  ('AdminOp', 'CU002'),
  ('AdminOp', 'CU003'),
  ('AdminOp', 'CU004'),
  ('AdminOp', 'CU005'),
  ('AdminOp', 'CU006'),
  ('AdminOp', 'CU007'),
  ('AdminOp', 'CU008'),
  ('AdminOp', 'CU009'),
  ('AdminOp', 'CU2001'),
  ('AdminOp', 'CU2002'),
  ('AdminOp', 'CU2003'),
  ('AdminOp', 'CU2004'),
  ('AdminOp', 'CU2005'),
  ('AdminOp', 'CU2006'),
  ('AdminOp', 'CU2007'),
  ('AdminOp', 'CU4001'),
  ('AdminOp', 'CU4002'),
  ('AdminOp', 'CU4003'),
  ('AdminOp', 'CU4004'),
  ('AdminOp', 'CU6001'),
  ('AdminOp', 'CU6002'),
  ('AdminOp', 'CU7001');
