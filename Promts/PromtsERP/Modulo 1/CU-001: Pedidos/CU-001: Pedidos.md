**  

CU-001: Pedidos

  
# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-001` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica

- Validaciones con expresiones regulares

- Componentes Bootstrap (progress bar, alerts, etc.)

- Responsive design para moviles

- El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU-XXX/logs/`.
- El archivo debe nombrarse `CU-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

- Emitir Factura.

# **Pasos del formulario-multipaso.

1. Crear Pedido

2. Crear Factura.

3. Datos Entrega.

4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

5. Resumen y Emitir Factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Pedido.

vFechaPedido = Inicializar con la fecha del sistema.

vHoraPedido = Inicializar con la hora del sistema.

vClienteSeleted = Seleccionar de la lista de Clientes devuelta por el SP get_clientes

Presentar un Grid llamado "vProdPedidos" con estos requerimientos:
- Permitir capturar productos y cantidades por cliente.
- Mapear a la tabla `pedido_detalle`.
- Columnas: codigo_producto, Descripcion, Cantidad, Precio_total.
- Saldo se calcula automaticamente igual a la Cantidad y no se muestra en el formulario.
- Permitir agregar nuevas lineas, borrar y editar lineas existentes.

Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Paso 2. Crear Factura.

vFecha_emision= Inicializar con la fecha del sistema. 

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases

Presentar un Grid editable llamado "vProdFactura" con estos requerimientos:
- Inicializar automaticamente con el contenido de vProdPedidos (copiar exactamente todas las filas al entrar al paso 2).
- Permitir editar solo la linea de cantidad, que puede ser igual o menor, nunca mayor.
- La cantidad se edita directamente (no con controles de incremento).
- Si se ingresa una cantidad mayor, mostrar mensaje de error al pasar a la siguiente vista.
- Si hay mas de una linea, se puede borrar, pero siempre debe quedar al menos una.
- La factura no puede guardarse sin tener ninguna linea de detalle.
- En este grid solo debe traerse el producto y su cantidad.

Restricciones de edicion en vProdFactura:
- No se permite cambiar el producto (codigo_producto) ni agregar productos nuevos; solo se permite eliminar filas o reducir la cantidad facturada.
- La cantidad solo puede disminuir respecto al pedido; nunca aumentar.
- Debe existir al menos una fila en vProdFactura; si intenta eliminar la ultima, bloquear y mostrar mensaje.

Reglas de calculo y validacion de vProdFactura:
- La cantidad editable no puede superar la cantidad original del pedido (detalle correspondiente). Si se excede, no permitir avanzar y mostrar mensaje indicando el maximo facturable.
- El precio_total de cada linea en factura se calcula asi: precio_unitario = precio_total_pedido / cantidad_pedido; luego precio_total_factura = precio_unitario * cantidad_factura.
- Al copiar del pedido, si cantidad_factura = cantidad_pedido, el precio_total_factura debe ser igual al precio_total_pedido.
- Si el usuario edita cantidad_factura (por ejemplo de 12 a 11), recalcular inmediatamente el precio_total_factura con la formula anterior.
- El total de factura (mov_contable.saldo) es la suma de todos los precio_total_factura del detalle despues de recalcular.

Paso 3. Datos Entrega.

vTipo_Documento = "F"

vPuntoEntrega = Seleccionar de la lista de puntos de entrega devuelta por el procedimiento get_puntos_entrega(vClienteSeleted). Si el cliente no tiene puntos de entrega, no mostrar esta opcion. Al seleccionar, tomar vCod_Dep, vCod_Prov, vCod_Dist, vUbigeo y vCodigo_puntoentrega del registro.

El SP get_puntos_entrega debe devolver ademas de los codigos:
- departamento, provincia, distrito (nombres)
- ubigeo (6 digitos)
- direccion_linea, referencia, destinatario_nombre, destinatario_dni, agencia, region_entrega

UI Entrega (visibilidad):
- Siempre mostrar arriba un selector de punto de entrega existente (con un texto descriptivo: codigo + direccion + region).
- Al seleccionar un punto, mostrar abajo sus campos en inputs de solo lectura para mayor visibilidad.
- Si region_entrega = "LIMA": mostrar Direccion_linea y referencia
- Si region_entrega = "PROV": mostrar agencia. destinatario_nombre y destinatario_dni. 


Agregar Nuevo Punto de Entrega (opcion siempre disponible).

vCod_Dep, vCod_Prov, vCod_Dist = Seleccionar desde listas dependientes (departamento -> provincia -> distrito) con get_ubigeo_departamentos(), get_ubigeo_provincias(p_cod_dep), get_ubigeo_distritos(p_cod_dep, p_cod_prov). El ubigeo final se arma concatenando cod_dep+cod_prov+cod_dist (6 digitos).

vCodigo_puntoentrega = el backend debe generar el siguiente correlativo (MAX + 1) por ubigeo antes de insertar.

vRegion_Entrega = Seleccionar "LIMA" o "PROV".

Si vRegion_Entrega = "PROV": pasar directamente al Paso 5.

Si vRegion_Entrega = "LIMA": mostrar el Paso 4.

Si se selecciona un punto existente, mostrar solo los campos que correspondan segun su vRegion_Entrega.

Si se agrega un punto nuevo, los campos visibles deben respetar la misma regla:


Paso 4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

vCodigo_Cliente_Numrecibe = Seleccionar de la lista devuelta por el procedimiento get_numrecibe(vClienteSeleted). Mostrar numero y nombre en la lista.

vNumero_Recibe y vNombre_Recibe = Se completan automaticamente segun la seleccion de vCodigo_Cliente_Numrecibe.

Agregar nuevo numrecibe (opcion disponible): permitir capturar numero y nombre y registrarlo.

UI Recibe:
- Siempre mostrar el selector de numrecibe existente arriba.
- Al seleccionar, mostrar numero y nombre en campos de solo lectura.
- Si se elige nuevo numrecibe, habilitar inputs para numero y nombre y ocultar los de solo lectura.

Paso 5. Resumen y Emitir Factura.

Mostrar resumen de Pedido, Factura y Entrega, con boton "Emitir Factura".

Resumen Entrega (explicito):
- Mostrar si el punto es EXISTENTE o NUEVO (se registrara)

Resumen Recibe:
- Mostrar si el numrecibe es EXISTENTE o NUEVO (se registrara).
  

Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton "Emitir Factura" el sistema debera realizar las siguientes transacciones sobre la DB:

- Grabar el Pedido. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla "pedidos". vFechaPedido, vHoraPedido, vClienteSeleted.

- Guardar en la tabla "pedido_detalle" los datos del grid "vProdPedidos".

- Grabar Factura.

- Guardar en la tabla "puntos_entrega" si se eligio "Agregar Nuevo Punto de Entrega". Guardar codigo_puntoentrega (si no viene, generar MAX + 1 por ubigeo), codigo_cliente, ubigeo (cod_dep+cod_prov+cod_dist), region_entrega y los datos de direccion segun region.

- Guardar en la tabla "mov_contable". vFecha_emision, vCodigo_base, vTipo_Documento, vCodigo_Cliente_Numrecibe, ubigeo, codigo_puntoentrega y codigo_pedido.
- mov_contable.saldo (numeric(12,2)) = SUM(precio_total) del detalle de factura.

- Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteSeleted, vTipo_Documento, mov_contable.saldo)`.

- Guardar en la tabla "mov_contable_detalle" los datos del grid "vProdFactura".
- mov_contable_detalle.precio_total debe ser numeric(12,2) y guardar el precio_total calculado de cada linea.

- Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_Documento, vNumero_Documento)` (usa el codigo_pedido vinculado en mov_contable).

- Insertar en la tabla `paquete` al emitir la factura:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.
  - `fecha_actualizado` = fecha/hora del sistema.

- Insertar en la tabla `paquetedetalle` una fila por cada item de `mov_contable_detalle`:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `ordinal` = correlativo por item.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.


No utilizar datos mock

Solo utilizar datos reales de la base de datos especificada en erp.yml

  
# Cambios pedidos

## Version 2.01

Al terminar la captura del formulario multipaso, el usuario debera tener disponible la posibilidad de "Emitir Factura" como cierre del proceso.

  

Al dar click al boton "Emitir Factura" el formulario debera realizar las siguientes transacciones sobre la DB:

- Grabar el Pedido. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla "pedidos". vFechaPedido, vHoraPedido, vClienteSeleted.

- Guardar en la tabla "pedido_detalle" los datos del grid "vProdPedidos".

- Grabar Factura.

- Guardar en la tabla "puntos_entrega" si se eligio "Agregar Nuevo Punto de Entrega". Guardar codigo_puntoentrega (si no viene, generar MAX + 1 por ubigeo), codigo_cliente, ubigeo (cod_dep+cod_prov+cod_dist), region_entrega y los datos de direccion segun region.

- Guardar en la tabla "mov_contable". vFecha_emision, vCodigo_base, vTipo_Documento, vCodigo_Cliente_Numrecibe, ubigeo, codigo_puntoentrega y codigo_pedido.
- mov_contable.saldo (numeric(12,2)) = SUM(precio_total) del detalle de factura.

- Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteSeleted, vTipo_Documento, mov_contable.saldo)`.

- Guardar en la tabla "mov_contable_detalle" los datos del grid "vProdFactura".
- mov_contable_detalle.precio_total debe ser numeric(12,2) y guardar el precio_total calculado de cada linea.

- Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_Documento, vNumero_Documento)` (usa el codigo_pedido vinculado en mov_contable).

- Insertar en la tabla `paquete` al emitir la factura:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.
  - `fecha_actualizado` = fecha/hora del sistema.

- Insertar en la tabla `paquetedetalle` una fila por cada item de `mov_contable_detalle`:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `ordinal` = correlativo por item.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.

**
