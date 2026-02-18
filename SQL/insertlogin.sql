USE erpdb;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Perfiles
INSERT INTO perfiles (codigo_perfil, descripcion)
VALUES
  ('Administrador', 'Administrador'),
  ('Base', 'Base'),
  ('Ventas', 'Ventas');

-- Usuario base (codigo 1, password 1111)
INSERT INTO usuarios (codigo_usuario, nombre, numero, password)
VALUES ('1', 'Administrador', 1, '1111');

-- Usuario 1 -> perfil Administrador
INSERT INTO usuarios_perfiles (codigo_usuario, codigo_perfil)
VALUES ('1', 'Administrador');

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
  ('CU2001', 'Abrir Horario',               'http://167.99.173.100:4001/CU2-001'),
  ('CU2002', 'Empacar',                     'http://167.99.173.100:4001/CU2-002'),
  ('CU2003', 'Viaje',                       'http://167.99.173.100:4001/CU2-003'),
  ('CU2004', 'Packing por Base',            'http://167.99.173.100:4001/CU2-004'),
  ('CU2006', 'Historial Movimientos Stock', 'http://167.99.173.100:4001/CU2-006'),
  ('CU3001', 'Compras Factura',             'http://167.99.173.100:4002/CU3-001'),
  ('CU3002', 'Recibo Provedor',             'http://167.99.173.100:4002/CU3-002'),
  ('CU3003', 'Nota Credito Provedor',       'http://167.99.173.100:4002/CU3-003'),
  ('CU4001', 'Transferencias',              'http://167.99.173.100:4003/CU4-001'),
  ('CU4002', 'Ajuste Stock',                'http://167.99.173.100:4003/CU4-002'),
  ('CU4003', 'Gestion Compras',             'http://167.99.173.100:4003/CU4-003'),
  ('CU4004', 'Fabricacion',                 'http://167.99.173.100:4003/CU4-004');

-- Modulos
INSERT INTO modulos (codigo_modulo, descripcion, caption)
VALUES
  ('BASE',        'Base',        'Base'),
  ('VENTAS',      'Ventas',      'Ventas'),
  ('COMPRAS',     'Compras',     'Compras'),
  ('OPERACIONES', 'Operaciones', 'Operaciones');

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

  -- BASE (Modulo 2)
  ('BASE', 'CU2001'),
  ('BASE', 'CU2002'),
  ('BASE', 'CU2003'),
  ('BASE', 'CU2004'),
  ('BASE', 'CU2006'),

  -- COMPRAS (Modulo 3)
  ('COMPRAS', 'CU3001'),
  ('COMPRAS', 'CU3002'),
  ('COMPRAS', 'CU3003'),

  -- OPERACIONES (Modulo 4)
  ('OPERACIONES', 'CU4001'),
  ('OPERACIONES', 'CU4002'),
  ('OPERACIONES', 'CU4003'),
  ('OPERACIONES', 'CU4004');

-- Perfil Base -> usecases del modulo Base
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  ('Base', 'CU2001'),
  ('Base', 'CU2002'),
  ('Base', 'CU2003'),
  ('Base', 'CU2004'),
  ('Base', 'CU2006');

-- Perfil Ventas -> Ventas + Base + solo Stock/Historial de Operaciones
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  -- Ventas (Modulo 1)
  ('Ventas', 'CU001'),
  ('Ventas', 'CU002'),
  ('Ventas', 'CU003'),
  ('Ventas', 'CU004'),
  ('Ventas', 'CU005'),
  ('Ventas', 'CU006'),
  ('Ventas', 'CU007'),
  ('Ventas', 'CU008'),

  -- Base (Modulo 2)
  ('Ventas', 'CU2001'),
  ('Ventas', 'CU2002'),
  ('Ventas', 'CU2003'),
  ('Ventas', 'CU2004'),
  ('Ventas', 'CU2006'),

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
  ('Administrador', 'CU2001'),
  ('Administrador', 'CU2002'),
  ('Administrador', 'CU2003'),
  ('Administrador', 'CU2004'),
  ('Administrador', 'CU2006'),
  ('Administrador', 'CU3001'),
  ('Administrador', 'CU3002'),
  ('Administrador', 'CU3003'),
  ('Administrador', 'CU4001'),
  ('Administrador', 'CU4002'),
  ('Administrador', 'CU4003'),
  ('Administrador', 'CU4004');
