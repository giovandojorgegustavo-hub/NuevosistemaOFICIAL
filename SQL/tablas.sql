USE erpdb;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `base_horarios`;
DROP TABLE IF EXISTS `bases`;

CREATE TABLE `bases` (
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `latitud` decimal(10,8) DEFAULT NULL,
  `longitud` decimal(11,8) DEFAULT NULL,
  `direccion` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`codigo_base`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `base_horarios` (
  `codigo_base` numeric(12,0) NOT NULL,
  `dia` int NOT NULL,
  `hr_apertura` datetime NOT NULL,
  `hr_cierre` datetime NOT NULL,
  `maximo_pedidos` int DEFAULT '4',
  `cantidad_pedidos` int DEFAULT '0',
  `estado` varchar(1) COLLATE utf8mb4_unicode_ci DEFAULT 'A',
  PRIMARY KEY (`codigo_base`, `dia`, `hr_apertura`),
  CONSTRAINT `fk_base_horarios_bases` FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `clientes`;


CREATE TABLE `clientes` (
  `nombre` text NOT NULL,
  `numero` numeric(12,0) NOT NULL,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `saldos_clientes`;

CREATE TABLE `saldos_clientes` (
  `codigo_cliente` numeric(12,0) NOT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `saldo_inicial` numeric(12,2) NOT NULL DEFAULT 0,
  `fecha_actualizado` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `saldo_final` numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`codigo_cliente`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `saldos_provedores`;

CREATE TABLE `saldos_provedores` (
  `codigo_provedor` numeric(12,0) NOT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `saldo_inicial` numeric(12,2) NOT NULL DEFAULT 0,
  `fecha_actualizado` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `saldo_final` numeric(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`codigo_provedor`),
  FOREIGN KEY (`codigo_provedor`) REFERENCES `provedores` (`codigo_provedor`)
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
  `codigo_puntoentrega` numeric(12,0) NOT NULL,
  `codigo_cliente_puntoentrega` numeric(12,0) NOT NULL,
  `ubigeo` char(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion_linea` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region_entrega` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dni` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `concatenarpuntoentrega` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `latitud` decimal(10,8) DEFAULT NULL,
  `longitud` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`codigo_puntoentrega`,`codigo_cliente_puntoentrega`),
  KEY `fk_puntos_entrega_cliente` (`codigo_cliente_puntoentrega`),
  KEY `fk_puntos_entrega_ubigeo` (`ubigeo`),
  CONSTRAINT `fk_puntos_entrega_cliente` FOREIGN KEY (`codigo_cliente_puntoentrega`) REFERENCES `clientes` (`codigo_cliente`),
  CONSTRAINT `fk_puntos_entrega_ubigeo` FOREIGN KEY (`ubigeo`) REFERENCES `ubigeo` (`ubigeo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `numrecibe`;

CREATE TABLE `numrecibe` (
  `numero` varchar(50) NOT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0)NOT NULL,
  `concatenarnumrecibe` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  CONSTRAINT `fk_clientenumrecibe_codigo_cliente` FOREIGN KEY (`codigo_cliente_numrecibe`) REFERENCES `clientes` (`codigo_cliente`)

) ENGINE=InnoDB;





DROP TABLE IF EXISTS `pedidos`;

CREATE TABLE `pedidos` ( 
  `codigo_pedido` numeric(12,0) NOT NULL,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL,
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
  `precio_total` numeric(12,2) NOT NULL,
  `saldo` numeric(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_pedido`,`ordinal`),
  CONSTRAINT `fk_pedidosdetalle_codigo_pedidos` FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  CONSTRAINT `fk_pedido_detalle_producto` FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB;

DROP TABLE IF EXISTS `cuentas_bancarias`;

CREATE TABLE `cuentas_bancarias` (
  `codigo_cuentabancaria` numeric(12,0) NOT NULL,
  `nombre` varchar(20) NOT NULL,
  `banco` varchar(20) NOT NULL,
  `saldo_inicial` numeric(12,2) NOT NULL DEFAULT 0,
  `fecha_saldo_inicial` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `saldo_actual` numeric(12,2) NOT NULL DEFAULT 0,
  `fecha_saldo_actual` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `saldo` numeric(12,2) DEFAULT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `estado` enum('activo','anulado') NOT NULL DEFAULT 'activo',
  `codigo_base` numeric(12,0) DEFAULT NULL,
  `codigo_cuentabancaria` numeric(12,0) DEFAULT NULL,
  `codigo_cliente_numrecibe` numeric(12,0) DEFAULT NULL,
  `ordinal_numrecibe` numeric(12,0) DEFAULT NULL,
  `codigo_cliente_puntoentrega` numeric(12,0) DEFAULT NULL,
  `codigo_puntoentrega` numeric(12,0) DEFAULT NULL,
  `costoenvio` numeric(12,2) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_documento`, `numero_documento`),
  FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_cuentabancaria`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`),
  FOREIGN KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`) REFERENCES `numrecibe` (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  FOREIGN KEY (`codigo_puntoentrega`, `codigo_cliente_puntoentrega`) REFERENCES `puntos_entrega` (`codigo_puntoentrega`, `codigo_cliente_puntoentrega`)
) ENGINE=InnoDB;



-- Modulo 3 - Operaciones Bancarias (Transferencias, Ajustes, Retiros)

DROP TABLE IF EXISTS `mov_operaciones_contables`;

CREATE TABLE `mov_operaciones_contables` (
  `tipodocumento` varchar(3) NOT NULL,
  `numdocumento` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `monto` numeric(12,2) NOT NULL DEFAULT 0,
  `codigo_cuentabancaria` numeric(12,0) NOT NULL,
  `codigo_cuentabancaria_destino` numeric(12,0) DEFAULT NULL,
  `descripcion` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumento`, `numdocumento`),
  FOREIGN KEY (`codigo_cuentabancaria`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`),
  FOREIGN KEY (`codigo_cuentabancaria_destino`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `etiqueta_retiro`;

CREATE TABLE `etiqueta_retiro` (
  `codigoetiquetaretiro` numeric(12,0) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoetiquetaretiro`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `mov_operaciones_contables_detalle`;

CREATE TABLE `mov_operaciones_contables_detalle` (
  `tipodocumento` varchar(3) NOT NULL,
  `numdocumento` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigoetiquetaretiro` numeric(12,0) NOT NULL,
  `monto` numeric(12,2) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumento`, `numdocumento`, `ordinal`),
  FOREIGN KEY (`tipodocumento`, `numdocumento`) REFERENCES `mov_operaciones_contables` (`tipodocumento`, `numdocumento`),
  FOREIGN KEY (`codigoetiquetaretiro`) REFERENCES `etiqueta_retiro` (`codigoetiquetaretiro`)
) ENGINE=InnoDB;


 

DROP TABLE IF EXISTS `mov_contable_detalle`;

CREATE TABLE `mov_contable_detalle` (
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,

  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `saldo` numeric(12,3) NOT NULL,
  `precio_total` numeric(12,2) ,
  PRIMARY KEY (`tipo_documento`, `numero_documento`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento`,`numero_documento`) REFERENCES `mov_contable` (`tipo_documento`,`numero_documento`)

) ENGINE=InnoDB;

DROP TABLE IF EXISTS `paquete`;

CREATE TABLE `paquete` (
  `codigo_paquete` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `estado` varchar(30) NOT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizado` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_paquete`,`tipo_documento`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `paquetedetalle`;
CREATE TABLE `paquetedetalle` (
  `codigo_paquete` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `estado` varchar(30) NOT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_paquete`,`tipo_documento`, `ordinal`),
  FOREIGN KEY (`codigo_paquete`,`tipo_documento`) REFERENCES `paquete` (`codigo_paquete`,`tipo_documento`)
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
  `fecha` datetime ,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`),
  CONSTRAINT `fk_viajes_codigo_base` FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalleviaje`;

CREATE TABLE `detalleviaje` (
  `codigoviaje` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `fecha_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` datetime NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`, `tipo_documento`, `numero_documento`),
  CONSTRAINT `fk_detalleviaje_codigoviaje` FOREIGN KEY (`codigoviaje`) REFERENCES `viajes` (`codigoviaje`),
  CONSTRAINT `fk_detalleviaje_mov_contable` FOREIGN KEY (`tipo_documento`, `numero_documento`) REFERENCES `mov_contable` (`tipo_documento`, `numero_documento`)
) ENGINE=InnoDB;



SET FOREIGN_KEY_CHECKS = 1;

DROP TABLE IF EXISTS `mov_contable_prov`;

CREATE TABLE `mov_contable_prov` (
  `tipo_documento_compra` varchar(3) NOT NULL,
  `num_documento_compra` numeric(12,0) NOT NULL,
  `codigo_provedor` numeric(12,0) NOT NULL,
  `codigo_cuentabancaria` numeric(12,0) DEFAULT NULL,
  `monto` numeric(12,2) NOT NULL DEFAULT 0,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`),
  FOREIGN KEY (`codigo_cuentabancaria`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalle_mov_contable_prov`;

CREATE TABLE `detalle_mov_contable_prov` (
  `tipo_documento_compra` varchar(3) NOT NULL,
  `num_documento_compra` numeric(12,0) NOT NULL,
  `codigo_provedor` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `cantidad_entregada` numeric(12,3) NOT NULL ,
  `saldo` numeric(12,3) NOT NULL DEFAULT '0.000',
  `monto` numeric(12,2) NOT NULL,
  PRIMARY KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`) REFERENCES `mov_contable_prov` (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalle_movs_partidas`;

CREATE TABLE `detalle_movs_partidas` (
  `tipo_documento_compra` varchar(3) NOT NULL,
  `num_documento_compra` numeric(12,0) NOT NULL,
  `codigo_provedor` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `tipo_documento_venta` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `monto` numeric(12,2) NOT NULL,
  PRIMARY KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `codigo_producto`, `tipo_documento_venta`, `numero_documento`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `remito_compra`;

CREATE TABLE `movimiento_stock` (
  `tipodocumentostock` varchar(3) NOT NULL,
  `numdocumentostock` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo_base` numeric(12,0) NOT NULL,
  `codigo_basedestino` numeric(12,0),
  `tipo_documento_compra` varchar(3) NULL,
  `num_documento_compra` numeric(12,0) NULL,
  `codigo_provedor` numeric(12,0) NULL,
  PRIMARY KEY (`tipodocumentostock`, `numdocumentostock`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  CONSTRAINT `fk_mov_stock_compra`
    FOREIGN KEY (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`)
    REFERENCES `mov_contable_prov` (`tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `detalle_movimiento_stock`;

CREATE TABLE `detalle_movimiento_stock` (
  `tipodocumentostock` varchar(3) NOT NULL,
  `numdocumentostock` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,

  PRIMARY KEY (`tipodocumentostock`, `numdocumentostock`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipodocumentostock`, `numdocumentostock`) REFERENCES `movimiento_stock` (`tipodocumentostock`, `numdocumentostock`)
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
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  caption varchar (128),
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

DROP TABLE IF EXISTS `bitacoraBase`;
CREATE TABLE `bitacoraBase` (
  `codigo_bitacora` DECIMAL(12,0),
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo_base` DECIMAL(12,0) NOT NULL,
  `codigo_usuario` VARCHAR(36) NOT NULL
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `Log_reasignacionBase`;
CREATE TABLE `Log_reasignacionBase` (
  `codigo_log` bigint NOT NULL AUTO_INCREMENT,
  `tipo_documento` varchar(3) NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `codigo_base_actual` numeric(12,0) NOT NULL,
  `codigo_base_reasignada` numeric(12,0) NOT NULL,
  `codigo_usuario` varchar(36) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_log`),
  FOREIGN KEY (`tipo_documento`, `numero_documento`) REFERENCES `mov_contable` (`tipo_documento`, `numero_documento`),
  FOREIGN KEY (`codigo_base_actual`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_base_reasignada`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_usuario`) REFERENCES `usuarios` (`codigo_usuario`)
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

-- Modulo 2 - CU4004: Fabricacion (Gastos)

DROP TABLE IF EXISTS `etiquetagastos`;
CREATE TABLE `etiquetagastos` (
  `codigoetiquetagasto` numeric(12,0) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoetiquetagasto`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `mov_contable_gasto`;
CREATE TABLE `mov_contable_gasto` (
  `tipodocumento` varchar(3) NOT NULL,
  `numdocumento` numeric(12,0) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` varchar(60) NOT NULL,
  `monto` numeric(12,2) NOT NULL,
  `codigo_cuentabancaria` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumento`, `numdocumento`),
  FOREIGN KEY (`codigo_cuentabancaria`) REFERENCES `cuentas_bancarias` (`codigo_cuentabancaria`)
) ENGINE=InnoDB;
 
DROP TABLE IF EXISTS `mov_contable_gasto_detalle`;
CREATE TABLE `mov_contable_gasto_detalle` (
  `tipodocumento` varchar(3) NOT NULL,
  `numdocumento` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigoetiquetagasto` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumento`, `numdocumento`, `ordinal`),
  FOREIGN KEY (`tipodocumento`, `numdocumento`) REFERENCES `mov_contable_gasto` (`tipodocumento`, `numdocumento`),
  FOREIGN KEY (`codigoetiquetagasto`) REFERENCES `etiquetagastos` (`codigoetiquetagasto`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `fabricaciongastos`;
CREATE TABLE `fabricaciongastos` (
  `tipodocumentostock` varchar(3) NOT NULL,
  `numdocumentostock` numeric(12,0) NOT NULL,
  `tipodocumentogasto` varchar(3) NOT NULL,
  `numdocumentogasto` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumentostock`, `numdocumentostock`, `tipodocumentogasto`, `numdocumentogasto`, `ordinal`),
  FOREIGN KEY (`tipodocumentostock`, `numdocumentostock`) REFERENCES `movimiento_stock` (`tipodocumentostock`, `numdocumentostock`),
  FOREIGN KEY (`tipodocumentogasto`, `numdocumentogasto`) REFERENCES `mov_contable_gasto` (`tipodocumento`, `numdocumento`)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS `Facturas_Pagadas`;
CREATE TABLE `Facturas_Pagadas` (
  `tipodocumento` varchar(3) NOT NULL,
  `numdocumento` numeric(12,0) NOT NULL,
  `tipo_documento_cli` varchar(3) NOT NULL,
  `numero_documento_cli` numeric(12,0) NOT NULL,
  `monto_pagado` numeric(12,0) NOT NULL,
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipodocumento`, `numdocumento`, `tipo_documento_cli`, `numero_documento_cli`)
) ENGINE=InnoDB;
