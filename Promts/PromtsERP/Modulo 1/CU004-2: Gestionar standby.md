**

CU004: Gestionar paquetes en standby

# **Prompt AI.
Modulo: 1.
Caso de uso: CU004 - M1PaquetesStandby.
Puerto del wizard: 3004 (ver `Promts/Herramientas/puertos.json`).


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.



Como desarrollador de aplicaciones web, ayudame a crear un formulario de gestion multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar el modulo indicado en `Promts/Herramientas/puertos.json` (campo `module`).
Si el caso no existe en el archivo, detenerse y pedir confirmacion del modulo.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
Clase Form Wizard para manejar la logica
Validaciones con expresiones regulares
Componentes Bootstrap (progress bar, alerts, etc.)
Responsive design para moviles
El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.”

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-XXX/logs/`.
El archivo debe nombrarse `CU-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel

Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
`design.json` con paleta, tipografias, tamanos, radios, sombras, grid y tokens de componentes.
`tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamanos y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:
Barra de progreso visual
Navegacion entre pasos (anterior/siguiente)
Confirmar Operacion
Estados de loading y error
Ver Logs de sentencias SQL
Gestionar estado de paquetes en standby
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccion de paquete en standby.
2. Detalle completo del paquete (cliente, entrega, productos y datos del viaje).
3. Confirmar y Guardar.

# **Descripcion de los pasos del formulario de gestion.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Seleccion de paquete en standby.

Muestra un Grid llamado "vPaquetesStandby" con los datos del SP: `get_paquetes_por_estado(p_estado="standby")`

Campos devueltos: `codigo_paquete`, `fecha_actualizado`, `codigo_cliente`, `nombre_cliente`, `num_cliente`, `codigo_puntoentrega`, `codigo_base`, `nombre_base`, `codigo_packing`, `nombre_packing`, `ordinal_numrecibe`, `concatenarpuntoentrega`, `region_entrega`, `latitud`, `longitud`, `concatenarnumrecibe`
Variables:
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base no visible no editable
vnombre_base visible no editable
vcodigo_packing visible no editable
vnombre_packing visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

El usuario podra seleccionar un paquete para continuar al detalle.
Al seleccionar un paquete del Grid, pasar al siguiente paso.


Paso 2. Mostrar informacion de ese paquete que esta en standby (solo lectura).

Mostrar como lectura:
- vconcatenarpuntoentrega
- vconcatenarnumrecibe
- vnombre_packing

Direccion y Mapa (solo lectura).
Solo si vRegion_Entrega = "LIMA":
- Cargar Google Maps usando erp.yml (`google_maps.api_key`, `google_maps.default_center`, `google_maps.default_zoom`).
- Mostrar el mapa en modo lectura (sin busqueda ni edicion), con arrastrar y zoom libre.
- Colocar un marcador rojo fijo en `vLatitud`/`vLongitud`.
Si vRegion_Entrega = "PROV": no mostrar mapa.

vViajeDocumento = Llamada SP: `get_viaje_por_documento(p_numero_documento)` con:
p_numero_documento = vcodigo_paquete
Campos devueltos: `codigoviaje`, `nombrebase`, `nombre_motorizado`, `numero_wsp`, `num_llamadas`, `num_yape`, `link`, `observacion`, `fecha`
Variables:
vcodigoviaje no visible no editable
vnombrebase visible no editable
vnombre_motorizado visible no editable
vnumero_wsp visible no editable
vnum_llamadas visible no editable
vnum_yape visible no editable
vlink visible no editable
vobservacion visible no editable
vfecha visible no editable

Mostrar un Grid llamado "vDetalleDocumento" (solo lectura) que se carga con el SP:
`get_mov_contable_detalle(p_tipo_documento, p_numero_documento)` con:
p_tipo_documento = "FAC"
p_numero_documento = vcodigo_paquete
Campos devueltos: `tipo_documento`, `numero_documento`, `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `saldo`, `precio_total`
Variables:
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable

Mostrar en el Grid:
vnombre_producto
vcantidad



Paso 3. Confirmar y Guardar.

El usuario define el nuevo estado del paquete:

- `robado`, `empacado` o `llegado`. dale para escoger solo entre estas opciones

Mostrar resumen del paquete seleccionado y el viaje asociado (incluyendo `link`).


Al confirmar, guardar:

Vordinal = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vcodigo_paquete AND tipo_documento = 'FAC'` (si no hay registros empieza en 1).

1) Registrar en `paquetedetalle`:
- `codigo_paquete` = vcodigo_paquete
- `ordinal` = Vordinal 
- `estado` = nuevo estado
- `tipo_documento` = "FAC"

2) Registrar en `detalleviaje` (solo si estado = robado, empacado o llegado):
- `fecha_fin` = NOW()

3) Ejecutar SP: `cambiar_estado_paquete(vcodigo_paquete, nuevo_estado)`.

4) Si estado = robado: emitir Nota de Credito sin detalle por el monto total de la factura y actualizar saldo de cliente.
- tipo_documento = "NTC".
- numero_documento = `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'`.
- Obtener factura usando el `vcodigo_paquete` (es el mismo `mov_contable.numero_documento`) y `tipo_documento = 'FAC'`.
- Usar el `monto` total de la factura como valor de la nota de credito.
- Consulta (bloquear factura): `SELECT codigo_pedido, codigo_cliente, codigo_base, codigo_cliente_numrecibe, ordinal_numrecibe, codigo_cliente_puntoentrega, codigo_puntoentrega, costoenvio, monto, saldo FROM mov_contable WHERE tipo_documento = 'FAC' AND numero_documento = vcodigo_paquete FOR UPDATE`.
- Insertar en `mov_contable` solo cabecera (sin detalle):
  - codigo_pedido = factura.codigo_pedido
  - fecha_emision = NOW()
  - fecha_vencimiento = NOW()
  - fecha_valor = NOW()
  - codigo_cliente = factura.codigo_cliente
  - monto = factura.monto
  - saldo = factura.monto
  - tipo_documento = "NTC"
  - numero_documento = correlativo NTC
  - costoenvio = factura.costoenvio
- Aplicar NTC a la factura (si tiene saldo):
  - `CALL aplicar_nota_credito_a_factura("NTC", correlativo, "FAC", vcodigo_paquete, factura.monto)`
  - Si la factura ya está en saldo 0: no aplicar nada; la NTC queda con saldo completo.
- Ejecutar SP: `actualizarsaldosclientes(factura.codigo_cliente, "NTC", factura.monto)` (sumar saldo cliente).



No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
