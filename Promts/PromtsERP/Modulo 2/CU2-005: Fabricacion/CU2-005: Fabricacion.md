**

CU2-005: Fabricacion

# **Prompt AI.


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados. Regla de ruta obligatoria:
Si el caso empieza con `CU-` (sin numero), usar `wizard/Modulo 1/CU-XXX/`.
Si empieza con `CU2-`, usar `wizard/Modulo 2/CU2-XXX/`.
Si empieza con `CU3-`, usar `wizard/Modulo 3/CU3-XXX/`.
Si no existe la carpeta del modulo, debe crearse.
Si no coincide con ningun prefijo, detenerse y pedir confirmacion del modulo.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre node.js

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-XXX/logs/`.
- El archivo debe nombrarse `CU2-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
- Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel

Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
- `design.json` con paleta, tipografias, tamanos, radios, sombras, grid y tokens de componentes.
- `tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamanos y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:

- Barra de progreso visual
- Navegacion entre pasos (anterior/siguiente)
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Registrar Fabricacion (salida insumos FIS + entrada produccion FPR)

# **Pasos del formulario-multipaso.

1. Datos generales + insumos de fabricacion (fecha + base + insumos).
2. Registrar gastos asociados.
3. Registrar productos producidos.
4. Confirmar y registrar fabricacion (ejecutar todas las transacciones).

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Variables generales:

vFecha = Inicializar con la fecha del sistema.

vCodigo_base = Seleccionar de la lista de Bases devuelta por el SP get_bases.

vTipoDocumentoStockInsumo = "FIS" (salida de insumos).

vNumDocumentoStockInsumo = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockInsumo` (si no hay filas, usar 1). No editable.

vTipoDocumentoStockProduccion = "FPR" (entrada de productos terminados).

vNumDocumentoStockProduccion = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockProduccion` (si no hay filas, usar 1). No editable.

vTipoDocumentoStockFabricacion = vTipoDocumentoStockProduccion.

vNumDocumentoStockFabricacion = vNumDocumentoStockProduccion.

vTipoDocumentoGasto = "GAS".

vNumDocumentoGasto = calcular con SQL:
`SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_contable_gasto WHERE tipodocumento = vTipoDocumentoGasto` (si no hay filas, usar 1). No editable.

vMontoGastoTotal = campo editable.

vCodigo_cuentabancaria = Seleccionar de la lista de Cuentas bancarias devuelta por el SP get_cuentasbancarias.

Paso 1. Datos generales + registrar insumos de fabricacion.

En este paso se definen primero los datos generales de la fabricacion (siempre hay insumos), por lo tanto:

vFecha = fecha actual no editable si visible.
vCodigo_base = seleccionar de la lista de Bases devuelta por el SP get_bases.

Presentar un Grid editable llamado "vDetalleInsumos" que permita agregar, borrar y editar lineas. El Grid debe tener las siguientes columnas: vcodigo_producto_insumo, vnombre_producto_insumo, vcantidad_insumo.

vcodigo_producto_insumo = ofrecer la lista de productos que devuelve el SP get_productos. 
vnombre_producto_insumo = se completa segun el producto seleccionado (solo lectura).
vcantidad_insumo = campo editable. Acepta decimales con hasta 2 digitos.


vOrdinalInsumo = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockInsumo AND numdocumentostock = vNumDocumentoStockInsumo` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

## Paso 2. Registrar gastos asociados.

Registrar cabecera en mov_contable_gasto y detalle de etiquetas en mov_contable_gasto_detalle.

Presentar un Grid editable llamado "vDetalleGastos" que permita agregar, borrar y editar lineas. El Grid debe tener las siguientes columnas: vcodigoetiquetagasto, vnombre_etiquetagasto.

vcodigoetiquetagasto = ofrecer la lista de etiquetas de la tabla etiquetagastos.
vnombre_etiquetagasto = se completa segun la etiqueta seleccionada (solo lectura).

vOrdinalGasto = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_gasto_detalle WHERE tipodocumento = vTipoDocumentoGasto AND numdocumento = vNumDocumentoGasto` (si no hay filas, usar 1).

Validaciones:
- Debe existir al menos 1 etiqueta en vDetalleGastos.

Paso 3. Registrar productos producidos.

Presentar un Grid editable llamado "vDetalleProduccion" que permita agregar, borrar y editar lineas. El Grid debe tener las siguientes columnas: vcodigo_producto_producido, vnombre_producto_producido, vcantidad_producida.

vcodigo_producto_producido = ofrecer la lista de productos que devuelve el SP get_productos.

vnombre_producto_producido = se completa segun el producto seleccionado (solo lectura).

vcantidad_producida = campo editable. Acepta decimales con hasta 2 digitos.

vOrdinalProduccion = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockProduccion AND numdocumentostock = vNumDocumentoStockProduccion` (si no hay filas, usar 1).

Paso 4. Confirmar y registrar fabricacion.

En este paso se muestra el resumen final y el boton \"Registrar Fabricacion\". Al confirmar, el sistema debera ejecutar todas las transacciones sobre la DB:

1) Guardar cabecera de insumos en `movimiento_stock` con vTipoDocumentoStockInsumo y vNumDocumentoStockInsumo.
2) Guardar detalle de insumos en `detalle_movimiento_stock` (vDetalleInsumos) con ordinal correlativo.
3) Guardar cabecera de produccion en `movimiento_stock` con vTipoDocumentoStockProduccion y vNumDocumentoStockProduccion.
4) Guardar detalle de produccion en `detalle_movimiento_stock` (vDetalleProduccion) con ordinal correlativo.
5) Guardar cabecera en `mov_contable_gasto` y detalle en `mov_contable_gasto_detalle` (solo etiquetas).
6) Guardar relacion en `fabricaciongastos` entre la cabecera de fabricacion (movimiento_stock) y la cabecera de gasto, usando el doc stock de produccion.
7) Actualizar `saldo_stock` por cada item de insumos usando `upd_stock_bases` con `p_tipodoc = 'FBI'` (salida de insumos).
8) Actualizar `saldo_stock` por cada item de produccion usando `upd_stock_bases` con `p_tipodoc = 'FBE'` (entrada de productos).

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

# **Mapa rapido de campos (variable -> tabla.campo)

movimiento_stock.tipodocumentostock = vTipoDocumentoStockInsumo
movimiento_stock.numdocumentostock = vNumDocumentoStockInsumo
movimiento_stock.fecha = vFecha
movimiento_stock.codigo_base = vCodigo_base

movimiento_stock.tipodocumentostock = vTipoDocumentoStockProduccion
movimiento_stock.numdocumentostock = vNumDocumentoStockProduccion
movimiento_stock.fecha = vFecha
movimiento_stock.codigo_base = vCodigo_base

detalle_movimiento_stock.tipodocumentostock = vTipoDocumentoStockInsumo
detalle_movimiento_stock.numdocumentostock = vNumDocumentoStockInsumo
detalle_movimiento_stock.ordinal = vOrdinalInsumo
detalle_movimiento_stock.codigo_producto = vcodigo_producto_insumo
detalle_movimiento_stock.cantidad = vcantidad_insumo

detalle_movimiento_stock.tipodocumentostock = vTipoDocumentoStockProduccion
detalle_movimiento_stock.numdocumentostock = vNumDocumentoStockProduccion
detalle_movimiento_stock.ordinal = vOrdinalProduccion
detalle_movimiento_stock.codigo_producto = vcodigo_producto_producido
detalle_movimiento_stock.cantidad = vcantidad_producida

mov_contable_gasto.tipodocumento = vTipoDocumentoGasto
mov_contable_gasto.numdocumento = vNumDocumentoGasto
mov_contable_gasto.fecha = vFecha
mov_contable_gasto.monto = vMontoGastoTotal
mov_contable_gasto.codigo_cuentabancaria = vCodigo_cuentabancaria

mov_contable_gasto_detalle.tipodocumento = vTipoDocumentoGasto
mov_contable_gasto_detalle.numdocumento = vNumDocumentoGasto
mov_contable_gasto_detalle.ordinal = vOrdinalGasto
mov_contable_gasto_detalle.codigoetiquetagasto = vcodigoetiquetagasto

fabricaciongastos.tipodocumentostock = vTipoDocumentoStockFabricacion
fabricaciongastos.numdocumentostock = vNumDocumentoStockFabricacion
fabricaciongastos.tipodocumentogasto = vTipoDocumentoGasto
fabricaciongastos.numdocumentogasto = vNumDocumentoGasto
fabricaciongastos.ordinal = vOrdinalGasto

9) Ejecutar el procedimiento `aplicar_gasto_bancario(vTipoDocumentoGasto, vNumDocumentoGasto)` para actualizar saldo bancario.

**
