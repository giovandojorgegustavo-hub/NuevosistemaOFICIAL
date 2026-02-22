DROP EVENT cerrar_base_horarios_diario;

DELIMITER $$

CREATE EVENT cerrar_base_horarios_diario
ON SCHEDULE
    EVERY 1 DAY
    STARTS (CURRENT_DATE + INTERVAL 1 DAY) + INTERVAL 23 HOUR + INTERVAL 30 MINUTE
DO
BEGIN
    UPDATE base_horarios
    SET estado = 'C'
    WHERE codigo_base >0 ;
END$$

DELIMITER ;

SHOW EVENTS;