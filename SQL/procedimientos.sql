USE erpdb;

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


DROP PROCEDURE IF EXISTS `get_puntos_entrega`;
DELIMITER //
CREATE PROCEDURE `get_puntos_entrega`(IN p_codigo_cliente numeric(12,0))
BEGIN
  SELECT
    `cod_dep`,
    `cod_prov`,
    `cod_dist`,
    `codigo_puntoentrega`,
    `codigo_cliente`,
    `region_entrega`,
    `direccion_linea`,
    `referencia`,
    `destinatario_nombre`,
    `destinatario_dni`,
    `agencia`,
    `estado`
  FROM `puntos_entrega`
  WHERE `codigo_cliente` = p_codigo_cliente
  ORDER BY `cod_dep`, `cod_prov`, `cod_dist`, `codigo_puntoentrega`;
END//
DELIMITER ;




DROP PROCEDURE IF EXISTS `get_ubigeo`;
DELIMITER //
CREATE PROCEDURE `get_ubigeo`(IN p_cod_dep char(2), IN p_cod_prov char(2), IN p_cod_dist char(2))
BEGIN
  SELECT
    `cod_dep`,
    `cod_prov`,
    `cod_dist`,
    `departamento`,
    `provincia`,
    `distrito`
  FROM `ubigeo`
  WHERE `cod_dep` = p_cod_dep
    AND `cod_prov` = p_cod_prov
    AND `cod_dist` = p_cod_dist
  LIMIT 1;
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

DROP PROCEDURE IF EXISTS `get_pedidospendientes`;
DELIMITER //
CREATE PROCEDURE `get_pedidospendientes`()
BEGIN
  SELECT DISTINCT
    p.codigo_pedido,
    p.codigo_cliente,
    p.fecha,
    p.created_at
  FROM pedidos p
  JOIN pedido_detalle pd
    ON pd.codigo_pedido = p.codigo_pedido
  WHERE pd.saldo > 0
  ORDER BY p.fecha DESC, p.codigo_pedido DESC;
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

  -- Si faltan saldos para algun (base, producto), no aplica nada.
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

-- =====================================================================================
-- STOCK: descuento simple por detalle de factura emitida (mov_contable + detalle)
-- =====================================================================================

DROP PROCEDURE IF EXISTS `salidasinventario`;
DELIMITER //
CREATE PROCEDURE `salidasinventario`(
  IN p_tipo_documento varchar(3),
  IN p_numero_documento numeric(12,0)
)
BEGIN
  UPDATE saldo_stock ss
  JOIN (
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
    GROUP BY mc.codigo_base, mcd.codigo_producto
  ) t
    ON t.codigo_base = ss.codigo_base
   AND t.codigo_producto = ss.codigo_producto
  SET
    ss.saldo_actual = GREATEST(0, ss.saldo_actual - t.cantidad),
    ss.fecha_saldoactual = NOW();
END//
DELIMITER ;

-- =====================================================================================
-- PEDIDO_DETALLE: descontar saldo por detalle de factura emitida (mov_contable + detalle)
-- =====================================================================================

DROP PROCEDURE IF EXISTS `salidaspedidos`;
DELIMITER //
CREATE PROCEDURE `salidaspedidos`(
  IN p_tipo_documento varchar(3),
  IN p_numero_documento numeric(12,0)
)
proc: BEGIN
  UPDATE pedido_detalle pd
  JOIN (
    SELECT
      mc.codigo_pedido,
      mcd.codigo_producto,
      SUM(mcd.cantidad) AS cantidad
    FROM mov_contable mc
    JOIN mov_contable_detalle mcd
      ON mcd.tipo_documento = mc.tipo_documento
     AND mcd.numero_documento = mc.numero_documento
    WHERE mc.tipo_documento = p_tipo_documento
      AND mc.numero_documento = p_numero_documento
      AND mc.codigo_pedido IS NOT NULL
    GROUP BY mc.codigo_pedido, mcd.codigo_producto
  ) t
    ON t.codigo_pedido = pd.codigo_pedido
   AND t.codigo_producto = pd.codigo_producto
  SET
    pd.saldo = GREATEST(0, pd.saldo - t.cantidad);
END//
DELIMITER ;

-- Ejemplo editable:
-- CALL aplicar_salida_factura_a_saldo_stock('FAC', 123);
-- CALL salidasinventario('FAC', 123);

DROP PROCEDURE IF EXISTS `get_cuentasbancarias`;
DELIMITER //
CREATE PROCEDURE `get_cuentasbancarias`()
BEGIN
  SELECT `codigo_cuentabancaria`, `nombre`, `banco`
  FROM `cuentas_bancarias`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `actualizarsaldosclientes`;
DELIMITER //
CREATE PROCEDURE `actualizarsaldosclientes`(
  IN p_codigo_cliente numeric(12,0),
  IN p_tipo_documento varchar(3),
  IN p_monto numeric(12,2)
)
BEGIN
  DECLARE v_delta numeric(12,2);

  SET v_delta = CASE
    WHEN p_tipo_documento IN ('F','FAC') THEN p_monto
    WHEN p_tipo_documento IN ('RC','REC') THEN -p_monto
    ELSE p_monto
  END;

  IF EXISTS (
    SELECT 1
    FROM saldos_clientes
    WHERE codigo_cliente = p_codigo_cliente
  ) THEN
    UPDATE saldos_clientes
      SET saldo_final = saldo_final + v_delta,
          fecha_actualizado = CURRENT_TIMESTAMP
    WHERE codigo_cliente = p_codigo_cliente;
  ELSE
    INSERT INTO saldos_clientes (
      codigo_cliente,
      fecha_inicio,
      saldo_inicial,
      fecha_actualizado,
      saldo_final
    ) VALUES (
      p_codigo_cliente,
      CURRENT_TIMESTAMP,
      v_delta,
      CURRENT_TIMESTAMP,
      v_delta
    );
  END IF;
END//
DELIMITER ;



DROP PROCEDURE IF EXISTS `get_proveedores`;
DELIMITER //
CREATE PROCEDURE `get_proveedores`()
BEGIN
  SELECT `codigo_provedor`, `nombre`
  FROM `provedores`;
END//
DELIMITER ;


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


DROP PROCEDURE IF EXISTS get_paquetes_por_estado;
DROP PROCEDURE IF EXISTS cambiar_estado_paquete;

DELIMITER //
CREATE PROCEDURE get_paquetes_por_estado(IN p_estado varchar(30))
BEGIN
  SELECT
    p.codigo_paquete,
    p.estado,
    p.fecha_registro,
    mc.codigo_cliente,
    c.nombre AS nombre_cliente,
    mc.ubigeo,
    pe.region_entrega,
    mc.codigo_puntoentrega
  FROM paquete p
  LEFT JOIN mov_contable mc
    ON mc.numero_documento = p.codigo_paquete
    AND mc.tipo_documento = 'F'
  LEFT JOIN clientes c
    ON c.codigo_cliente = mc.codigo_cliente
  LEFT JOIN puntos_entrega pe
    ON pe.codigo_puntoentrega = mc.codigo_puntoentrega
    AND pe.ubigeo = mc.ubigeo
  WHERE p.estado = p_estado
  ORDER BY p.fecha_registro DESC, p.codigo_paquete DESC;
END//
DELIMITER ;


DELIMITER //
CREATE PROCEDURE cambiar_estado_paquete(IN p_codigo_paquete numeric(12,0), IN p_estado varchar(30))
BEGIN
  UPDATE paquete
  SET estado = p_estado,
      fecha_actualizado = NOW()
  WHERE codigo_paquete = p_codigo_paquete;
END//

DELIMITER ;
