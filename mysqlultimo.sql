SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `bases`;

CREATE TABLE `bases` (
  `id` numeric(12,0) NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_base`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `clientes`;


CREATE TABLE `clientes` (
  `id` numeric(12,0) NOT NULL,
  `nombre` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` numeric(12,0) NOT NULL,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `direcciones`;

CREATE TABLE `direcciones` (
  `id` numeric(12,0) NOT NULL,
  `codigo_cliente_direccion` numeric(12,0) NOT NULL,
  `provincia` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `localidad` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `distrito` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ordinal_direccion` numeric(12,0) NOT NULL,

  PRIMARY KEY (`codigo_cliente_direccion`,`ordinal_direccion`),
  CONSTRAINT `fk_clientedireccion_codigo_cliente` FOREIGN KEY (`codigo_cliente_direccion`) REFERENCES `clientes` (`codigo_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `direccionesprov`;

CREATE TABLE `direccionesprov` (
  `id` numeric(12,0) NOT NULL,
  `codigo_cliente_direccionprov` numeric(12,0) NOT NULL,
  `nombre_completo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dni` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lugar_envio` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordinal_direccionprov` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente_direccionprov`,`ordinal_direccionprov`),
  CONSTRAINT `fk_clientedireccionprov_codigo_cliente` FOREIGN KEY (`codigo_cliente_direccionprov`) REFERENCES `clientes` (`codigo_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `numrecibe`;

CREATE TABLE `numrecibe` (
  `id` numeric(12,0) NOT NULL,
  `numero` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0)NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  CONSTRAINT `fk_clientenumrecibe_codigo_cliente` FOREIGN KEY (`codigo_cliente_numrecibe`) REFERENCES `clientes` (`codigo_cliente`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `packing`;


CREATE TABLE `packing` (
  `id` numeric(12,0) NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_packing` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`codigo_packing`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `pedidos`;

CREATE TABLE `pedidos` (
  `id` numeric(12,0) NOT NULL,
  `codigo_pedido` numeric(12,0) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_pedido`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `productos`;

CREATE TABLE `productos` (
  `id` numeric(12,0) NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



DROP TABLE IF EXISTS `pedido_detalle`;

CREATE TABLE `pedido_detalle` (
  `id` numeric(12,0) NOT NULL,
  `codigo_pedido` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `precio_unitario` numeric(12,2) NOT NULL,
  `saldo` numeric(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigo_pedido`,`ordinal`),
  CONSTRAINT `fk_pedidosdetalle_codigo_pedidos` FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  CONSTRAINT `fk_pedido_detalle_producto` FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `mov_contable`;

CREATE TABLE `mov_contable` (
  `id` numeric(12,0) NOT NULL,
  `codigo_pedido` numeric(12,0) NOT NULL,
  `fecha_emision` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_vencimiento` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_valor` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo_cliente` numeric(12,0) NOT NULL,
  `monto` numeric(12,2) NOT NULL,
  `tipo_documento` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `codigo_base` numeric(12,0)NOT NULL,
  `codigo_packing` numeric(12,0) NOT NULL,
  `codigo_cliente_direccion` numeric(12,0) NOT NULL,
  `ordinal_direccion` numeric(12,0) NOT NULL,
  `codigo_cliente_direccionprov` numeric(12,0) NOT NULL,
  `ordinal_direccionprov` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0) NOT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `iddireccionprov` numeric(12,0) NOT NULL,
  PRIMARY KEY (`tipo_documento`, `numero_documento`),
  FOREIGN KEY (`codigo_pedido`) REFERENCES `pedidos` (`codigo_pedido`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_packing`) REFERENCES `packing` (`codigo_packing`),
  FOREIGN KEY (`codigo_cliente_direccion`,`ordinal_direccion`) REFERENCES `direcciones` (`codigo_cliente_direccion`,`ordinal_direccion`),
  FOREIGN KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`) REFERENCES `numrecibe` (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  FOREIGN KEY (`codigo_cliente_direccionprov`,`ordinal_direccionprov`) REFERENCES `direccionesprov` (`codigo_cliente_direccionprov`,`ordinal_direccionprov`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `movimientos`;

CREATE TABLE `movimientos` (
  `id` numeric(12,0) NOT NULL,
  `fk_mov_codigopedido` numeric(12,0) NOT NULL,
  `tipo_movimiento` enum('SALIDA','ENTRADA','TRASLADO','AJUSTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_movimiento` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  `codigo_cliente` numeric(12,0) NOT NULL,
  `codigo_base` numeric(12,0) NOT NULL,
  `codigo_packing` numeric(12,0) NOT NULL,
  `codigo_cliente_direccion` numeric(12,0) NOT NULL,
  `ordinal_direccion` numeric(12,0) NOT NULL,
  `codigo_cliente_direccionprov` numeric(12,0) NOT NULL,
  `ordinal_direccionprov` numeric(12,0) NOT NULL,
  `codigo_cliente_numrecibe` numeric(12,0) NOT NULL,
  `ordinal_numrecibe` numeric(12,0) NOT NULL,
  PRIMARY KEY (`tipo_movimiento`, `numero_movimiento`),
  FOREIGN KEY (`fk_mov_codigopedido`) REFERENCES `pedidos` (`codigo_pedido`),
  FOREIGN KEY (`codigo_cliente`) REFERENCES `clientes` (`codigo_cliente`),
  FOREIGN KEY (`codigo_base`) REFERENCES `bases` (`codigo_base`),
  FOREIGN KEY (`codigo_packing`) REFERENCES `packing` (`codigo_packing`),
  FOREIGN KEY (`codigo_cliente_direccion`,`ordinal_direccion`) REFERENCES `direcciones` (`codigo_cliente_direccion`,`ordinal_direccion`),
  FOREIGN KEY (`codigo_cliente_numrecibe`,`ordinal_numrecibe`) REFERENCES `numrecibe` (`codigo_cliente_numrecibe`,`ordinal_numrecibe`),
  FOREIGN KEY (`codigo_cliente_direccionprov`,`ordinal_direccionprov`) REFERENCES `direccionesprov` (`codigo_cliente_direccionprov`,`ordinal_direccionprov`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




DROP TABLE IF EXISTS `mov_contable_detalle`;

CREATE TABLE `mov_contable_detalle` (
  `id` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,

  `idmov_contable` numeric(12,0) NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `precio_unitario` numeric(12,2) NOT NULL,
  `monto_linea` numeric(12,2) NOT NULL,
  PRIMARY KEY (`tipo_documento`, `numero_documento`, `ordinal`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`),
  FOREIGN KEY (`tipo_documento`,`numero_documento`) REFERENCES `mov_contable` (`tipo_documento`,`numero_documento`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `movimiento_detalle`;

CREATE TABLE `movimiento_detalle` (
  `id` numeric(12,0) NOT NULL,
  `codigo_producto` numeric(12,0) NOT NULL,
  `cantidad` numeric(12,3) NOT NULL,
  `tipo_movimiento` enum('SALIDA','ENTRADA','TRASLADO','AJUSTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_movimiento` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordinal` numeric(12,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tipo_movimiento`, `numero_movimiento`, `ordinal`),
  FOREIGN KEY (`tipo_movimiento`,`numero_movimiento`) REFERENCES `movimientos` (`tipo_movimiento`,`numero_movimiento`),
  FOREIGN KEY (`codigo_producto`) REFERENCES `productos` (`codigo_producto`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;






DROP TABLE IF EXISTS `saldo_stock`;

CREATE TABLE `saldo_stock` (
  `id` numeric(12,0) NOT NULL,
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

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `viajes`;

CREATE TABLE `viajes` (
  `codigoviaje` numeric(12,0) NOT NULL,
  `nombre_motorizado` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_wsp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `num_llamadas` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `num_yape` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link` text COLLATE utf8mb4_unicode_ci,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `detalleviaje`;

CREATE TABLE `detalleviaje` (
  `codigoviaje` numeric(12,0) NOT NULL,
  `tipo_documento` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_documento` numeric(12,0) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`codigoviaje`, `tipo_documento`, `numero_documento`),
  CONSTRAINT `fk_detalleviaje_codigoviaje` FOREIGN KEY (`codigoviaje`) REFERENCES `viajes` (`codigoviaje`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT `fk_detalleviaje_mov_contable` FOREIGN KEY (`tipo_documento`, `numero_documento`) REFERENCES `mov_contable` (`tipo_documento`, `numero_documento`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `clientes` (`id`, `nombre`, `numero`, `codigo_cliente`, `created_at`) VALUES
  (1, 'Juan Perez', 1, 1, '2026-01-12 22:07:43'),
  (2, 'Maria Gomez', 2, 2, '2026-01-12 22:07:43'),
  (3, 'Comercial San Martin', 3, 3, '2026-01-12 22:07:43');

INSERT INTO `bases` (`id`, `nombre`, `codigo_base`, `created_at`) VALUES
  (1, 'CUSCO', 1, '2026-01-10 16:58:30'),
  (2, 'LEVIATAN', 2, '2026-01-10 16:58:30');

INSERT INTO `bases` (`id`, `nombre`, `codigo_base`, `created_at`) VALUES
  (3, 'LIMA', 3, '2026-01-10 16:58:30'),
  (4, 'AREQUIPA', 4, '2026-01-10 16:58:30');

INSERT INTO `packing` (`id`, `nombre`, `codigo_packing`, `created_at`) VALUES
  (1, 'CAJA ESTÁNDAR', 1, '2026-01-10 16:58:30'),
  (2, 'FRÁGIL', 2, '2026-01-10 16:58:30'),
  (3, 'REFRIGERADO', 3, '2026-01-10 16:58:30');

INSERT INTO `direcciones` (
  `id`,
  `codigo_cliente_direccion`,
  `provincia`,
  `localidad`,
  `distrito`,
  `direccion`,
  `created_at`,
  `ordinal_direccion`
) VALUES
  (1, 1, 'LIMA', 'LIMA METROPOLITANA', 'SAN ISIDRO', 'AV. JAVIER PRADO ESTE 1234 OF 501', '2026-01-10 16:43:24', 1),
  (2, 1, 'LIMA', 'LIMA METROPOLITANA', 'MIRAFLORES', 'CALLE SCHELL 456 DEP 302', '2026-01-10 16:43:24', 2),
  (3, 2, 'CUSCO', 'CUSCO', 'WANCHAQ', 'JR. LOS INCAS 789', '2026-01-10 16:43:24', 1),
  (4, 3, 'AREQUIPA', 'AREQUIPA', 'YANAHUARA', 'AV. EJÉRCITO 100', '2026-01-10 16:43:24', 1);

INSERT INTO `direccionesprov` (
  `id`,
  `codigo_cliente_direccionprov`,
  `nombre_completo`,
  `dni`,
  `lugar_envio`,
  `ordinal_direccionprov`,
  `created_at`
) VALUES
  (1, 1, 'Juan Perez', '12345678', 'LIMA - SAN ISIDRO', 1, '2026-01-10 16:43:24'),
  (2, 1, 'Juan Perez (Oficina)', '12345678', 'LIMA - MIRAFLORES', 2, '2026-01-10 16:43:24'),
  (3, 2, 'Maria Gomez', '87654321', 'CUSCO - WANCHAQ', 1, '2026-01-10 16:43:24'),
  (4, 3, 'Comercial San Martin', '20123456789', 'AREQUIPA - YANAHUARA', 1, '2026-01-10 16:43:24');

INSERT INTO `numrecibe` (
  `id`,
  `numero`,
  `nombre`,
  `ordinal_numrecibe`,
  `codigo_cliente_numrecibe`,
  `created_at`
) VALUES
  (1, '+51911111111', 'Juan Perez', 1, 1, '2026-01-10 16:43:24'),
  (2, '+51922222222', 'Maria Gomez', 1, 2, '2026-01-10 16:43:24'),
  (3, '+51933333333', 'Recepción', 2, 2, '2026-01-10 16:43:24'),
  (4, '+51944444444', 'Almacén', 1, 3, '2026-01-10 16:43:24');

INSERT INTO `productos` (`id`, `nombre`, `codigo_producto`, `created_at`) VALUES
  (1, 'Producto 1', 1, '2026-01-12 22:30:22'),
  (2, 'Producto 2', 2, '2026-01-12 22:30:22'),
  (3, 'Producto 3', 3, '2026-01-12 22:30:22');



DROP PROCEDURE IF EXISTS `get_clientes`;
DELIMITER //
CREATE PROCEDURE `get_clientes`()
BEGIN
  SELECT `codigo_cliente`, `nombre`, `numero`
  FROM `clientes`;
END//
DELIMITER ;



DROP PROCEDURE IF EXISTS `get_productos`;
DELIMITER //
CREATE PROCEDURE `get_productos`()
BEGIN
  SELECT `codigo_producto`, `nombre`
  FROM `productos`;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS `get_bases`;
DELIMITER //
CREATE PROCEDURE `get_bases`()
BEGIN
  SELECT `codigo_base`, `nombre`
  FROM `bases`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_packing`;
DELIMITER //
CREATE PROCEDURE `get_packing`()
BEGIN
  SELECT `codigo_packing`, `nombre`
  FROM `packing`;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS `get_direcciones`;
DELIMITER //
CREATE PROCEDURE `get_direcciones`(IN p_codigo_cliente numeric(12,0))
BEGIN
  SELECT
    `codigo_cliente_direccion`,
    `ordinal_direccion`,
    `provincia`,
    `localidad`,
    `distrito`,
    `direccion`
  FROM `direcciones`
  WHERE `codigo_cliente_direccion` = p_codigo_cliente
  ORDER BY `ordinal_direccion`;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS `get_direccionesprov`;
DELIMITER //
CREATE PROCEDURE `get_direccionesprov`(IN p_codigo_cliente numeric(12,0))
BEGIN
  SELECT
    `codigo_cliente_direccionprov`,
    `ordinal_direccionprov`,
    `nombre_completo`,
    `dni`,
    `lugar_envio`
  FROM `direccionesprov`
  WHERE `codigo_cliente_direccionprov` = p_codigo_cliente
  ORDER BY `ordinal_direccionprov`;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS `get_numrecibe`;
DELIMITER //
CREATE PROCEDURE `get_numrecibe`(IN p_codigo_cliente numeric(12,0))
BEGIN
  SELECT
    `codigo_cliente_numrecibe`,
    `ordinal_numrecibe`,
    `numero`,
    `nombre`
  FROM `numrecibe`
  WHERE `codigo_cliente_numrecibe` = p_codigo_cliente
  ORDER BY `ordinal_numrecibe`;
END//
DELIMITER ;


-- =====================================================================================
-- STOCK: descontar saldo_stock por detalle de factura emitida (mov_contable + detalle)
-- =====================================================================================

DROP PROCEDURE IF EXISTS `aplicar_salida_factura_a_saldo_stock`;
DELIMITER //
CREATE PROCEDURE `aplicar_salida_factura_a_saldo_stock`(
  IN p_tipo_documento varchar(3),
  IN p_numero_documento numeric(12,0)
)
proc: BEGIN
  DECLARE v_now datetime;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_now = NOW();

  DROP TEMPORARY TABLE IF EXISTS tmp_factura_qty;
  CREATE TEMPORARY TABLE tmp_factura_qty (
    codigo_base numeric(12,0) NOT NULL,
    codigo_producto numeric(12,0) NOT NULL,
    cantidad numeric(12,3) NOT NULL,
    PRIMARY KEY (codigo_base, codigo_producto)
  ) ENGINE=InnoDB;

  INSERT INTO tmp_factura_qty (codigo_base, codigo_producto, cantidad)
  SELECT
    mc.codigo_base,
    mcd.codigo_producto,
    SUM(mcd.cantidad) AS cantidad
  FROM mov_contable mc
  JOIN mov_contable_detalle mcd
    ON mcd.tipo_documento = mc.tipo_documento
   AND mcd.numero_documento = mc.numero_documento
  WHERE mc.tipo_documento = p_tipo_documento
    AND mc.numero_documento = p_numero_documento
  GROUP BY mc.codigo_base, mcd.codigo_producto;

  IF (SELECT COUNT(*) FROM tmp_factura_qty) = 0 THEN
    SELECT
      'SIN_LINEAS' AS estado,
      p_tipo_documento AS tipo_documento,
      p_numero_documento AS numero_documento;
    LEAVE proc;
  END IF;

  -- Si faltan saldos para algún (base, producto), no aplica nada.
  IF EXISTS (
    SELECT 1
    FROM tmp_factura_qty t
    LEFT JOIN saldo_stock ss
      ON ss.codigo_base = t.codigo_base
     AND ss.codigo_producto = t.codigo_producto
    WHERE ss.codigo_base IS NULL
  ) THEN
    SELECT
      'ERROR_FALTAN_SALDOS_STOCK' AS estado,
      t.codigo_base,
      t.codigo_producto,
      t.cantidad
    FROM tmp_factura_qty t
    LEFT JOIN saldo_stock ss
      ON ss.codigo_base = t.codigo_base
     AND ss.codigo_producto = t.codigo_producto
    WHERE ss.codigo_base IS NULL;
    LEAVE proc;
  END IF;

  START TRANSACTION;

  DROP TEMPORARY TABLE IF EXISTS tmp_before;
  CREATE TEMPORARY TABLE tmp_before AS
  SELECT
    ss.codigo_base,
    ss.codigo_producto,
    ss.saldo_actual AS saldo_antes,
    t.cantidad AS cantidad_descontar
  FROM saldo_stock ss
  JOIN tmp_factura_qty t
    ON t.codigo_base = ss.codigo_base
   AND t.codigo_producto = ss.codigo_producto;

  -- Lock filas objetivo
  SELECT ss.codigo_base, ss.codigo_producto
  FROM saldo_stock ss
  JOIN tmp_factura_qty t
    ON t.codigo_base = ss.codigo_base
   AND t.codigo_producto = ss.codigo_producto
  FOR UPDATE;

  UPDATE saldo_stock ss
  JOIN tmp_factura_qty t
    ON t.codigo_base = ss.codigo_base
   AND t.codigo_producto = ss.codigo_producto
  SET
    ss.saldo_actual = GREATEST(0, ss.saldo_actual - t.cantidad),
    ss.fecha_saldoactual = v_now;

  COMMIT;

  -- Resultado (antes / despues) para validar
  SELECT
    b.codigo_base,
    b.codigo_producto,
    b.saldo_antes,
    b.cantidad_descontar,
    ss.saldo_actual AS saldo_despues,
    ss.fecha_saldoactual
  FROM tmp_before b
  JOIN saldo_stock ss
    ON ss.codigo_base = b.codigo_base
   AND ss.codigo_producto = b.codigo_producto
  ORDER BY b.codigo_base, b.codigo_producto;

  DROP TEMPORARY TABLE IF EXISTS tmp_before;
  DROP TEMPORARY TABLE IF EXISTS tmp_factura_qty;
END//
DELIMITER ;

-- Ejemplo editable:
-- CALL aplicar_salida_factura_a_saldo_stock('FAC', 123);

-- Seed opcional: crea/actualiza saldo_stock (10) para todas las combinaciones base x producto
-- Ajusta el multiplicador (1000000) si tus códigos de producto pueden ser >= 1,000,000.
INSERT INTO saldo_stock
  (id, codigo_base, codigo_producto, saldo_actual, saldo_inicial, fecha_saldoinicial, fecha_saldoactual)
SELECT
  (b.codigo_base * 1000000 + p.codigo_producto) AS id,
  b.codigo_base,
  p.codigo_producto,
  10.000 AS saldo_actual,
  10.000 AS saldo_inicial,
  NOW() AS fecha_saldoinicial,
  NOW() AS fecha_saldoactual
FROM bases b, productos p
ON DUPLICATE KEY UPDATE
  saldo_actual = IF(saldo_actual = 0, VALUES(saldo_actual), saldo_actual),
  saldo_inicial = IF(saldo_inicial = 0, VALUES(saldo_inicial), saldo_inicial),
  fecha_saldoinicial = IF(fecha_saldoinicial IS NULL, VALUES(fecha_saldoinicial), fecha_saldoinicial),
  fecha_saldoactual = VALUES(fecha_saldoactual);
