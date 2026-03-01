-- Vistas detectadas en erpdb que no estan en SQL/tablas.sql, SQL/procedimientos.sql, SQL/llamarbase.sql

DROP VIEW IF EXISTS `Stock_xBase`;
DROP VIEW IF EXISTS `vAsistenciaBases`;
DROP VIEW IF EXISTS `vDeudaClientes`;
DROP VIEW IF EXISTS `vGananciasPerdidas`;
DROP VIEW IF EXISTS `vMovsContablesCliente`;
DROP VIEW IF EXISTS `vMovsxBase_ultimos7`;
DROP VIEW IF EXISTS `vOperaciones_resumen`;
DROP VIEW IF EXISTS `vSaldos_StockxBase`;
DROP VIEW IF EXISTS `vpaquetes`;

CREATE VIEW `Stock_xBase` AS
select `S`.`codigo_base` AS `codigo_base`,`B`.`nombre` AS `Base`,`S`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,`S`.`saldo_actual` AS `saldo_actual`,`get_reserva`(`S`.`codigo_base`,`S`.`codigo_producto`) AS `Reserva`,(`S`.`saldo_actual` - `get_reserva`(`S`.`codigo_base`,`S`.`codigo_producto`)) AS `SaldoDisponible`,`S`.`stock_minimo` AS `StockMinimo`,now() AS `Hora` from ((`saldo_stock` `S` join `productos` `P` on((`S`.`codigo_producto` = `P`.`codigo_producto`))) join `bases` `B` on((`B`.`codigo_base` = `S`.`codigo_base`)));

CREATE VIEW `vAsistenciaBases` AS
select `A`.`fecha` AS `fecha`,`A`.`codigo_usuario` AS `codigo_usuario`,`U`.`nombre` AS `Usuario`,`A`.`codigo_base` AS `codigo_base`,`B`.`nombre` AS `Base` from ((`bitacoraBase` `A` join `bases` `B` on((`A`.`codigo_base` = `B`.`codigo_base`))) join `usuarios` `U` on((`U`.`codigo_usuario` = `A`.`codigo_usuario`))) where (`A`.`fecha` >= (now() - interval 7 day));

CREATE VIEW `vDeudaClientes` AS
select `F`.`codigo_cliente` AS `codigo_cliente`,max(`C`.`nombre`) AS `Cliente`,sum(if((`F`.`tipo_documento` = 'FAC'),`F`.`saldo`,0)) AS `Deudas`,sum(if((`F`.`tipo_documento` = 'NTC'),`F`.`saldo`,0)) AS `Creditos`,sum((`F`.`saldo` * if((`F`.`tipo_documento` = 'NTC'),-(1),1))) AS `Saldo` from (`mov_contable` `F` join `clientes` `C` on((`F`.`codigo_cliente` = `C`.`codigo_cliente`))) where ((`F`.`saldo` > 0) and (`F`.`estado` <> 'anulado')) group by `F`.`codigo_cliente`;

CREATE VIEW `vGananciasPerdidas` AS
select `F`.`fecha_emision` AS `fecha_emision`,`F`.`tipo_documento` AS `tipo_documento`,`F`.`numero_documento` AS `numero_documento`,`F`.`codigo_cliente` AS `Id Cliente`,`C`.`nombre` AS `Cliente`,`LF`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,count(0) AS `Cantidad`,sum(`LF`.`precio_total`) AS `TotalVenta`,sum(`DP`.`monto`) AS `Costo`,max(`F`.`costoenvio`) AS `CostoEnvio`,(sum((`LF`.`precio_total` - `DP`.`monto`)) - max(`F`.`costoenvio`)) AS `Ganancia` from (((((`mov_contable` `F` join `mov_contable_detalle` `LF` on(((`F`.`numero_documento` = `LF`.`numero_documento`) and (`F`.`tipo_documento` = `LF`.`tipo_documento`)))) join `paquete` `pq` on(((`LF`.`tipo_documento` = `pq`.`tipo_documento`) and (`F`.`numero_documento` = `pq`.`codigo_paquete`)))) join `detalle_movs_partidas` `DP` on(((`DP`.`tipo_documento_venta` = `F`.`tipo_documento`) and (`DP`.`numero_documento` = `F`.`numero_documento`)))) join `productos` `P` on((`P`.`codigo_producto` = `LF`.`codigo_producto`))) join `clientes` `C` on((`C`.`codigo_cliente` = `F`.`codigo_cliente`))) where ((`F`.`estado` = 'activo') and (`F`.`tipo_documento` = 'FAC') and (`pq`.`estado` not in ('perdido','robado'))) group by `F`.`fecha_emision`,`F`.`tipo_documento`,`F`.`numero_documento`,`LF`.`codigo_producto`
union
select `F`.`fecha_emision` AS `fecha_emision`,`F`.`tipo_documento` AS `tipo_documento`,`F`.`numero_documento` AS `numero_documento`,`F`.`codigo_cliente` AS `Id Cliente`,`C`.`nombre` AS `Cliente`,`LF`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,count(0) AS `Cantidad`,sum(`LF`.`precio_total`) AS `TotalVenta`,sum(`DP`.`monto`) AS `Costo`,max(`F`.`costoenvio`) AS `CostoEnvio`,(sum((`LF`.`precio_total` - `DP`.`monto`)) - max(`F`.`costoenvio`)) AS `Ganancia` from ((((`mov_contable` `F` join `mov_contable_detalle` `LF` on(((`F`.`numero_documento` = `LF`.`numero_documento`) and (`F`.`tipo_documento` = `LF`.`tipo_documento`)))) join `detalle_movs_partidas` `DP` on(((`DP`.`tipo_documento_venta` = `F`.`tipo_documento`) and (`DP`.`numero_documento` = `F`.`numero_documento`)))) join `productos` `P` on((`P`.`codigo_producto` = `LF`.`codigo_producto`))) join `clientes` `C` on((`C`.`codigo_cliente` = `F`.`codigo_cliente`))) where ((`F`.`estado` = 'activo') and (`F`.`tipo_documento` = 'NTC')) group by `F`.`fecha_emision`,`F`.`tipo_documento`,`F`.`numero_documento`,`LF`.`codigo_producto`;

CREATE VIEW `vMovsContablesCliente` AS
select `F`.`tipo_documento` AS `tipo_documento`,`F`.`numero_documento` AS `numero_documento`,`F`.`estado` AS `estado`,`D`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,`F`.`codigo_base` AS `codigo_base`,`B`.`nombre` AS `Base`,`F`.`fecha_emision` AS `fecha_emision`,`F`.`fecha_vencimiento` AS `fecha_vencimiento`,`F`.`codigo_cliente` AS `codigo_cliente`,`C`.`nombre` AS `Cliente`,`D`.`cantidad` AS `cantidad`,(`D`.`precio_total` / if((`D`.`cantidad` <> 0),`D`.`cantidad`,1)) AS `Precio_unitario`,`GET_COSTO_PRODUCTO`(`F`.`tipo_documento`,`F`.`numero_documento`,`P`.`codigo_producto`) AS `Costo`,`D`.`saldo` AS `saldo` from ((((`mov_contable` `F` join `mov_contable_detalle` `D` on(((`F`.`tipo_documento` = `D`.`tipo_documento`) and (`F`.`numero_documento` = `D`.`numero_documento`)))) join `productos` `P` on((`D`.`codigo_producto` = `P`.`codigo_producto`))) join `clientes` `C` on((`F`.`codigo_cliente` = `C`.`codigo_cliente`))) join `bases` `B` on((`B`.`codigo_base` = `F`.`codigo_base`))) where ((`F`.`saldo` > 0) and (`F`.`estado` <> 'anulado'));

CREATE VIEW `vMovsxBase_ultimos7` AS
select `M`.`tipodocumentostock` AS `tipodocumentostock`,`M`.`numdocumentostock` AS `numdocumentostock`,`M`.`codigo_base` AS `codigo_base`,`B`.`nombre` AS `Base`,`M`.`fecha` AS `fecha`,`D`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,`D`.`ordinal` AS `ordinal`,if((`M`.`tipodocumentostock` in ('REM','AJE','NTC','TRE')),`D`.`cantidad`,0) AS `Entradas`,if((`M`.`tipodocumentostock` in ('FAC','AJS','NTD','TRS')),`D`.`cantidad`,0) AS `Salidas` from (((`movimiento_stock` `M` join `detalle_movimiento_stock` `D` on(((`D`.`tipodocumentostock` = `M`.`tipodocumentostock`) and (`D`.`numdocumentostock` = `M`.`numdocumentostock`)))) join `productos` `P` on((`D`.`codigo_producto` = `P`.`codigo_producto`))) join `bases` `B` on((`B`.`codigo_base` = `M`.`codigo_base`))) where (`M`.`fecha` >= (now() - interval 7 day))
union
select `M`.`tipo_documento` AS `tipo_documento`,`M`.`numero_documento` AS `numero_documento`,`M`.`codigo_base` AS `codigo_base`,`B`.`nombre` AS `Base`,`M`.`fecha_emision` AS `fecha_emision`,`D`.`codigo_producto` AS `codigo_producto`,`P`.`nombre` AS `Producto`,`D`.`ordinal` AS `ordinal`,if((`M`.`tipo_documento` in ('REM','AJE','NTC','TRE')),`D`.`cantidad`,0) AS `Entradas`,if((`M`.`tipo_documento` in ('FAC','AJS','NTD','TRS')),`D`.`cantidad`,0) AS `Salidas` from (((`mov_contable` `M` join `mov_contable_detalle` `D` on(((`D`.`tipo_documento` = `M`.`tipo_documento`) and (`D`.`numero_documento` = `M`.`numero_documento`)))) join `productos` `P` on((`D`.`codigo_producto` = `P`.`codigo_producto`))) join `bases` `B` on((`B`.`codigo_base` = `M`.`codigo_base`))) where (`M`.`fecha_emision` >= (now() - interval 7 day)) order by `fecha`;

CREATE VIEW `vOperaciones_resumen` AS
select `F`.`fecha_emision` AS `fecha_emision`,`F`.`tipo_documento` AS `tipo_documento`,count(0) AS `Cantidad` from `mov_contable` `F` group by `F`.`fecha_emision`,`F`.`tipo_documento`
union
select `MP`.`fecha` AS `fecha`,`MP`.`tipo_documento_compra` AS `tipo_documento_compra`,count(0) AS `Cantidad` from `mov_contable_prov` `MP` group by `MP`.`fecha`,`MP`.`tipo_documento_compra`
union
select `S`.`fecha` AS `fecha`,`S`.`tipodocumentostock` AS `tipodocumentostock`,count(0) AS `Cantidad` from `movimiento_stock` `S` group by `S`.`fecha`,`S`.`tipodocumentostock`
union
select `P`.`fecha` AS `fecha`,max('PED') AS `max("PED")`,count(0) AS `Cantidad` from `pedidos` `P` group by `P`.`fecha`
union
select `PQ`.`fecha_registro` AS `fecha_registro`,`PQ`.`tipo_documento` AS `tipo_documento`,count(0) AS `Cantidad` from `paquete` `PQ` group by `PQ`.`fecha_registro`,`PQ`.`tipo_documento`
union
select `CJ`.`fecha` AS `fecha`,`CJ`.`tipodocumento` AS `tipodocumento`,count(0) AS `Cantidad` from `mov_operaciones_contables` `CJ` group by `CJ`.`fecha`,`CJ`.`tipodocumento`;

CREATE VIEW `vSaldos_StockxBase` AS
select `S`.`codigo_base` AS `Id_base`,`B`.`nombre` AS `Base`,`S`.`codigo_producto` AS `Id_producto`,`P`.`nombre` AS `Producto`,`S`.`fecha_saldoactual` AS `Fecha_actualizado`,`S`.`saldo_actual` AS `Saldo_actual`,`S`.`stock_minimo` AS `Stock_Minimo`,`get_reserva`(`S`.`codigo_base`,`S`.`codigo_producto`) AS `Reserva`,(`S`.`saldo_actual` - `get_reserva`(`S`.`codigo_base`,`S`.`codigo_producto`)) AS `Saldo_disponible` from ((`saldo_stock` `S` join `bases` `B` on((`S`.`codigo_base` = `B`.`codigo_base`))) join `productos` `P` on((`S`.`codigo_producto` = `P`.`codigo_producto`)));

CREATE VIEW `vpaquetes` AS
select `P`.`codigo_paquete` AS `codigo_paquete`,`P`.`tipo_documento` AS `tipo_documento`,`P`.`estado` AS `estado`,`P`.`fecha_registro` AS `fecha_registro`,`P`.`fecha_actualizado` AS `fecha_actualizado`,`F`.`codigo_base` AS `codigo_base`,`F`.`codigo_cliente` AS `codigo_cliente`,`C`.`nombre` AS `Cliente`,`D`.`codigo_producto` AS `codigo_producto`,`R`.`nombre` AS `Producto`,`D`.`cantidad` AS `cantidad`,`PE`.`concatenarpuntoentrega` AS `Direccion`,`GET_COSTO_PRODUCTO`(`F`.`tipo_documento`,`F`.`numero_documento`,`D`.`codigo_producto`) AS `costo`,`D`.`precio_total` AS `precio_total` from (((((`paquete` `P` join `mov_contable` `F` on(((`P`.`tipo_documento` = `F`.`tipo_documento`) and (`P`.`codigo_paquete` = `F`.`numero_documento`)))) join `puntos_entrega` `PE` on((`PE`.`codigo_puntoentrega` = `F`.`codigo_puntoentrega`))) join `mov_contable_detalle` `D` on(((`P`.`tipo_documento` = `D`.`tipo_documento`) and (`P`.`codigo_paquete` = `D`.`numero_documento`)))) join `productos` `R` on((`R`.`codigo_producto` = `D`.`codigo_producto`))) join `clientes` `C` on((`C`.`codigo_cliente` = `F`.`codigo_cliente`)));
