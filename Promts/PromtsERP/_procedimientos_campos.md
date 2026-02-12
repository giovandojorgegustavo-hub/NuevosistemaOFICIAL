# Campos devueltos por procedimientos (LECTURA)
Fuente: `SQL/procedimientos.sql`.

## Login
- `validar_credenciales_usuario(p_usuario, p_password)` → `codigo_usuario`, `nombre`
- `get_usecases_usuario(p_usuario)` → `codigo_modulo`, `descripcion`, `caption`, `codigo_usecase`, `linktolaunch`

## Modulo 1 (Consultas / Lectura)
- `get_proveedores_saldos_pendientes()` → `codigo_provedor`, `nombre`, `saldo_final`
- `get_viaje_por_documento(p_numero_documento)` → `codigoviaje`, `nombrebase`, `nombre_motorizado`, `numero_wsp`, `num_llamadas`, `num_yape`, `link`, `observacion`, `fecha`
- `get_mov_contable_detalle(p_tipo_documento, p_numero_documento)` → `tipo_documento`, `numero_documento`, `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `saldo`, `precio_total`
- `get_paquetes_por_estado(p_estado)` → `codigo_paquete`, `fecha_actualizado`, `codigo_cliente`, `nombre_cliente`, `num_cliente`, `codigo_puntoentrega`, `codigo_base`, `nombre_base`, `codigo_packing`, `nombre_packing`, `ordinal_numrecibe`, `concatenarpuntoentrega`, `region_entrega`, `latitud`, `longitud`, `concatenarnumrecibe`
- `get_clientes()` → `codigo_cliente`, `nombre`, `numero`
- `get_clientes_saldo_pendiente()` → `codigo_cliente`, `nombre`, `saldo_final`
- `get_productos()` → `codigo_producto`, `nombre`
- `get_bases()` → `codigo_base`, `nombre`
- `get_bases_candidatas()` → `codigo_base`, `latitud`, `longitud`
- `get_direccion_entrega()` → `latitud`, `longitud`
- `get_packing()` → `codigo_packing`, `nombre`
- `get_packingporbase(p_codigo_base)` → `codigo_packing`, `nombre`, `tipo`, `observacion`
- `get_puntos_entrega(p_codigo_cliente)` → `cod_dep`, `cod_prov`, `cod_dist`, `departamento`, `provincia`, `distrito`, `ubigeo`, `codigo_puntoentrega`, `codigo_cliente`, `region_entrega`, `direccion_linea`, `referencia`, `nombre`, `dni`, `agencia`, `observaciones`, `concatenarpuntoentrega`, `latitud`, `longitud`, `estado`
- `get_ubigeo_departamentos()` → `cod_dep`, `departamento`
- `get_ubigeo_provincias(p_cod_dep)` → `cod_prov`, `provincia`
- `get_ubigeo_distritos(p_cod_dep, p_cod_prov)` → `cod_dist`, `distrito`
- `get_numrecibe(p_codigo_cliente)` → `codigo_cliente_numrecibe`, `ordinal_numrecibe`, `numero`, `nombre`, `concatenarnumrecibe`
- `get_pedidospendientes()` → `codigo_pedido`, `codigo_cliente`, `nombre_cliente`, `numero_cliente`, `fecha`, `created_at`
- `get_cuentasbancarias()` → `codigo_cuentabancaria`, `nombre`, `banco`
- `get_etiquetas_gastos()` → `codigoetiquetagasto`, `nombre`
- `get_etiquetas_retiro()` → `codigoetiquetaretiro`, `nombre`
- `get_proveedores()` → `codigo_provedor`, `nombre`
- `get_facturascompras_pendientes()` → `tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `nombre_provedor`, `fecha`
- `get_detalle_compra_por_documento(p_tipo_documento_compra, p_num_documento_compra, p_codigo_provedor)` → `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `cantidad_entregada`, `saldo`
- `get_saldo_favor_provedor(p_codigo_provedor)` → `tipo_documento_compra`, `num_documento_compra`, `fecha`, `saldo`
- `get_pedido_detalle_por_pedido(p_codigo_pedido)` → `codigo_producto`, `nombre_producto`, `saldo`, `precio_unitario`
