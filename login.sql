USE erpdb;

DROP TABLE IF EXISTS usuarios;

CREATE TABLE `usuarios` (
  `nombre` text NOT NULL,
  `numero` numeric(12,0) NOT NULL,
  `password` varchar(255) NOT NULL,
  `codigo_usuario` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_usuario`)
) ENGINE=InnoDB;


CREATE TABLE perfiles (
  codigo_perfil varchar(36) NOT NULL,
  descripcion varchar(256),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_perfil)
) ENGINE=InnoDB;

CREATE TABLE usecases (
  codigo_usecase varchar(36) NOT NULL,
  linktolaunch varchar(4096),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usecase)
) ENGINE=InnoDB;

CREATE TABLE modulos (
  codigo_modulo varchar(36) NOT NULL,
  descripcion varchar (128),
  caption varchar (128),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_modulo)
) ENGINE=InnoDB;

CREATE TABLE sesiones (
  codigo_usuario varchar(36) NOT NULL,
  login_time datetime DEFAULT CURRENT_TIMESTAMP,
  ip varchar (128),
  timestmp datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usuario, login_time, ip),
  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario)
) ENGINE=InnoDB;

CREATE TABLE trazas_sesion (
  codigo_usuario varchar(36) NOT NULL,
  timestmp datetime DEFAULT CURRENT_TIMESTAMP,
  codigo_usecase varchar(36),
  CONSTRAINT fk_trazas_sesion_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario),
  CONSTRAINT fk_trazas_sesion_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB;

CREATE TABLE perfiles_ucases (
  codigo_perfil varchar(36) NOT NULL,
  codigo_usecase varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_perfil, codigo_usecase),
  CONSTRAINT fk_perfiles_ucases_perfil
    FOREIGN KEY (codigo_perfil) REFERENCES perfiles (codigo_perfil),
  CONSTRAINT fk_perfiles_ucases_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB;

CREATE TABLE usuarios_perfiles (
  codigo_usuario varchar(36) NOT NULL,
  codigo_perfil varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usuario, codigo_perfil),
  CONSTRAINT fk_usuarios_perfiles_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario),
  CONSTRAINT fk_usuarios_perfiles_perfil
    FOREIGN KEY (codigo_perfil) REFERENCES perfiles (codigo_perfil)
) ENGINE=InnoDB;

CREATE TABLE modulo_usecases (
  codigo_modulo varchar(36) NOT NULL,
  codigo_usecase varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_modulo, codigo_usecase),
  CONSTRAINT fk_modulo_usecases_modulo
    FOREIGN KEY (codigo_modulo) REFERENCES modulos (codigo_modulo),
  CONSTRAINT fk_modulo_usecases_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB;

INSERT INTO perfiles (codigo_perfil, descripcion) VALUES
  ('Despachador', 'Despachador'),
  ('Envasador', 'Envasador'),
  ('Comprador', 'Comprador'),
  ('Administracion', 'Administracion');

INSERT INTO usuarios (codigo_usuario, nombre, numero, password) VALUES
  ('1', 'Ana Rivera', 555111222, '1111');

INSERT INTO usuarios_perfiles (codigo_usuario, codigo_perfil) VALUES
  ('1', 'Despachador'),
  ('1', 'Envasador'),
  ('1', 'Comprador'),
  ('1', 'Administracion');

INSERT INTO usecases (codigo_usecase, linktolaunch) VALUES
  ('UC_AJUSTES', 'ajustes.html'),
  ('UC_COMPRAS', 'compras.html'),
  ('UC_FABRICACION', 'fabricacion.html'),
  ('UC_GESTION_PEDIDOS', 'gestion-pedidos.html'),
  ('UC_NOTA_CREDITO', 'nota-credito.html'),
  ('UC_PAGOS', 'pagos.html'),
  ('UC_PEDIDO', 'pedido.html'),
  ('UC_REMITO', 'remito.html'),
  ('UC_TRANSFERENCIAS', 'transferencias.html');

INSERT INTO perfiles_ucases (codigo_perfil, codigo_usecase) VALUES
  ('Despachador', 'UC_PEDIDO'),
  ('Despachador', 'UC_REMITO'),
  ('Despachador', 'UC_TRANSFERENCIAS'),
  ('Envasador', 'UC_FABRICACION'),
  ('Envasador', 'UC_AJUSTES'),
  ('Comprador', 'UC_COMPRAS'),
  ('Comprador', 'UC_PAGOS'),
  ('Comprador', 'UC_NOTA_CREDITO'),
  ('Administracion', 'UC_AJUSTES'),
  ('Administracion', 'UC_COMPRAS'),
  ('Administracion', 'UC_FABRICACION'),
  ('Administracion', 'UC_GESTION_PEDIDOS'),
  ('Administracion', 'UC_NOTA_CREDITO'),
  ('Administracion', 'UC_PAGOS'),
  ('Administracion', 'UC_PEDIDO'),
  ('Administracion', 'UC_REMITO'),
  ('Administracion', 'UC_TRANSFERENCIAS');

CREATE TABLE IF NOT EXISTS login_fallido (
  codigo_usuario varchar(36),
  usuario_input varchar(128),
  ip varchar(128),
  mensaje varchar(256),
  created_at datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS errores_app (
  codigo_error int NOT NULL AUTO_INCREMENT,
  codigo_usuario varchar(36),
  mensaje varchar(512),
  detalle text,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_error)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS validar_credenciales_usuario;
DROP PROCEDURE IF EXISTS get_usecases_usuario;
DROP PROCEDURE IF EXISTS log_sesion;
DROP PROCEDURE IF EXISTS log_intento_fallido;
DROP PROCEDURE IF EXISTS log_traza_sesion;
DROP PROCEDURE IF EXISTS log_error;

DELIMITER //

CREATE PROCEDURE validar_credenciales_usuario(IN p_usuario varchar(128), IN p_password varchar(255))
BEGIN
  SELECT u.codigo_usuario, u.nombre
  FROM usuarios u
  WHERE (u.codigo_usuario = p_usuario OR u.nombre = p_usuario OR CAST(u.numero AS CHAR) = p_usuario)
    AND u.password = p_password
  LIMIT 1;
END//

CREATE PROCEDURE get_usecases_usuario(IN p_usuario varchar(128))
BEGIN
  SELECT DISTINCT
    m.codigo_modulo,
    m.descripcion,
    m.caption,
    u.codigo_usecase,
    u.linktolaunch
  FROM usuarios usr
  JOIN usuarios_perfiles up ON up.codigo_usuario = usr.codigo_usuario
  JOIN perfiles_ucases pu ON pu.codigo_perfil = up.codigo_perfil
  JOIN usecases u ON u.codigo_usecase = pu.codigo_usecase
  LEFT JOIN modulo_usecases mu ON mu.codigo_usecase = u.codigo_usecase
  LEFT JOIN modulos m ON m.codigo_modulo = mu.codigo_modulo
  WHERE usr.codigo_usuario = p_usuario OR usr.nombre = p_usuario OR CAST(usr.numero AS CHAR) = p_usuario;
END//

CREATE PROCEDURE log_sesion(IN p_usuario varchar(36), IN p_ip varchar(128))
BEGIN
  INSERT INTO sesiones (codigo_usuario, ip) VALUES (p_usuario, p_ip);
END//

CREATE PROCEDURE log_intento_fallido(IN p_usuario varchar(36), IN p_usuario_input varchar(128), IN p_ip varchar(128), IN p_mensaje varchar(256))
BEGIN
  INSERT INTO login_fallido (codigo_usuario, usuario_input, ip, mensaje)
  VALUES (p_usuario, p_usuario_input, p_ip, p_mensaje);
END//

CREATE PROCEDURE log_traza_sesion(IN p_usuario varchar(36), IN p_usecase varchar(36))
BEGIN
  INSERT INTO trazas_sesion (codigo_usuario, codigo_usecase)
  VALUES (p_usuario, p_usecase);
END//

CREATE PROCEDURE log_error(IN p_usuario varchar(36), IN p_mensaje varchar(512), IN p_detalle text)
BEGIN
  INSERT INTO errores_app (codigo_usuario, mensaje, detalle)
  VALUES (p_usuario, p_mensaje, p_detalle);
END//

DELIMITER ;
