**  

CU-006: Gestion Pedido.

  
# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-006` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU-006/logs/`.
- El archivo debe nombrarse `CU-006-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

1. Seleccionar Pedido

2. Crear Factura.

3. Datos Entrega.

4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

5. Resumen y Emitir Factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Seleccionar Pedido.

Cargar un Grid llamado "vPedidosPendientes" con las tuplas devueltas por el SP `get_pedidospendientes()`. 


El Grid debe mostrar las siguientes columnas:
- vfecha=fecha
- vcodigo_pedido=codigo_pedido
- vcodigo_cliente=codigo_cliente


Permitir filtros por Cliente y Fecha para recargar el Grid.
 


## paso 2 Mostrar detallePedidos

Cargar un Grid llamado "vPedidosDetalle" con las tuplas devueltas por el SP `get_pedido_detalle_por_pedido()` . 

Vcodigo_producto=codigo_producto, no visible
Vnombre_producto=nombre_producto, visible
Vcantidad=saldo, visible 
Vprecio_unitario=precio_unitario, no visible
Vprecio_total=Vsaldo*Vprecio_unitario, visible y se actualiza cada vez que cambia la cantidad


vFechaemision= vFechaPedido no editable
vHoraemision = vHoraPedido no editable
vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases. 


vTipo_documento="FAC"
vNumero_documento = calcular con SQL: `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'` (si no hay filas, usar 1).


Cargar un Grid llamado "vPedidosDetalle" con las tuplas devueltas por el SP `get_pedido_detalle_por_pedido()` . 

Vcodigo_producto=codigo_producto no visible
Vnombre_producto=nombre_producto visible
Vcantidad=saldo visible 
Vprecio_unitario=precio_unitario no visible solo para el calculo inicial de vFPrecioTotal
vFPrecioTotal = inicia con un Vprecio_unitario*Vcantidad y recalculado cada que Vcantidad cambia. Aparece pero no es editable


Vsaldo=vFPrecioTotal es la suma cada item del Grid vProdFactura
vOrdinalDetMovCont = calcular con SQL: `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = vTipo_documento AND numero_documento = vNumero_documento` (si no hay filas, usar 1).

con estos requerimientos:

- solo se permite eliminar filas si hay mas de una. 
- no se permite agregar filas
- La cantidad se edita directamente (no con controles de incremento).
- Si se ingresa una cantidad mayor que la del pedidodetalle por producto, mostrar mensaje de error al intentar pasar a la siguiente vista.

Reglas de calculo y validacion de vProdFactura:
- El vFPrecioTotal de cada linea en factura se calcula asi: preciounitario = vPrecioTotal / vCantidadProducto.  luego vFPrecioTotal = preciounitario * vFCantidadProducto.
- Si el usuario edita cantidad_factura (por ejemplo de 12 a 11), recalcular inmediatamente el vFPrecioTotal con la formula anterior.





El Grid "vProdPedidos" debe mostrar:
- nombreproducto=
- Vcantidad=saldo 

Con estos requerimientos:
- Permitir borrar y editar lineas existentes.
- No permitir agregar nuevas lineas (el detalle viene del pedido).

Paso 2. Crear Factura.

vFechaemision = Inicializar con la fecha del sistema.
vHoraemision = Inicializar con la hora del sistema.
vFechaP = concatenar vFechaemision y vHoraemision de tal manera que fecha se guarde con datetime.

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases.

vTipo_documento = "FAC"
vNumero_documento = calcular con SQL: `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'` (si no hay filas, usar 1).

Presentar un Grid editable llamado "vProdFactura" 

vFProducto = iniciar con el valor de vProducto (desde vProdPedidos), no editable
vFCantidadProducto = iniciar con el valor de vCantidadProducto (desde vProdPedidos), editable
vFPrecioTotal = inicia con un valor calculado y recalculado cada que vFCantidadProducto cambia. Aparece pero no es editable

Vfsaldo = vFPrecioTotal es la suma cada item del Grid vProdFactura
vOrdinalDetMovCont = calcular con SQL: `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = vTipo_documento AND numero_documento = vNumero_documento` (si no hay filas, usar 1).

Con estos requerimientos:
- solo se permite eliminar filas si hay mas de una.
- no se permite agregar filas.
- La cantidad se edita directamente (no con controles de incremento).
- Si se ingresa una cantidad mayor que el saldo del pedidodetalle por producto, mostrar mensaje de error al intentar pasar a la siguiente vista.

Reglas de calculo y validacion de vProdFactura:
- El vFPrecioTotal de cada linea en factura se calcula asi: precio_unitario = vPrecioTotal / vCantidadProducto. Luego vFPrecioTotal = precio_unitario * vFCantidadProducto.
- Si el usuario edita cantidad_factura (por ejemplo de 12 a 11), recalcular inmediatamente el vFPrecioTotal con la formula anterior.
- El total de factura (mov_contable.saldo) es la suma de todos los precio_total_factura del detalle despues de recalcular.






## Paso 3. Datos Entrega.

Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vPuntoEntrega = Seleccionar procedimiento get_puntos_entrega(vClienteSeleted). Si el cliente no tiene puntos de entrega, no mostrar esta opcion.
Para mostrar el texto en la lista usar el campo `concatenarpuntoentrega` devuelto por el procedimiento.

Nuevo: se puede darle click para entrar a otros campos


vCod_Dep= Inicializar con el SP get_ubigeo_departamentos().
vCod_Prov=Inicializar con el SP get_ubigeo_provincias(vCod_Dep).
vCod_Dist=Inicializar con el SP get_ubigeo_distritos(vCod_Dep, vCod_Prov)
Vubigeo=concatenarvCod_Dep y vCod_Prov y vCod_Dist en ese orden
Vcodigo_puntoentrega = calcular con SQL: `SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = vClienteSeleted` (si no hay filas, usar 1).


vRegion_Entrega = se calcula automaticamente segun los codigos:
- Si vCod_Dep = '15' y vCod_Prov = '01' => 'LIMA' (Lima Metropolitana)
- En cualquier otro caso => 'PROV'

No mostrar selector de region al usuario.

Ahora si es LIMA mostrar
Vdireccion_linea=campo para escribir
Vreferencia=campo para escribir

Ahora si es PROV mostrar
region_entrega


Vnombre=campo para escribir
Vdni=campo para escribir
Vagencia=campo para escribir
Vobservaciones=campo para escribir

si vRegion_Entrega es LIMA entonces pasamos al paso 4. sino vamos al paso 5

Vconcatenarpuntoentrega se define asi
- Si vRegion_Entrega = "LIMA": `Vdireccion_linea | distrito | Vreferencia` (omite Vreferencia si esta vacia).
- Si vRegion_Entrega = "PROV": `Vnombre | Vdni | Vagencia | Vobservaciones` (omite campos vacios).


## Paso 4. Datos Recibe (solo si vRegion_Entrega = "LIMA").


Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vCodigoClienteNumrecibe = Inicializar con el SP get_numrecibe(vClienteSeleted). Para mostrar el texto en la lista usar el campo `concatenarnumrecibe` devuelto por el procedimiento.

Nuevo: se puede darle click para entrar a otros campos

vNumeroRecibe = Campo para escribir
vNombreRecibe = Campo para escribir 
Vordinal_numrecibe = calcular con SQL: `SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = vCodigoClienteNumrecibe` (si no hay filas, usar 1).


vOrdinal_paquetedetalle = calcular con SQL: `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vNumero_documento AND tipo_documento = 'FAC'` (si no hay filas, usar 1).

Vconcatenarnumrecibe = `numero | nombre` (omite campos vacios).

## Paso 5. Resumen y Emitir Factura.

Mostrar resumen de Pedido, Factura y Entrega, con boton "Emitir Factura".

Resumen Entrega (explicito):
- Mostrar si el punto es EXISTENTE o NUEVO (se registrara)

Resumen Recibe:
- Mostrar si el numrecibe es EXISTENTE o NUEVO (se registrara).

Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton "Emitir Factura" el sistema debera realizar las siguientes transacciones sobre la DB:







## Grabar el Punto_entrega si hubiera. Tomar los datos capturados en el paso 3:

- registrarlos en la tabla puntos_entrega
ubigeo=Vubigeo
codigo_puntoentrega=Vcodigo_puntoentrega
codigo_cliente=Vcodigo_cliente
direccion_linea=Vdireccion_linea
referencia=Vreferencia
nombre=Vnombre
dni=Vdni
agencia=Vagencia
observaciones=Vobservaciones
registrarlos en la tabla puntos_entrega 
region_entrega=vRegion_Entrega
Grabar en la tabla 
concatenarpuntoentrega = Vconcatenarpuntoentrega
region_entrega es "PROV": `nombre | dni | agencia | observaciones` (omite campos vacios).

## Grabar el numrecibe si hubiera. Tomar los datos capturados en el paso 4:


- registrarlos en la tabla numrecibe
ordinal_numrecibe=Vordinal_numrecibe
numero=Vnumero
nombre=Vnombre
codigo_cliente_numrecibe=Vcodigo_cliente
concatenarnumrecibe = Vconcatenarnumrecibe



- Grabar Factura. Tomar los datos capturados en el paso 2:



## Guardar en la tabla "mov_contable". 
codigo_pedido=vcodigo_pedido
fecha_emision=vFechaP
fecha_vencimiento=vFechaP
fecha_valor=vFechaP
codigo_cliente=Vcodigo_cliente
saldo=Vfsaldo
tipo_documento="FAC"
numero_documento=vNumero_documento
codigo_base=vCodigo_base
codigo_cliente_numrecibe=Vcodigo_cliente
ordinal_numrecibe=Vordinal_numrecibe
codigo_cliente_puntoentrega=Vcodigo_cliente
codigo_puntoentrega=Vcodigo_puntoentrega

## Guardar en la tabla "mov_contable_detalle". 
tipo_documento"FAC"
numero_documento=vNumero_documento
ordinal=vOrdinalDetMovCont
codigo_producto=vFCantidadProducto
cantidad=vFCantidadProducto
saldo=vFCantidadProducto
precio_total=vFPrecioTotal




## Guardar en la tabla "paquete". 
codigo_paquete=vNumero_documento
tipo_documento="FAC"
estado= "pendiente empacar".




## Guardar en la tabla "paquetedetalle". 
codigo_paquete=vNumero_documento
tipo_documento="FAC"
ordinal_paquetedetalle=vOrdinal_paquetedetalle
estado= "pendiente empacar"


- Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteSeleted, vTipo_documento, mov_contable.saldo)`.

- Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_documento, vNumero_documento)` (usa el codigo_pedido vinculado en mov_contable).

No utilizar datos mock

Solo utilizar datos reales de la base de datos especificada en erp.yml

  
**
