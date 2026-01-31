**

CU2-004: Gestion Compras

# **Prompt AI.


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.
Para cualquier campo de cantidad, aceptar decimales con `.` o `,` y normalizar a `.` antes de enviar al backend.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

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

Incluir manejo de errores y mejores practicas de UX."

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
- Confirmar Operacion.
- Estados de loading y error
- Ver Logs de sentencias SQL (no en interfaz)
- Gestionar Remitos de Compras

# **Pasos del formulario-multipaso.

1. Seleccionar Factura de Compra Pendiente.
2. Definir Remito de Compra.
3. Confirmar y Registrar Remito.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1. Seleccionar Factura de Compra Pendiente.

Cargar un Grid llamado “vFacturasPendientes” con las tuplas devueltas por el SP `get_facturascompras_pendientes()`. Solo deben aparecer facturas de compra tipo **FCC** que tengan al menos un item con `cantidad_entregada < cantidad`.

El Grid debe mostrar las siguientes columnas:

- vfecha= fecha
- vtipo_documento_compra=tipo_documento_compra
- vnum_documento_compra , num_documento_compra
- vcodigo_provedor=codigo_provedor, campo no visible
- vnombre_provedor=nombre_provedor, campo visible


El usuario podra seleccionar del Grid cual es la factura de compra para pasar al paso siguiente.




## Paso 2. Definir Remito de Compra.


vTipo_documento_compra_remito = "REM".

vOrdinal = `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipo_documento_compra_remito AND numdocumentostock = vNum_documento_compra_remito` (si no hay filas, usar 1).
vNum_documento_compra_remito =
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipo_documento_compra_remito` (si no hay filas, usar 1). No editable.

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento `get_bases`. mostrar campo nombre


Presentar un Grid editable llamado “vDetalleRemitoCompra” que se inicialice automaticamente con el SP `get_detalle_compra_por_documento(vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor)`.

Columnas de vDetalleRemitoCompra:

- vnombre_producto=nombre_producto, no editable pero si visible
- vCantidadDisponible=cantidad-cantidad_entregada, editable y visible. nunca puede ser mayor que cantidad cantidad-cantidad entregada
- vcodigo_producto=codigo_producto, no visible
- vOrdinalCompra=ordinal (del detalle de la factura FCC), no visible



## Paso 3. Confirmar y Registrar Remito.

Mostrar resumen de Remito seleccionada, Base destino y lineas del remitodetalle.
   
Al dar click en “Registrar Remito”, ejecutar transaccion:

1. registrar enla tabla `movimiento_stock`:
   - tipodocumentostock = vTipo_documento_compra_remito
   - numdocumentostock = vNum_documento_compra_remito
   - fecha = vfecha
   - codigo_base = vCodigo_base
   - tipo_documento_compra = vTipo_documento_compra_origen
   - num_documento_compra = vNum_documento_compra_origen
   - codigo_provedor = vCodigo_provedor

2. Insertar en `detalle_movimiento_stock`:
   - tipodocumentostock = vTipo_documento_compra_remito
   - numdocumentostock = vNum_documento_compra_remito
   - ordinal = vOrdinal (del remito)
   - codigo_producto=vcodigo_producto
   - cantidad = vCantidadDisponible

3. Actualizar entregas en la factura de compra (FCC) usando el SP:
   - `CALL aplicar_entrega_compra(vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor, vOrdinalCompra, vCantidadDisponible)`
   - Ejecutar por cada linea del remito.

4. Actualizar `saldo_stock` usando el SP unico `upd_stock_bases` por cada item del remito:
   - `p_codigo_base = vCodigo_base`
   - `p_codigo_producto = vcodigo_producto`
   - `p_cantidad = vCantidadDisponible`
   - `p_tipodoc = vTipo_documento_compra_remito` (REM, entrada positiva)
   - `p_numdoc = vNum_documento_compra_remito`



No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
