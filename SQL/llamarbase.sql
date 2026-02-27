DROP PROCEDURE IF EXISTS `get_bases`;
DELIMITER //
CREATE PROCEDURE `get_bases`()
BEGIN
  SELECT `codigo_base`, `nombre`
  FROM `bases`;
END//
DELIMITER ;

DROP FUNCTION IF EXISTS get_hr_apertura;
DELIMITER //
CREATE FUNCTION `get_hr_apertura`(
    p_codigo_base DECIMAL(12,0),
    p_fecha_pedido DATETIME
) RETURNS datetime
    DETERMINISTIC
BEGIN
    DECLARE v_hr_apertura DATETIME;
    DECLARE v_dia INT;

    SET v_dia = WEEKDAY(p_fecha_pedido) + 1;

    SELECT bh.hr_apertura
    INTO v_hr_apertura
    FROM base_horarios bh
    WHERE bh.codigo_base = p_codigo_base
      AND bh.dia = v_dia
      AND bh.hr_apertura >= p_fecha_pedido
    ORDER BY bh.hr_apertura
    LIMIT 1;

    IF v_hr_apertura IS NULL THEN
        SELECT bh.hr_apertura
        INTO v_hr_apertura
        FROM base_horarios bh
        WHERE bh.codigo_base = p_codigo_base
          AND bh.dia > v_dia
        ORDER BY bh.dia, bh.hr_apertura
        LIMIT 1;
    END IF;

    IF v_hr_apertura IS NULL THEN
        SELECT bh.hr_apertura
        INTO v_hr_apertura
        FROM base_horarios bh
        WHERE bh.codigo_base = p_codigo_base
          AND bh.dia < v_dia
        ORDER BY bh.dia, bh.hr_apertura
        LIMIT 1;
    END IF;

    RETURN v_hr_apertura;
END//
DELIMITER ;

DROP FUNCTION IF EXISTS get_reserva;
DELIMITER //
CREATE FUNCTION `get_reserva`(
    p_codigo_base DECIMAL(12,0),
    p_codigo_producto DECIMAL(12,0)
) RETURNS int
    DETERMINISTIC
BEGIN
    DECLARE v_reserva INT;

    SELECT IFNULL(SUM(mcd.cantidad), 0)
    INTO v_reserva
    FROM paquete p
    INNER JOIN mov_contable_detalle mcd
        ON mcd.tipo_documento = p.tipo_documento
       AND mcd.numero_documento = p.codigo_paquete
    INNER JOIN mov_contable mc
        ON mc.tipo_documento = mcd.tipo_documento
       AND mc.numero_documento = mcd.numero_documento
    WHERE p.tipo_documento = 'FAC'
      AND p.estado = 'pendiente empacar'
      AND mc.codigo_base = p_codigo_base
      AND mcd.codigo_producto = p_codigo_producto;

    RETURN v_reserva;
END//
DELIMITER ;

DROP PROCEDURE IF EXISTS get_bases_candidatas;
DELIMITER //
CREATE PROCEDURE get_bases_candidatas(
  IN p_vProdFactura JSON,
  IN vFechaPedido datetime
)
BEGIN
  DROP TEMPORARY TABLE IF EXISTS tmp_vProdFactura;

  CREATE TEMPORARY TABLE tmp_vProdFactura (
    vFProducto DECIMAL(12,0),
    vFCantidadProducto INT,
    vFPrecioTotal DECIMAL(12,2)
  );

  INSERT INTO tmp_vProdFactura (
    vFProducto,
    vFCantidadProducto,
    vFPrecioTotal
  )
  SELECT
    jt.vFProducto,
    jt.vFCantidadProducto,
    jt.vFPrecioTotal
  FROM JSON_TABLE(
    p_vProdFactura,
    '$[*]'
    COLUMNS (
      vFProducto DECIMAL(12,0) PATH '$.vFProducto',
      vFCantidadProducto INT PATH '$.vFCantidadProducto',
      vFPrecioTotal DECIMAL(12,2) PATH '$.vFPrecioTotal'
    )
  ) AS jt;

  SELECT
    S.codigo_base,
    B.latitud,
    B.longitud
  FROM tmp_vProdFactura P
  JOIN saldo_stock S
    ON P.vFProducto = S.codigo_producto
  JOIN bases B
    ON B.codigo_base = S.codigo_base
  JOIN base_horarios H
    ON H.codigo_base = S.codigo_base
    AND H.dia = WEEKDAY(vFechaPedido) + 1
    AND H.hr_apertura = get_hr_apertura(S.codigo_base, vFechaPedido)
    AND H.cantidad_pedidos < H.maximo_pedidos
--    AND H.estado = 'A'
  WHERE S.saldo_actual - get_reserva(S.codigo_base, P.vFProducto)
    >= P.vFCantidadProducto
  GROUP BY
    S.codigo_base,
    B.latitud,
    B.longitud
  HAVING
    COUNT(DISTINCT S.codigo_producto) =
    (SELECT COUNT(*) FROM tmp_vProdFactura);
END//
DELIMITER ;
