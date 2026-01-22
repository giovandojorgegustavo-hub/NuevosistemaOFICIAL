USE erpdb;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Perfil base
INSERT INTO perfiles (codigo_perfil, descripcion)
VALUES ('Administrador', 'Administrador')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

-- Usuario base (codigo 1, password 1111)
INSERT INTO usuarios (codigo_usuario, nombre, numero, password)
VALUES ('1', 'Administrador', 1, '1111')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  numero = VALUES(numero),
  password = VALUES(password);

-- Usuario 1 -> perfil Administrador
INSERT INTO usuarios_perfiles (codigo_usuario, codigo_perfil)
VALUES ('1', 'Administrador')
ON DUPLICATE KEY UPDATE
  codigo_perfil = VALUES(codigo_perfil);



-- Casos de uso (wizard) con URL completas
INSERT INTO usecases (codigo_usecase, linktolaunch)
VALUES
  ('CU-001', 'http://167.99.173.100:3001'),
  ('CU-002', 'http://167.99.173.100:3002'),
  ('CU-003', 'http://167.99.173.100:3003'),
  ('CU-004', 'http://167.99.173.100:3004'),
  ('CU-005', 'http://167.99.173.100:3005'),
  ('CU-006', 'http://167.99.173.100:3006'),
  ('CU-007', 'http://167.99.173.100:3007')
ON DUPLICATE KEY UPDATE
  linktolaunch = VALUES(linktolaunch);



  
-- Perfil Administrador -> usecases
INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase)
VALUES
  ('Administrador', 'CU-001'),
  ('Administrador', 'CU-002'),
  ('Administrador', 'CU-003'),
  ('Administrador', 'CU-004'),
  ('Administrador', 'CU-005'),
  ('Administrador', 'CU-006'),
  ('Administrador', 'CU-007')
ON DUPLICATE KEY UPDATE
  codigo_perfil = VALUES(codigo_perfil);

-- Modulo Pedido
INSERT INTO modulos (codigo_modulo, descripcion, caption)
VALUES ('PEDIDO', 'Pedido', 'Pedido')
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion),
  caption = VALUES(caption);


-- Vinculo modulo <-> usecases
INSERT INTO modulo_usecases (codigo_modulo, codigo_usecase)
VALUES
  ('PEDIDO', 'CU-001'),
  ('PEDIDO', 'CU-002'),
  ('PEDIDO', 'CU-003'),
  ('PEDIDO', 'CU-004'),
  ('PEDIDO', 'CU-005'),
  ('PEDIDO', 'CU-006'),
  ('PEDIDO', 'CU-007')
ON DUPLICATE KEY UPDATE
  codigo_modulo = VALUES(codigo_modulo);
