USE erpdb;

-- =====================================================================================
-- MODULO 0: LOGIN
-- =====================================================================================

DROP PROCEDURE IF EXISTS log_sesion;
DROP PROCEDURE IF EXISTS log_intento_fallido;
DROP PROCEDURE IF EXISTS log_traza_sesion;
DROP PROCEDURE IF EXISTS log_error;

DELIMITER //

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

-- -----------------------------------------------------------------------------
-- ULTIMO COSTO POR PRODUCTO (detalle_mov_contable_prov)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS get_ultimo_costo_producto;
DELIMITER //
CREATE PROCEDURE `get_ultimo_costo_producto`(
  IN p_codigo_producto numeric(12,0)
)
BEGIN
  SELECT
    (d.monto / NULLIF(d.cantidad, 0)) AS costo_unitario,
    d.tipo_documento_compra,
    d.num_documento_compra,
    d.codigo_provedor,
    d.ordinal,
    m.fecha
  FROM detalle_mov_contable_prov d
  JOIN mov_contable_prov m
    ON m.tipo_documento_compra = d.tipo_documento_compra
   AND m.num_documento_compra = d.num_documento_compra
   AND m.codigo_provedor = d.codigo_provedor
  WHERE d.codigo_producto = p_codigo_producto
  ORDER BY m.fecha DESC, d.num_documento_compra DESC, d.ordinal DESC
  LIMIT 1;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS validar_credenciales_usuario;
DELIMITER //
CREATE PROCEDURE validar_credenciales_usuario(IN p_usuario varchar(128), IN p_password varchar(255))
BEGIN
  SELECT u.codigo_usuario, u.nombre
  FROM usuarios u
  WHERE (u.codigo_usuario COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci
    OR u.nombre COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci
    OR CAST(u.numero AS CHAR) COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci)
    AND u.password COLLATE utf8mb4_unicode_ci = p_password COLLATE utf8mb4_unicode_ci
  LIMIT 1;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS get_usecases_usuario;
DELIMITER //
CREATE PROCEDURE get_usecases_usuario(IN p_usuario varchar(128))
BEGIN
  SELECT DISTINCT
    m.codigo_modulo,
    m.descripcion,
    m.caption,
    u.codigo_usecase,
    u.caption,
    u.linktolaunch
  FROM usuarios usr
  JOIN usuarios_perfiles up ON up.codigo_usuario = usr.codigo_usuario
  JOIN perfiles_ucases pu ON pu.codigo_perfil = up.codigo_perfil
  JOIN usecases u ON u.codigo_usecase = pu.codigo_usecase
  LEFT JOIN modulo_usecases mu ON mu.codigo_usecase = u.codigo_usecase
  LEFT JOIN modulos m ON m.codigo_modulo = mu.codigo_modulo
  WHERE usr.codigo_usuario COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci
    OR usr.nombre COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci
    OR CAST(usr.numero AS CHAR) COLLATE utf8mb4_unicode_ci = p_usuario COLLATE utf8mb4_unicode_ci;
END//
DELIMITER ;

-- =====================================================================================
-- MODULO 1: CONSULTAS (LECTURA)
-- =====================================================================================

DROP PROCEDURE IF EXISTS `get_proveedores_saldos_pendientes`;
DELIMITER //
CREATE PROCEDURE `get_proveedores_saldos_pendientes`()
BEGIN
  SELECT
    p.codigo_provedor,
    p.nombre,
    sp.saldo_final
  FROM saldos_provedores sp
  INNER JOIN provedores p
    ON p.codigo_provedor = sp.codigo_provedor
  WHERE sp.saldo_final > 0
  ORDER BY sp.saldo_final DESC, p.nombre;
END//

DELIMITER ;

-- VIAJES: buscar viaje activo por numero de documento

DROP PROCEDURE IF EXISTS get_viaje_por_documento;
DELIMITER //
CREATE PROCEDURE get_viaje_por_documento(IN p_numero_documento numeric(12,0))
BEGIN
  SELECT
    v.codigoviaje,
    b.nombre AS nombrebase,
    v.nombre_motorizado,
    v.numero_wsp,
    v.num_llamadas,
    v.num_yape,
    v.link,
    v.observacion,
    v.fecha
  FROM detalleviaje dv
  JOIN viajes v
    ON v.codigoviaje = dv.codigoviaje
  JOIN bases b
    ON b.codigo_base = v.codigo_base
  WHERE dv.fecha_fin IS NULL
    AND dv.numero_documento = p_numero_documento
  LIMIT 1;
END//
DELIMITER ;

-- CONSULTA: detalle de mov_contable por tipo y numero de documento

DROP PROCEDURE IF EXISTS `get_mov_contable_detalle`;
DELIMITER //
CREATE PROCEDURE `get_mov_contable_detalle`(
  IN p_tipo_documento varchar(3),
  IN p_numero_documento numeric(12,0)
)
BEGIN
  SELECT
    mcd.tipo_documento,
    mcd.numero_documento,
    mcd.ordinal,
    mcd.codigo_producto,
    p.nombre AS nombre_producto,
    mcd.cantidad,
    mcd.saldo,
    mcd.precio_total
  FROM mov_contable_detalle mcd
  JOIN productos p
    ON p.codigo_producto = mcd.codigo_producto
  WHERE mcd.tipo_documento = p_tipo_documento
    AND mcd.numero_documento = p_numero_documento
  ORDER BY mcd.ordinal;
END//
DELIMITER ;



DROP PROCEDURE IF EXISTS get_paquetes_por_estado;
DELIMITER //
CREATE PROCEDURE get_paquetes_por_estado(IN p_estado varchar(30))
BEGIN
  SELECT
    p.codigo_paquete,
    p.fecha_actualizado,
    mc.codigo_cliente,
    c.nombre AS nombre_cliente,
    c.numero AS num_cliente,
    mc.codigo_puntoentrega,
    mc.codigo_base,
    b.nombre AS nombre_base,
    mc.codigo_packing,
    pk.nombre AS nombre_packing,
    mc.ordinal_numrecibe,
    pe.concatenarpuntoentrega,
    pe.region_entrega,
    pe.latitud,
    pe.longitud,
    nr.concatenarnumrecibe
  FROM paquete p
  LEFT JOIN mov_contable mc
    ON mc.numero_documento = p.codigo_paquete
    AND mc.tipo_documento = p.tipo_documento
  LEFT JOIN clientes c
    ON c.codigo_cliente = mc.codigo_cliente
  LEFT JOIN bases b
    ON b.codigo_base = mc.codigo_base
  LEFT JOIN packing pk
    ON pk.codigo_packing = mc.codigo_packing
  LEFT JOIN numrecibe nr
    ON nr.codigo_cliente_numrecibe = mc.codigo_cliente_numrecibe
    AND nr.ordinal_numrecibe = mc.ordinal_numrecibe
  LEFT JOIN puntos_entrega pe
    ON pe.codigo_puntoentrega = mc.codigo_puntoentrega
    AND pe.codigo_cliente_puntoentrega = mc.codigo_cliente_puntoentrega
  WHERE p.estado = p_estado
  ORDER BY p.fecha_registro DESC, p.codigo_paquete DESC;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_clientes`;
DELIMITER //
CREATE PROCEDURE `get_clientes`()
BEGIN
  SELECT `codigo_cliente`, `nombre`, `numero`
  FROM `clientes`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS get_clientes_saldo_pendiente;
DELIMITER //
CREATE PROCEDURE get_clientes_saldo_pendiente()
BEGIN
  SELECT
    c.codigo_cliente,
    c.nombre,
    ABS(sc.saldo_final) AS saldo_final
  FROM saldos_clientes sc
  INNER JOIN clientes c
    ON c.codigo_cliente = sc.codigo_cliente
  WHERE sc.saldo_final < 0
  ORDER BY ABS(sc.saldo_final) DESC, c.nombre;
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

-- Movidos a SQL/llamarbase.sql:
-- get_bases, get_hr_apertura, get_reserva, get_bases_candidatas

DROP PROCEDURE IF EXISTS `get_direccion_entrega`;
DELIMITER //
CREATE PROCEDURE `get_direccion_entrega`()
BEGIN
  SELECT
    pe.`latitud`,
    pe.`longitud`
  FROM `puntos_entrega` pe
  WHERE pe.`latitud` IS NOT NULL
    AND pe.`longitud` IS NOT NULL
    AND pe.`estado` = 'activo'
  ORDER BY pe.`created_at` DESC, pe.`codigo_puntoentrega` DESC
  LIMIT 1;
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

DROP PROCEDURE IF EXISTS get_packingporbase;
DELIMITER $$

CREATE PROCEDURE get_packingporbase(IN p_codigo_base DECIMAL(12,0))
BEGIN
  SELECT
    p.codigo_packing,
    p.nombre,
    p.tipo,
    p.descripcion
  FROM basespacking bp
  INNER JOIN packing p
    ON p.codigo_packing = bp.codigo_packing
  WHERE p_codigo_base IS NULL
     OR bp.codigo_base = p_codigo_base
  ORDER BY p.nombre, p.codigo_packing;
END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS `get_puntos_entrega`;
DELIMITER //
CREATE PROCEDURE `get_puntos_entrega`(IN p_codigo_cliente numeric(12,0))
BEGIN
  SELECT
    u.`cod_dep`,
    u.`cod_prov`,
    u.`cod_dist`,
    u.`departamento`,
    u.`provincia`,
    u.`distrito`,
    u.`ubigeo` AS `ubigeo`,
    pe.`codigo_puntoentrega`,
    pe.`codigo_cliente_puntoentrega` AS `codigo_cliente`,
    pe.`region_entrega`,
    pe.`direccion_linea`,
    pe.`referencia`,
    pe.`nombre` AS `nombre`,
    pe.`dni` AS `dni`,
    pe.`agencia`,
    pe.`observaciones`,
    pe.`concatenarpuntoentrega`,
    pe.`latitud`,
    pe.`longitud`,
    pe.`estado`
  FROM `puntos_entrega` pe
  INNER JOIN `ubigeo` u
    ON u.`ubigeo` = pe.`ubigeo`
  WHERE pe.`codigo_cliente_puntoentrega` = p_codigo_cliente
  ORDER BY u.`cod_dep`, u.`cod_prov`, u.`cod_dist`, pe.`codigo_puntoentrega`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_ubigeo_departamentos`;
DELIMITER //
CREATE PROCEDURE `get_ubigeo_departamentos`()
BEGIN
  SELECT DISTINCT
    `cod_dep`,
    `departamento`
  FROM `ubigeo`
  ORDER BY `cod_dep`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_ubigeo_provincias`;
DELIMITER //
CREATE PROCEDURE `get_ubigeo_provincias`(IN p_cod_dep char(2))
BEGIN
  SELECT DISTINCT
    `cod_prov`,
    `provincia`
  FROM `ubigeo`
  WHERE `cod_dep` = p_cod_dep
  ORDER BY `cod_prov`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_ubigeo_distritos`;
DELIMITER //
CREATE PROCEDURE `get_ubigeo_distritos`(IN p_cod_dep char(2), IN p_cod_prov char(2))
BEGIN
  SELECT DISTINCT
    `cod_dist`,
    `distrito`
  FROM `ubigeo`
  WHERE `cod_dep` = p_cod_dep
    AND `cod_prov` = p_cod_prov
  ORDER BY `cod_dist`;
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
    `nombre`,
    `concatenarnumrecibe`
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
    c.nombre AS nombre_cliente,
    c.numero AS numero_cliente,
    p.fecha,
    p.created_at
  FROM pedidos p
  JOIN clientes c
    ON c.codigo_cliente = p.codigo_cliente
  JOIN pedido_detalle pd
    ON pd.codigo_pedido = p.codigo_pedido
  WHERE pd.saldo > 0
  ORDER BY p.fecha DESC, p.codigo_pedido DESC;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_cuentasbancarias`;
DELIMITER //
CREATE PROCEDURE `get_cuentasbancarias`()
BEGIN
  SELECT `codigo_cuentabancaria`, `nombre`, `banco`
  FROM `cuentas_bancarias`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_etiquetas_gastos`;
DELIMITER //
CREATE PROCEDURE `get_etiquetas_gastos`()
BEGIN
  SELECT `codigoetiquetagasto`, `nombre`
  FROM `etiquetagastos`;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `get_etiquetas_retiro`;
DELIMITER //
CREATE PROCEDURE `get_etiquetas_retiro`()
BEGIN
  SELECT `codigoetiquetaretiro`, `nombre`
  FROM `etiqueta_retiro`;
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

DROP PROCEDURE IF EXISTS `get_facturascompras_pendientes`;
DELIMITER //
CREATE PROCEDURE `get_facturascompras_pendientes`()
BEGIN
  SELECT DISTINCT
    m.tipo_documento_compra,
    m.num_documento_compra,
    m.codigo_provedor,
    p.nombre AS nombre_provedor,
    m.fecha
  FROM mov_contable_prov m
  JOIN detalle_mov_contable_prov d
    ON d.tipo_documento_compra = m.tipo_documento_compra
   AND d.num_documento_compra = m.num_documento_compra
   AND d.codigo_provedor = m.codigo_provedor
  JOIN provedores p
    ON p.codigo_provedor = m.codigo_provedor
  WHERE m.tipo_documento_compra = 'FCC'
    AND d.cantidad_entregada < d.cantidad
  ORDER BY m.fecha DESC, m.num_documento_compra DESC;
END//
DELIMITER ;



DROP PROCEDURE IF EXISTS `get_detalle_compra_por_documento`;
DELIMITER //
CREATE PROCEDURE `get_detalle_compra_por_documento`(
  IN p_tipo_documento_compra varchar(3),
  IN p_num_documento_compra numeric(12,0),
  IN p_codigo_provedor numeric(12,0)
)
BEGIN
  SELECT
    d.ordinal,
    d.codigo_producto,
    pr.nombre AS nombre_producto,
    d.cantidad,
    d.cantidad_entregada AS cantidad_entregada,
    (d.cantidad - d.cantidad_entregada) AS saldo
  FROM detalle_mov_contable_prov d
  JOIN productos pr
    ON pr.codigo_producto = d.codigo_producto
  WHERE d.tipo_documento_compra = p_tipo_documento_compra
    AND d.num_documento_compra = p_num_documento_compra
    AND d.codigo_provedor = p_codigo_provedor
  ORDER BY d.ordinal;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS `get_pedido_detalle_por_pedido`;
DELIMITER //
CREATE PROCEDURE `get_pedido_detalle_por_pedido`(IN p_codigo_pedido numeric(12,0))
BEGIN
  SELECT
    pd.codigo_producto,
    pr.nombre AS nombre_producto,
    pd.saldo,
    CASE
      WHEN pd.cantidad = 0 THEN 0
      ELSE pd.precio_total / pd.cantidad
    END AS precio_unitario
  FROM pedido_detalle pd
  JOIN productos pr
    ON pr.codigo_producto = pd.codigo_producto
  WHERE pd.codigo_pedido = p_codigo_pedido
  ORDER BY pd.ordinal;
END//
DELIMITER ;


 
-- =====================================================================================
-- MODULO 2: PROCEDIMIENTOS ACTUALIZADORES - BANCOS
-- =====================================================================================
-- Actualizar el banco
DROP PROCEDURE IF EXISTS `aplicar_operacion_bancaria`;
DELIMITER //
CREATE PROCEDURE `aplicar_operacion_bancaria`(
  IN p_tipodocumento varchar(3),
  IN p_numdocumento numeric(12,0)
)
BEGIN
  DECLARE v_monto numeric(12,2);
  DECLARE v_cuenta_origen numeric(12,0);
  DECLARE v_cuenta_destino numeric(12,0);

  SELECT monto, codigo_cuentabancaria, codigo_cuentabancaria_destino
    INTO v_monto, v_cuenta_origen, v_cuenta_destino
  FROM mov_operaciones_contables
  WHERE tipodocumento = p_tipodocumento
    AND numdocumento = p_numdocumento;

  IF p_tipodocumento IN ('TRS', 'RCC', 'RET') THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual - v_monto,
        fecha_saldo_actual = CURRENT_TIMESTAMP
    WHERE codigo_cuentabancaria = v_cuenta_origen;
  ELSEIF p_tipodocumento IN ('TRE', 'RCP', 'AJC') THEN
    UPDATE cuentas_bancarias
    SET saldo_actual = saldo_actual + v_monto,
        fecha_saldo_actual = CURRENT_TIMESTAMP
    WHERE codigo_cuentabancaria = v_cuenta_origen;
  END IF;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `aplicar_gasto_bancario`;
DELIMITER //
CREATE PROCEDURE `aplicar_gasto_bancario`(
  IN p_tipodocumento varchar(3),
  IN p_numdocumento numeric(12,0)
)
BEGIN
  DECLARE v_monto numeric(12,2);
  DECLARE v_cuenta numeric(12,0);

  SELECT monto, codigo_cuentabancaria
    INTO v_monto, v_cuenta
  FROM mov_contable_gasto
  WHERE tipodocumento = p_tipodocumento
    AND numdocumento = p_numdocumento;

  UPDATE cuentas_bancarias
  SET saldo_actual = saldo_actual - v_monto,
      fecha_saldo_actual = CURRENT_TIMESTAMP
  WHERE codigo_cuentabancaria = v_cuenta;
END//
DELIMITER ;


-- =====================================================================================
-- MODULO 2: PROCEDIMIENTOS ACTUALIZADORES
-- =====================================================================================

-- -----------------------------------------------------------------------------
-- GRUPO: COMPRA - detalle_mov_contable_prov (cantidad_entregada) GESTION DE COMPRAS
-- -----------------------------------------------------------------------------
-- Aumentar Entregas y Saldos a factura de Compra

DROP PROCEDURE IF EXISTS `aplicar_entrega_compra`;
DELIMITER //
CREATE PROCEDURE `aplicar_entrega_compra`(
  IN p_tipo_documento_compra varchar(3),
  IN p_num_documento_compra numeric(12,0),
  IN p_codigo_provedor numeric(12,0),
  IN p_ordinal numeric(12,0),
  IN p_cantidad_entregada numeric(12,3)
)
BEGIN
  UPDATE detalle_mov_contable_prov
  SET cantidad_entregada = LEAST(cantidad, GREATEST(0, cantidad_entregada + p_cantidad_entregada)),
      saldo = LEAST(cantidad, GREATEST(0, saldo + p_cantidad_entregada))
  WHERE tipo_documento_compra = p_tipo_documento_compra
    AND num_documento_compra = p_num_documento_compra
    AND codigo_provedor = p_codigo_provedor
    AND ordinal = p_ordinal;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- GRUPO: SALDO_STOCK (tabla saldo_stock)
-- -----------------------------------------------------------------------------

-- STOCK: actualiza saldo_stock por base y producto
DROP PROCEDURE IF EXISTS upd_stock_bases;
DELIMITER //
CREATE PROCEDURE `upd_stock_bases`(
  IN p_codigo_base numeric(12,0),
  IN p_codigo_producto numeric(12,0),
  IN p_cantidad numeric(12,3),
  IN p_tipodocumento varchar(3),
  IN p_numdocumento numeric(12,0)
)
BEGIN
  DECLARE v_cantidad numeric(12,3);

  SET v_cantidad = p_cantidad;

  IF p_tipodocumento IN ('FAC', 'FBI', 'TRS', 'AJS') THEN
    SET v_cantidad = v_cantidad * -1;
  ELSEIF p_tipodocumento IN ('FBS', 'FBF', 'TRE', 'REM', 'NTC', 'AJE') THEN
    SET v_cantidad = v_cantidad;
  ELSE
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tipo de documento no soportado para upd_stock_bases.';
  END IF;

  UPDATE saldo_stock
  SET
    saldo_actual = saldo_actual + v_cantidad,
    fecha_saldoactual = NOW()
  WHERE codigo_base = p_codigo_base
    AND codigo_producto = p_codigo_producto;

  IF ROW_COUNT() = 0 THEN
    INSERT INTO saldo_stock (
      codigo_base,
      codigo_producto,
      saldo_actual,
      saldo_inicial,
      fecha_saldoinicial,
      fecha_saldoactual
    )
    VALUES (
      p_codigo_base,
      p_codigo_producto,
      v_cantidad,
      v_cantidad,
      NOW(),
      NOW()
    );
  END IF;
END//
DELIMITER ;


-- -----------------------------------------------------------------------------
-- GRUPO: SALDO_PEDIDOS (tabla pedido_detalle.saldo)
-- -----------------------------------------------------------------------------

-- PEDIDO_DETALLE: descontar saldo por detalle de factura emitida (mov_contable + detalle)


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

-- -----------------------------------------------------------------------------
-- GRUPO: SALDOS_CLIENTES (tabla saldos_clientes)
-- -----------------------------------------------------------------------------

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
    WHEN p_tipo_documento IN ('F','FAC') THEN -p_monto
    WHEN p_tipo_documento IN ('RCP','RCC') THEN p_monto
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

-- -----------------------------------------------------------------------------
-- GRUPO: RECIBOS CLIENTE -> FACTURAS_PAGADAS + saldo en mov_contable
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `aplicar_recibo_a_facturas`;
DELIMITER //
CREATE PROCEDURE `aplicar_recibo_a_facturas`(
  IN p_codigo_cliente numeric(12,0),
  IN p_num_recibo numeric(12,0),
  IN p_monto numeric(12,2)
)
BEGIN
  DECLARE v_restante numeric(12,2);
  DECLARE v_tipo_doc varchar(3);
  DECLARE v_num_doc numeric(12,0);
  DECLARE v_saldo numeric(12,2);
  DECLARE v_usar numeric(12,2);
  DECLARE done int DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT tipo_documento, numero_documento, saldo
    FROM mov_contable
    WHERE codigo_cliente = p_codigo_cliente
      AND tipo_documento = 'FAC'
      AND saldo > 0
    ORDER BY fecha_emision DESC, numero_documento DESC;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET v_restante = p_monto;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_doc, v_num_doc, v_saldo;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    IF v_restante <= 0 THEN
      LEAVE read_loop;
    END IF;

    SET v_usar = IF(v_saldo >= v_restante, v_restante, v_saldo);

    UPDATE mov_contable
      SET saldo = saldo - v_usar
    WHERE tipo_documento = v_tipo_doc
      AND numero_documento = v_num_doc;

    INSERT INTO Facturas_Pagadas
      (tipodocumento, numdocumento, tipo_documento_cli, numero_documento_cli, monto_pagado)
    VALUES
      ('RCP', p_num_recibo, v_tipo_doc, v_num_doc, v_usar);

    SET v_restante = v_restante - v_usar;
  END LOOP;
  CLOSE cur;

  UPDATE mov_contable
    SET saldo = v_restante
  WHERE tipo_documento = 'RCP'
    AND numero_documento = p_num_recibo;

END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `revertir_pagos_factura_cliente`;
DELIMITER //
CREATE PROCEDURE `revertir_pagos_factura_cliente`(
  IN p_tipo_fac varchar(3),
  IN p_num_fac numeric(12,0)
)
BEGIN
  DECLARE done int DEFAULT 0;
  DECLARE v_tipo_pago varchar(3);
  DECLARE v_num_pago numeric(12,0);
  DECLARE v_monto numeric(12,2);

  DECLARE cur CURSOR FOR
    SELECT
      tipodocumento,
      numdocumento,
      SUM(monto_pagado) AS monto_pagado
    FROM Facturas_Pagadas
    WHERE tipo_documento_cli = p_tipo_fac
      AND numero_documento_cli = p_num_fac
    GROUP BY tipodocumento, numdocumento;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_pago, v_num_pago, v_monto;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    UPDATE mov_contable
      SET saldo = saldo + v_monto
    WHERE tipo_documento = v_tipo_pago
      AND numero_documento = v_num_pago;
  END LOOP;
  CLOSE cur;

  DELETE FROM Facturas_Pagadas
  WHERE tipo_documento_cli = p_tipo_fac
    AND numero_documento_cli = p_num_fac;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- GRUPO: RECIBOS PROVEDOR -> FACTURAS_PAGADAS_PROV + saldo en mov_contable_prov
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `aplicar_recibo_a_facturas_prov`;
DELIMITER //
CREATE PROCEDURE `aplicar_recibo_a_facturas_prov`(
  IN p_codigo_provedor numeric(12,0),
  IN p_num_recibo numeric(12,0),
  IN p_monto numeric(12,2)
)
BEGIN
  DECLARE v_restante numeric(12,2);
  DECLARE v_tipo_doc varchar(3);
  DECLARE v_num_doc numeric(12,0);
  DECLARE v_codigo_provedor_compra numeric(12,0);
  DECLARE v_saldo numeric(12,2);
  DECLARE v_usar numeric(12,2);
  DECLARE done int DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT tipo_documento_compra, num_documento_compra, codigo_provedor, saldo
    FROM mov_contable_prov
    WHERE codigo_provedor = p_codigo_provedor
      AND tipo_documento_compra = 'FCC'
      AND saldo > 0
    ORDER BY fecha DESC, num_documento_compra DESC;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET v_restante = p_monto;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_doc, v_num_doc, v_codigo_provedor_compra, v_saldo;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    IF v_restante <= 0 THEN
      LEAVE read_loop;
    END IF;

    SET v_usar = IF(v_saldo >= v_restante, v_restante, v_saldo);

    UPDATE mov_contable_prov
      SET saldo = saldo - v_usar
    WHERE tipo_documento_compra = v_tipo_doc
      AND num_documento_compra = v_num_doc
      AND codigo_provedor = p_codigo_provedor;

    INSERT INTO Facturas_Pagadas_Prov
      (
        tipo_documento_pago,
        num_documento_pago,
        codigo_provedor_pago,
        tipo_documento_compra,
        num_documento_compra,
        codigo_provedor_compra,
        monto_pagado
      )
    VALUES
      ('RCC', p_num_recibo, p_codigo_provedor, v_tipo_doc, v_num_doc, v_codigo_provedor_compra, v_usar);

    SET v_restante = v_restante - v_usar;
  END LOOP;
  CLOSE cur;

  UPDATE mov_contable_prov
    SET saldo = v_restante
  WHERE tipo_documento_compra = 'RCC'
    AND num_documento_compra = p_num_recibo
    AND codigo_provedor = p_codigo_provedor;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- GRUPO: SALDO A FAVOR CLIENTE (NTC/RCP -> FACTURA)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `get_saldo_favor_cliente`;
DELIMITER //
CREATE PROCEDURE `get_saldo_favor_cliente`(
  IN p_codigo_cliente numeric(12,0)
)
BEGIN
  SELECT
    tipo_documento,
    numero_documento,
    fecha_emision,
    saldo
  FROM mov_contable
  WHERE codigo_cliente = p_codigo_cliente
    AND tipo_documento IN ('NTC', 'RCP')
    AND saldo > 0
  ORDER BY CASE WHEN tipo_documento = 'NTC' THEN 0 ELSE 1 END,
           fecha_emision ASC,
           numero_documento ASC;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS `aplicar_saldo_favor_a_factura`;
DELIMITER //
CREATE PROCEDURE `aplicar_saldo_favor_a_factura`(
  IN p_codigo_cliente numeric(12,0),
  IN p_num_fac numeric(12,0),
  IN p_monto numeric(12,2)
)
proc: BEGIN
  DECLARE v_restante numeric(12,2);
  DECLARE v_saldo_fac numeric(12,2);
  DECLARE v_tipo_doc varchar(3);
  DECLARE v_num_doc numeric(12,0);
  DECLARE v_saldo_doc numeric(12,2);
  DECLARE v_usar numeric(12,2);
  DECLARE done int DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT tipo_documento, numero_documento, saldo
    FROM mov_contable
    WHERE codigo_cliente = p_codigo_cliente
      AND tipo_documento IN ('NTC', 'RCP')
      AND saldo > 0
    ORDER BY CASE WHEN tipo_documento = 'NTC' THEN 0 ELSE 1 END,
             fecha_emision ASC,
             numero_documento ASC;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    LEAVE proc;
  END IF;

  SELECT saldo
    INTO v_saldo_fac
  FROM mov_contable
  WHERE tipo_documento = 'FAC'
    AND numero_documento = p_num_fac
  FOR UPDATE;

  IF v_saldo_fac IS NULL OR v_saldo_fac <= 0 THEN
    LEAVE proc;
  END IF;

  SET v_restante = IF(v_saldo_fac >= p_monto, p_monto, v_saldo_fac);

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_doc, v_num_doc, v_saldo_doc;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;
    IF v_restante <= 0 THEN
      LEAVE read_loop;
    END IF;

    SET v_usar = IF(v_saldo_doc >= v_restante, v_restante, v_saldo_doc);

    UPDATE mov_contable
      SET saldo = saldo - v_usar
    WHERE tipo_documento = v_tipo_doc
      AND numero_documento = v_num_doc;

    UPDATE mov_contable
      SET saldo = saldo - v_usar
    WHERE tipo_documento = 'FAC'
      AND numero_documento = p_num_fac;

    INSERT INTO Facturas_Pagadas
      (tipodocumento, numdocumento, tipo_documento_cli, numero_documento_cli, monto_pagado)
    VALUES
      (v_tipo_doc, v_num_doc, 'FAC', p_num_fac, v_usar)
    ON DUPLICATE KEY UPDATE monto_pagado = monto_pagado + v_usar;

    SET v_restante = v_restante - v_usar;
  END LOOP;
  CLOSE cur;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- GRUPO: NOTA CREDITO -> FACTURAS_PAGADAS + saldo en mov_contable
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `aplicar_nota_credito_a_factura`;
DELIMITER //
CREATE PROCEDURE `aplicar_nota_credito_a_factura`(
  IN p_tipo_ntc varchar(3),
  IN p_num_ntc numeric(12,0),
  IN p_tipo_fac varchar(3),
  IN p_num_fac numeric(12,0),
  IN p_monto numeric(12,2)
)
proc: BEGIN
  DECLARE v_saldo_fac numeric(12,2);
  DECLARE v_aplicar numeric(12,2);

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_saldo_fac = NULL;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    LEAVE proc;
  END IF;

  SELECT saldo
    INTO v_saldo_fac
  FROM mov_contable
  WHERE tipo_documento = p_tipo_fac
    AND numero_documento = p_num_fac
  FOR UPDATE;

  IF v_saldo_fac IS NULL OR v_saldo_fac <= 0 THEN
    LEAVE proc;
  END IF;

  SET v_aplicar = IF(v_saldo_fac >= p_monto, p_monto, v_saldo_fac);

  UPDATE mov_contable
    SET saldo = saldo - v_aplicar
  WHERE tipo_documento = p_tipo_fac
    AND numero_documento = p_num_fac;

  INSERT INTO Facturas_Pagadas
    (tipodocumento, numdocumento, tipo_documento_cli, numero_documento_cli, monto_pagado)
  VALUES
    (p_tipo_ntc, p_num_ntc, p_tipo_fac, p_num_fac, v_aplicar);

  UPDATE mov_contable
    SET saldo = saldo - v_aplicar
  WHERE tipo_documento = p_tipo_ntc
    AND numero_documento = p_num_ntc;
END//
DELIMITER ;

-- -----------------------------------------------------------------------------
-- GRUPO: SALDOS_PROVEDORES (tabla saldos_provedores)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `actualizarsaldosprovedores`;
DELIMITER //
CREATE PROCEDURE `actualizarsaldosprovedores`(
  IN p_codigo_provedor numeric(12,0),
  IN p_tipo_documento_compra varchar(3),
  IN p_monto numeric(12,2)
)
BEGIN
  DECLARE v_delta numeric(12,2);

  SET v_delta = CASE
    WHEN p_tipo_documento_compra = 'FCC' THEN p_monto
    WHEN p_tipo_documento_compra = 'RCP' THEN -p_monto
    WHEN p_tipo_documento_compra = 'RCC' THEN -p_monto
    WHEN p_tipo_documento_compra = 'NDC' THEN -p_monto
    WHEN p_tipo_documento_compra = 'NCC' THEN p_monto
    ELSE p_monto
  END;

  IF EXISTS (
    SELECT 1
    FROM saldos_provedores
    WHERE codigo_provedor = p_codigo_provedor
  ) THEN
    UPDATE saldos_provedores
      SET saldo_final = saldo_final + v_delta,
          fecha_actualizado = CURRENT_TIMESTAMP
    WHERE codigo_provedor = p_codigo_provedor;
  ELSE
    INSERT INTO saldos_provedores (
      codigo_provedor,
      fecha_inicio,
      saldo_inicial,
      fecha_actualizado,
      saldo_final
    ) VALUES (
      p_codigo_provedor,
      CURRENT_TIMESTAMP,
      v_delta,
      CURRENT_TIMESTAMP,
      v_delta
    );
  END IF;
END//
DELIMITER ;



DROP PROCEDURE IF EXISTS cambiar_estado_paquete;
DELIMITER //
CREATE PROCEDURE cambiar_estado_paquete(IN p_codigo_paquete numeric(12,0), IN p_estado varchar(30))
BEGIN
  DECLARE v_estado_actual varchar(30);

  SELECT estado
  INTO v_estado_actual
  FROM paquete
  WHERE codigo_paquete = p_codigo_paquete
  LIMIT 1;

  UPDATE paquete
  SET estado = p_estado,
      fecha_actualizado = NOW()
  WHERE codigo_paquete = p_codigo_paquete;

  -- Solo cambia estado; no aplica movimientos de stock aqui.
END//

DELIMITER ;

DROP PROCEDURE IF EXISTS get_actualizarbasespaquete;
DELIMITER //
CREATE PROCEDURE get_actualizarbasespaquete(
  IN p_tipo_documento varchar(3),
  IN p_numero_documento numeric(12,0),
  IN p_codigo_base_destino numeric(12,0)
)
BEGIN
  UPDATE mov_contable
  SET codigo_base = p_codigo_base_destino
  WHERE tipo_documento = p_tipo_documento
    AND numero_documento = p_numero_documento;
END//

DELIMITER ;

DROP PROCEDURE IF EXISTS aplicar_salida_partidas;
DELIMITER //
CREATE PROCEDURE aplicar_salida_partidas(
  IN p_tipo_documento_venta varchar(3),
  IN p_numero_documento numeric(12,0),
  IN p_codigo_producto numeric(12,0),
  IN p_cantidad numeric(12,3)
)
BEGIN
  DECLARE v_restante numeric(12,3);
  DECLARE v_tipo_compra varchar(3);
  DECLARE v_num_compra numeric(12,0);
  DECLARE v_codigo_provedor numeric(12,0);
  DECLARE v_ordinal numeric(12,0);
  DECLARE v_saldo numeric(12,3);
  DECLARE v_usar numeric(12,3); 
  DECLARE v_cantidad_compra numeric(12,3);
  DECLARE v_monto_compra numeric(12,2);
  DECLARE v_costo_unitario numeric(12,6);
  DECLARE v_monto_salida numeric(12,2);
  DECLARE done int DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT d.tipo_documento_compra,
           d.num_documento_compra,
           d.codigo_provedor,
           d.ordinal,
           d.saldo,
           d.cantidad,
           d.monto
    FROM detalle_mov_contable_prov d
    JOIN mov_contable_prov m
      ON m.tipo_documento_compra = d.tipo_documento_compra
     AND m.num_documento_compra = d.num_documento_compra
     AND m.codigo_provedor = d.codigo_provedor
    WHERE d.codigo_producto = p_codigo_producto
      AND d.saldo > 0
    ORDER BY m.fecha ASC,
             d.tipo_documento_compra,
             d.num_documento_compra,
             d.codigo_provedor,
             d.ordinal;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET v_restante = p_cantidad;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_compra, v_num_compra, v_codigo_provedor, v_ordinal, v_saldo, v_cantidad_compra, v_monto_compra;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    IF v_restante <= 0 THEN
      LEAVE read_loop;
    END IF;

    SET v_usar = IF(v_saldo >= v_restante, v_restante, v_saldo);
    SET v_costo_unitario = IF(v_cantidad_compra = 0, 0, v_monto_compra / v_cantidad_compra);
    SET v_monto_salida = v_usar * v_costo_unitario;

    UPDATE detalle_mov_contable_prov
      SET saldo = saldo - v_usar
    WHERE tipo_documento_compra = v_tipo_compra
      AND num_documento_compra = v_num_compra
      AND codigo_provedor = v_codigo_provedor
      AND ordinal = v_ordinal;

    INSERT INTO detalle_movs_partidas
      (tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_producto,
       tipo_documento_venta, numero_documento, cantidad, costo_unitario, monto)
    VALUES
      (v_tipo_compra, v_num_compra, v_codigo_provedor, p_codigo_producto,
       p_tipo_documento_venta, p_numero_documento, v_usar, v_costo_unitario, v_monto_salida);

    SET v_restante = v_restante - v_usar;
  END LOOP;
  CLOSE cur;

  IF v_restante > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Saldo insuficiente para cubrir cantidad solicitada.';
  END IF;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS aplicar_devolucion_partidas;
DELIMITER //
CREATE PROCEDURE aplicar_devolucion_partidas(
  IN p_tipo_documento_origen varchar(3),
  IN p_numero_documento_origen numeric(12,0),
  IN p_tipo_documento_devolucion varchar(3),
  IN p_numero_documento_devolucion numeric(12,0),
  IN p_codigo_producto numeric(12,0),
  IN p_cantidad numeric(12,3)
)
BEGIN
  DECLARE v_restante numeric(12,3);
  DECLARE v_tipo_compra varchar(3);
  DECLARE v_num_compra numeric(12,0);
  DECLARE v_codigo_provedor numeric(12,0);
  DECLARE v_cantidad_partida numeric(12,3);
  DECLARE v_monto_partida numeric(12,2);
  DECLARE v_costo_unitario numeric(12,6);
  DECLARE v_usar numeric(12,3);
  DECLARE v_monto_devol numeric(12,2);
  DECLARE done int DEFAULT 0;

  DECLARE cur CURSOR FOR
    SELECT d.tipo_documento_compra,
           d.num_documento_compra,
           d.codigo_provedor,
           d.cantidad,
           d.monto
    FROM detalle_movs_partidas d
    JOIN mov_contable_prov m
      ON m.tipo_documento_compra = d.tipo_documento_compra
     AND m.num_documento_compra = d.num_documento_compra
     AND m.codigo_provedor = d.codigo_provedor
    WHERE d.tipo_documento_venta = p_tipo_documento_origen
      AND d.numero_documento = p_numero_documento_origen
      AND d.codigo_producto = p_codigo_producto
    ORDER BY m.fecha DESC,
             d.tipo_documento_compra DESC,
             d.num_documento_compra DESC,
             d.codigo_provedor DESC;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET v_restante = p_cantidad;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_tipo_compra, v_num_compra, v_codigo_provedor, v_cantidad_partida, v_monto_partida;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    IF v_restante <= 0 THEN
      LEAVE read_loop;
    END IF;

    SET v_usar = IF(v_cantidad_partida >= v_restante, v_restante, v_cantidad_partida);
    SET v_costo_unitario = IF(v_cantidad_partida = 0, 0, v_monto_partida / v_cantidad_partida);
    SET v_monto_devol = v_usar * v_costo_unitario;

    UPDATE detalle_mov_contable_prov
      SET saldo = saldo + v_usar
    WHERE tipo_documento_compra = v_tipo_compra
      AND num_documento_compra = v_num_compra
      AND codigo_provedor = v_codigo_provedor
      AND codigo_producto = p_codigo_producto;

    INSERT INTO detalle_movs_partidas
      (tipo_documento_compra, num_documento_compra, codigo_provedor, codigo_producto,
       tipo_documento_venta, numero_documento, cantidad, costo_unitario, monto)
    VALUES
      (v_tipo_compra, v_num_compra, v_codigo_provedor, p_codigo_producto,
       p_tipo_documento_devolucion, p_numero_documento_devolucion, v_usar, v_costo_unitario, v_monto_devol);

    SET v_restante = v_restante - v_usar;
  END LOOP;
  CLOSE cur;

  IF v_restante > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cantidad excede partidas usadas en el documento origen.';
  END IF;
END//
DELIMITER ;


DROP PROCEDURE IF EXISTS aplicar_costo_fabricacion;
DELIMITER //
CREATE PROCEDURE aplicar_costo_fabricacion(
  IN p_tipo_doc_insumo varchar(3),
  IN p_num_doc_insumo numeric(12,0),
  IN p_tipo_doc_prod varchar(3),
  IN p_num_doc_prod numeric(12,0),
  IN p_codigo_provedor numeric(12,0)
)
BEGIN
  DECLARE v_total_insumos numeric(12,2);
  DECLARE v_total_gastos numeric(12,2);
  DECLARE v_total numeric(12,2);
  DECLARE v_total_cantidad numeric(12,3);
  DECLARE v_costo_unit numeric(12,6);

  SELECT COALESCE(SUM(monto), 0)
    INTO v_total_insumos
  FROM detalle_movs_partidas
  WHERE tipo_documento_venta = p_tipo_doc_insumo
    AND numero_documento = p_num_doc_insumo;

  SELECT COALESCE(SUM(g.monto), 0)
    INTO v_total_gastos
  FROM mov_contable_gasto g
  WHERE g.tipo_documento_compra = p_tipo_doc_prod
    AND g.num_documento_compra = p_num_doc_prod
    AND g.codigo_provedor = p_codigo_provedor;

  SET v_total = v_total_insumos + v_total_gastos;

  SELECT COALESCE(SUM(cantidad), 0)
    INTO v_total_cantidad
  FROM detalle_mov_contable_prov
  WHERE tipo_documento_compra = p_tipo_doc_prod
    AND num_documento_compra = p_num_doc_prod
    AND codigo_provedor = p_codigo_provedor;

  IF v_total_cantidad <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No hay cantidad producida para repartir costo.';
  END IF;

  SET v_costo_unit = v_total / v_total_cantidad;

  UPDATE detalle_mov_contable_prov
    SET monto = cantidad * v_costo_unit
  WHERE tipo_documento_compra = p_tipo_doc_prod
    AND num_documento_compra = p_num_doc_prod
    AND codigo_provedor = p_codigo_provedor;

  UPDATE mov_contable_prov
    SET monto = v_total
  WHERE tipo_documento_compra = p_tipo_doc_prod
    AND num_documento_compra = p_num_doc_prod
    AND codigo_provedor = p_codigo_provedor;
END//
DELIMITER ;



-- Procedimiento para obtener saldo del sistema por base y producto
-- Devuelve saldo_actual (0 si no existe registro)
