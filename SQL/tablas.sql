USE erpdb;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `bases`;

CREATE TABLE `bases` (
  `nombre` varchar(100) NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_base`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `clientes`;


CREATE TABLE `clientes` (
  `nombre` text NOT NULL,
  `numero` numeric(12,0) NOT NULL,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `puntos_entrega`;
DROP TABLE IF EXISTS `ubigeo`;

CREATE TABLE `ubigeo` (
  `ubigeo` char(6) NOT NULL,
  `cod_dep` char(2) NOT NULL,
  `cod_prov` char(2) NOT NULL,
  `cod_dist` char(2) NOT NULL,
  `departamento` varchar(100) NOT NULL,
  `provincia` varchar(100) NOT NULL,
  `distrito` varchar(100) NOT NULL,
  PRIMARY KEY (`ubigeo`)
) ENGINE=InnoDB;

CREATE TABLE `puntos_entrega` (
  `codigo_puntoentrega` numeric(12,0) NOT NULL ,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `ubigeo` char(6) NOT NULL,
  `region_entrega` enum('LIMA','PROV') NOT NULL,
  `direccion_linea` varchar(255) DEFAULT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `destinatario_nombre` varchar(255) DEFAULT NULL,
  `destinatario_dni` varchar(20) DEFAULT NULL,
  `agencia` varchar(255) DEFAULT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_puntoentrega`, `ubigeo`),
  CONSTRAINT `fk_puntos_entrega_cliente` FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  CONSTRAINT `fk_puntos_entrega_ubigeo` FOREIGN KEY (`ubigeo`) REFERENCES `ubigeo` (`ubigeo`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `numrecibe`;

CREATE TABLE `numrecibe` (
  `numero` varchar(50) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0)NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  CONSTRAINT `fk_clientenumrecibe_codigo_cliente` FOREIGN KEY (`codigo_cliente_numrecibe`) REFERENCES `clientes` (`codigo_cliente`)

) ENGINE=InnoDB;


DROP TABLE IF EXISTS `packing`;


CREATE TABLE `packing` (
  `nombre` varchar(255) NOT NULL,
  `codigo_packing` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`codigo_packing`)
) ENGINE=InnoDB;


DROP TABLE IF EXISTS `pedidos`;

CREATE TABLE `pedidos` (
  `codigo_pedido` numeric(12,0) NOT NULL,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('activo','anulado') NOT NULL DEFAULT 'activo',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_pedido`),
  CONSTRAINT `fk_pedidos_codigo_cliente` FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`)
  
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `productos`;

CREATE TABLE `productos` (
  `nombre` varchar(255) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_producto`)
) ENGINE=InnoDB;



DROP TABLE IF EXISTS `pedido_detalle`;

CREATE TABLE `pedido_detalle` (
  `codigo_pedido` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `precio_unitario` numeric(12,2),
  `precio_total` numeric(12,2) NOT NULL,
  `saldo` numeric(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_pedido`,`ordinal`),
  CONSTRAINT `fk_pedidosdetalle_codigo_pedidos` FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  CONSTRAINT `fk_pedido_detalle_producto` FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB;

DROP TABLE IF EXISTS `cuentas_bancarias`;

CREATE TABLE `cuentas_bancarias` (
  `codigo_cuentabancaria` numeric(12,0) NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `banco` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cuentabancaria`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `mov_contable`;

CREATE TABLE `mov_contable` (
  `codigo_pedido` numeric(12,0) DEFAULT NULL,
  `fecha_emision` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_valor` datetime DEFAULT CURRENT_TIMESTAMP,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `monto` numeric(12,2) DEFAULT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `estado` enum('activo','anulado') NOT NULL DEFAULT 'activo',
  `codigo_base` numeric(12,0) DEFAULT NULL,
  `codigo_packing` numeric(12,0) DEFAULT NULL,
  `codigo_cuentabancaria` numeric(12,0) DEFAULT NULL,
  `codigo_cliente_numrecibe` numeric(12,0) DEFAULT NULL,
  `ordinal_numrecibe` numeric(12,0) DEFAULT NULL,
  `ubigeo` char(2) DEFAULT NULL,
  `codigo_puntoentrega` numeric(12,0) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_documento`, `numero_documento`),
  FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_packing`) REFERENCES `packing` (`codigo_packing`),
  FOREIGN KEY (`codigo_cuentabancaria`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`),
  FOREIGN KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`) REFERENCES `numrecibe` (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  FOREIGN KEY (`codigo_puntoentrega`, `ubigeo`) REFERENCES `puntos_entrega` (`codigo_puntoentrega`, `ubigeo`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `movimientos`;

CREATE TABLE `movimientos` (
  `fk_mov_codigopedido` numeric(12,0) NOT NULL,
  `tipo_movimiento` enum('SALIDA','ENTRADA','TRASLADO','AJUSTE') NOT NULL,
  `numero_movimiento` varchar(64) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  `codigo_cliente` numeric(12,0) NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `codigo_packing` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0) NOT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  PRIMARY KEY (`tipo_movimiento`, `numero_movimiento`),
  FOREIGN KEY (`fk_mov_codigopedido`) REFERENCES `pedidos` (`codigo_pedido`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_packing`) REFERENCES `packing` (`codigo_packing`),
  FOREIGN KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`) REFERENCES `numrecibe` (`codigo_cliente_numrecibe`,`ordinal_numrecibe`)

) ENGINE=InnoDB;


 

DROP TABLE IF EXISTS `mov_contable_detalle`;

CREATE TABLE `mov_contable_detalle` (
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,

  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `precio_total` numeric(12,2) ,
  `monto_linea` numeric(12,2) ,
  PRIMARY KEY (`tipo_documento`, `numero_documento`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento`,`numero_documento`) REFERENCES `mov_contable` (`tipo_documento`,`numero_documento`)

) ENGINE=InnoDB;

DROP TABLE IF EXISTS `movimiento_detalle`;

CREATE TABLE `movimiento_detalle` (
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `tipo_movimiento` enum('SALIDA','ENTRADA','TRASLADO','AJUSTE') NOT NULL,
  `numero_movimiento` varchar(64) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_movimiento`, `numero_movimiento`, `ordinal`),
  FOREIGN KEY (`tipo_movimiento`,`numero_movimiento`) REFERENCES `movimientos` (`tipo_movimiento`,`numero_movimiento`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB;






DROP TABLE IF EXISTS `saldo_stock`;

CREATE TABLE `saldo_stock` (
  `codigo_base` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `saldo_actual` numeric(12,3) NOT NULL DEFAULT '0.000',
  `saldo_inicial` numeric(12,3) NOT NULL DEFAULT '0.000',
  `fecha_saldoinicial` datetime DEFAULT NULL,
  `fecha_saldoactual` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_base`, `codigo_producto`),
  CONSTRAINT `fk_saldo_stock_codigo_base` FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  CONSTRAINT `fk_saldo_stock_codigo_producto` FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB;
  

DROP TABLE IF EXISTS `viajes`;

CREATE TABLE `viajes` (
  `codigoviaje` numeric(12,0) NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `nombre_motorizado` varchar(255) NOT NULL,
  `numero_wsp` varchar(50) DEFAULT NULL,
  `num_llamadas` varchar(50) DEFAULT NULL,
  `num_yape` varchar(50) DEFAULT NULL,
  `link` text,
  `observacion` text,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`),
  CONSTRAINT `fk_viajes_codigo_base` FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalleviaje`;

CREATE TABLE `detalleviaje` (
  `codigoviaje` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `fecha_inicio` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`, `tipo_documento`, `numero_documento`),
  CONSTRAINT `fk_detalleviaje_codigoviaje` FOREIGN KEY (`codigoviaje`) REFERENCES `viajes` (`codigoviaje`),
  CONSTRAINT `fk_detalleviaje_mov_contable` FOREIGN KEY (`tipo_documento`, `numero_documento`) REFERENCES `mov_contable` (`tipo_documento`, `numero_documento`)
) ENGINE=InnoDB;



SET FOREIGN_KEY_CHECKS = 1;

DROP TABLE IF EXISTS `mov_contable_compras`;

CREATE TABLE `mov_contable_compras` (
  `tipo_documento_compra` varchar(3) NOT NULL,
  `num_documento_compra` numeric(12,0) NOT NULL,
  `codigo_provedor` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalle_mov_contable_compras`;

CREATE TABLE `detalle_mov_contable_compras` (
  `tipo_documento_compra` varchar(3) NOT NULL,
  `num_documento_compra` numeric(12,0) NOT NULL,
  `codigo_provedor` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `saldo` numeric(12,3) NOT NULL DEFAULT '0.000',
  `precio_compra` numeric(12,2) NOT NULL,
  PRIMARY KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`) REFERENCES `mov_contable_compras` (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `remito_compra`;

CREATE TABLE `movimiento_stock` (
  `tipo_documento` varchar(3) NOT NULL,
  `num_documento` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo_base` numeric(12,0) NOT NULL,
  `codigo_basedestino` numeric(12,0),
  PRIMARY KEY (`tipo_documento`, `num_documento`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalle_movimiento_stock`;

CREATE TABLE `detalle_movimiento_stock` (
  `tipo_documento` varchar(3) NOT NULL,
  `num_documento` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  PRIMARY KEY (`tipo_documento`, `num_documento`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento`, `num_documento`) REFERENCES `movimiento_stock` (`tipo_documento`, `num_documento`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `provedores`;

CREATE TABLE `provedores` (
  `codigo_provedor` numeric(12,0) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_provedor`)
) ENGINE=InnoDB;

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
