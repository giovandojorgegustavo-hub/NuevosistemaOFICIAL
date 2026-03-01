-- Procedimientos y funciones detectados en BD y no presentes en SQL/procedimientos.sql + SQL/llamarbase.sql
-- Incluye los que se pudieron recuperar desde Promts/PromtsERP/Consola/CU7001.md

DELIMITER $$

DROP PROCEDURE IF EXISTS `get_paquetes`$$
CREATE PROCEDURE `get_paquetes`(
  IN p_fecha DATETIME,
  IN p_usuario varchar(36)
)
BEGIN
   DECLARE v_codigo_base DECIMAL(12);
   DECLARE v_priv_bases varchar(36);

   CALL get_priv_usuario_cp(p_usuario, v_codigo_base, v_priv_bases);

   IF v_priv_bases = 'ALL' THEN
     SELECT
      p.codigo_paquete,
      p.tipo_documento,
      p.fecha_actualizado,
      p.fecha_registro,
      mc.codigo_cliente,
      c.nombre AS nombre_cliente,
      c.numero AS num_cliente,
      mc.codigo_puntoentrega,
      mc.codigo_base,
      get_turno(mc.codigo_base, p.fecha_registro) Turno,
      b.nombre AS nombre_base,
      mc.codigo_packing,
      pk.nombre AS nombre_packing,
      mc.ordinal_numrecibe,
      pe.concatenarpuntoentrega,
      pe.region_entrega,
      pe.latitud,
      pe.longitud,
      nr.concatenarnumrecibe,
      get_column_pktes(p.estado) columna
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
    WHERE date(p.fecha_registro) = date(p_fecha)
      OR (date(p.fecha_registro) <> date(p_fecha) AND p.estado NOT IN ('llegado', 'robado', 'perdido'))
    ORDER BY p.fecha_registro, p.codigo_paquete;
   ELSE
     SELECT
      p.codigo_paquete,
      p.tipo_documento,
      p.fecha_actualizado,
      p.fecha_registro,
      mc.codigo_cliente,
      c.nombre AS nombre_cliente,
      c.numero AS num_cliente,
      mc.codigo_puntoentrega,
      mc.codigo_base,
      get_turno(mc.codigo_base, p.fecha_registro) Turno,
      b.nombre AS nombre_base,
      mc.codigo_packing,
      pk.nombre AS nombre_packing,
      mc.ordinal_numrecibe,
      pe.concatenarpuntoentrega,
      pe.region_entrega,
      pe.latitud,
      pe.longitud,
      nr.concatenarnumrecibe,
      get_column_pktes(p.estado) columna
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
    WHERE (
      date(p.fecha_registro) = date(p_fecha)
      OR (date(p.fecha_registro) <> date(p_fecha) AND p.estado NOT IN ('llegado', 'robado', 'perdido'))
    )
      AND mc.codigo_base = v_codigo_base
    ORDER BY p.fecha_registro, p.codigo_paquete;
  END IF;
END$$

DROP PROCEDURE IF EXISTS `get_tablero`$$
CREATE PROCEDURE `get_tablero`(
  IN p_tablero VARCHAR(36)
)
BEGIN
  SELECT D.ordinal, D.titulo
  FROM tableros T
  JOIN tableros_detalle D ON T.id = D.id
  WHERE T.id = p_tablero;
END$$

DROP FUNCTION IF EXISTS `get_column_pktes`$$
CREATE FUNCTION `get_column_pktes`(p_estado VARCHAR(30)) RETURNS int
DETERMINISTIC
BEGIN
  RETURN CASE p_estado
    WHEN 'pendiente empacar' THEN 1
    WHEN 'empacado' THEN 2
    WHEN 'en camino' THEN 3
    WHEN 'standby' THEN 4
    WHEN 'llegado' THEN 5
    WHEN 'robado' THEN 6
    WHEN 'devuelto' THEN 6
    ELSE 0
  END;
END$$

DROP PROCEDURE IF EXISTS `get_productos_pkte`$$
CREATE PROCEDURE `get_productos_pkte`(
  IN p_tipodoc varchar(3),
  IN p_numdoc decimal(12)
)
BEGIN
  SELECT F.ordinal, P.nombre, F.cantidad
  FROM mov_contable_detalle F
  JOIN productos P ON F.codigo_producto = P.codigo_producto
  WHERE F.tipo_documento = p_tipodoc
    AND F.numero_documento = p_numdoc;
END$$

DROP FUNCTION IF EXISTS `get_turno`$$
CREATE FUNCTION `get_turno`(
  p_codigo_base DECIMAL(12),
  p_p_fecha DATETIME
) RETURNS time
DETERMINISTIC
BEGIN
  DECLARE v_turno TIME;
  SELECT TIME(get_hr_apertura(p_codigo_base, p_p_fecha)) INTO v_turno;
  RETURN v_turno;
END$$

DROP PROCEDURE IF EXISTS `get_usecase_link`$$
CREATE PROCEDURE `get_usecase_link`(
  IN p_codigo_usecase varchar(36)
)
BEGIN
  SELECT codigo_usecase, caption, linktolaunch, icono
  FROM usecases
  WHERE codigo_usecase = p_codigo_usecase;
END$$

DELIMITER ;
