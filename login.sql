USE erpdb;

DROP TABLE IF EXISTS usuarios;

CREATE TABLE `usuarios` (
  `nombre` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` numeric(12,0) NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_usuario` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE perfiles (
  codigo_perfil varchar(36) NOT NULL,
  descripcion varchar(256),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usecases (
  codigo_usecase varchar(36) NOT NULL,
  linktolaunch varchar(4096),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usecase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE modulos (
  codigo_modulo varchar(36) NOT NULL,
  descripcion varchar (128),
  caption varchar (128),
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sesiones (
  codigo_usuario varchar(36) NOT NULL,
  login_time datetime DEFAULT CURRENT_TIMESTAMP,
  ip varchar (128),
  timestmp datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usuario, login_time, ip),
  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trazas_sesion (
  codigo_usuario varchar(36) NOT NULL,
  timestmp datetime DEFAULT CURRENT_TIMESTAMP,
  codigo_usecase varchar(36),
  CONSTRAINT fk_trazas_sesion_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario),
  CONSTRAINT fk_trazas_sesion_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE perfiles_ucases (
  codigo_perfil varchar(36) NOT NULL,
  codigo_usecase varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_perfil, codigo_usecase),
  CONSTRAINT fk_perfiles_ucases_perfil
    FOREIGN KEY (codigo_perfil) REFERENCES perfiles (codigo_perfil),
  CONSTRAINT fk_perfiles_ucases_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios_perfiles (
  codigo_usuario varchar(36) NOT NULL,
  codigo_perfil varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_usuario, codigo_perfil),
  CONSTRAINT fk_usuarios_perfiles_usuario
    FOREIGN KEY (codigo_usuario) REFERENCES usuarios (codigo_usuario),
  CONSTRAINT fk_usuarios_perfiles_perfil
    FOREIGN KEY (codigo_perfil) REFERENCES perfiles (codigo_perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE modulo_usecases (
  codigo_modulo varchar(36) NOT NULL,
  codigo_usecase varchar(36) NOT NULL,
  created_at datetime  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (codigo_modulo, codigo_usecase),
  CONSTRAINT fk_modulo_usecases_modulo
    FOREIGN KEY (codigo_modulo) REFERENCES modulos (codigo_modulo),
  CONSTRAINT fk_modulo_usecases_usecase
    FOREIGN KEY (codigo_usecase) REFERENCES usecases (codigo_usecase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO perfiles (codigo_perfil, descripcion) VALUES
  ('Despachador', 'Despachador'),
  ('Envasador', 'Envasador'),
  ('Comprador', 'Comprador'),
  ('Administracion', 'Administracion');

INSERT INTO usuarios (codigo_usuario, nombre, numero, password) VALUES
  ('1', 'Ana Rivera', 555111222, '1111'),
  ('2', 'Luis Gomez', 555333444, '2222');

INSERT INTO usuarios_perfiles (codigo_usuario, codigo_perfil) VALUES
  ('1', 'Despachador'),
  ('2', 'Envasador');
