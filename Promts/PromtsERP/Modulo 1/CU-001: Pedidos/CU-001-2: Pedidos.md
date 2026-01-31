**  

CU-001: Pedidos

  
# **Prompt AI.


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados. Regla de ruta obligatoria:
Si el caso empieza con `CU-` (sin numero), usar `wizard/Modulo 1/CU-XXX/`.
Si empieza con `CU2-`, usar `wizard/Modulo 2/CU2-XXX/`.
Si empieza con `CU3-`, usar `wizard/Modulo 3/CU3-XXX/`.
Si no existe la carpeta del modulo, debe crearse.
Si no coincide con ningun prefijo, detenerse y pedir confirmacion del modulo. 

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

Clase Form Wizard para manejar la logica

Validaciones con expresiones regulares

Componentes Bootstrap (progress bar, alerts, etc.)

Responsive design para moviles

El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU-XXX/logs/`.
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

Confirmar Operacion.

Estados de loading y error

Ver Logs de sentencias SQL (no en interfaz)

Emitir Factura.

# **Pasos del formulario-multipaso.

1. Seleccionar o Crear Cliente.

2. Crear Pedido.

3. Crear Factura.

4. Datos Entrega.

5. Datos Recibe (solo si vRegion_Entrega = "LIMA").

6. Registro de Pago (Recibo).

7. Asignar Base.

8. Resumen y Emitir Factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.


## Paso 1. Seleccionar o Crear Cliente.

Mostrar un checklist/radio con opciones: "Cliente existente" y "Cliente nuevo".

Cliente existente (opcion por defecto):
vClienteNombre = Select (Llamada SP: `get_clientes()` devuelve `nombre`)
Campos devueltos: `codigo_cliente`, `nombre`, `numero`
Variables:
vClienteSeleted = `codigo_cliente` (no visible)
vClienteNombre = `nombre` (visible)
vClienteNumero = `numero` (no visible)
Solo es visible el select de clientes. No mostrar campos de cliente nuevo.

Cliente nuevo:
vCodigo_cliente = regla sin ambiguedad:
- Si el cliente es NUEVO: calcular con SQL `SELECT COALESCE(MAX(codigo_cliente), 0) + 1 AS next FROM clientes`.
- Si YA EXISTE: mantener el valor actual de vCodigo_cliente.
No visible.
vClienteNombre = campo visible y editable.
vClienteNumero = campo visible y editable.
vClienteSeleted = debe tomar el valor de vCodigo_cliente.
Los campos nombre y numero solo son visibles si se elige "Cliente nuevo". Si no se completan, no puede continuar.
Al emitir factura, si el cliente NO existe en `clientes`, registrar primero en `clientes` y `saldos_clientes` dentro de la misma transaccion (con saldo inicial 0). Luego continuar con pedidos/factura.


## Paso 2. Crear Pedido.

vFechaPedido = Inicializar con la fecha del sistema.
vHoraPedido = Inicializar con la hora del sistema.

vcodigo_pedido = regla sin ambiguedad:
- Si el pedido es NUEVO: calcular con SQL `SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos`.
- Si YA EXISTE: mantener el valor actual de vcodigo_pedido.
No es visible.

vFechaP=concatenar vFechaPedido y vHoraPedido de tal manera que fecha se guarde con datetime.

Presentar un Grid llamado "vProdPedidos" 

vProductoNombre = Select (Llamada SP: `get_productos()` devuelve `nombre`)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vProductoCodigo = `codigo_producto` (no visible)
vProductoNombre = `nombre` (visible)
vCantidadProducto = editable. Acepta decimales con hasta 2 digitos.
vPrecioTotal = editable
vOrdinalPedDetalle = regla sin ambiguedad:
- Si el pedido es NUEVO: asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM pedido_detalle WHERE codigo_pedido = vcodigo_pedido`.
No visible.

vPrecioUnitario=vPrecioTotal/vCantidadProducto no visible

Con estos requerimientos:
Permitir agregar nuevas lineas, borrar y editar lineas existentes.


## Paso 3. Crear Factura.

vFechaemision= vFechaPedido no editable
vHoraemision = vHoraPedido no editable
vTipo_documento="FAC"
vNumero_documento = regla sin ambiguedad:
- Si la factura es NUEVA: calcular con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'`.
- Si YA EXISTE: mantener el valor actual de vNumero_documento.


Presentar un Grid editable llamado "vProdFactura" 
vFProducto = iniciar con el valor de vProducto, no editable
vFCantidadProducto = iniciar con el valor de vCantidadProducto, editable. Acepta decimales con hasta 2 digitos.
vFPrecioTotal = inicia con un valor calculado y recalculado cada que vFCantidadProducto cambia. Aparece pero no es editable


VfMonto = suma de cada item del Grid vProdFactura. Guardar en mov_contable.monto.
Vfsaldo = VfMonto (saldo inicial).
vOrdinalDetMovCont = regla sin ambiguedad:
- Si la factura es NUEVA: asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = vTipo_documento AND numero_documento = vNumero_documento`.

con estos requerimientos:

solo se permite eliminar filas si hay mas de una. 
no se permite agregar filas
La cantidad se edita directamente (no con controles de incremento).
Si se ingresa una cantidad mayor que la del pedidodetalle por producto, mostrar mensaje de error al intentar pasar a la siguiente vista.

Reglas de calculo y validacion de vProdFactura:
El vFPrecioTotal de cada linea en factura se calcula asi: preciounitario = vPrecioTotal / vCantidadProducto.  luego vFPrecioTotal = preciounitario * vFCantidadProducto.
Si el usuario edita cantidad_factura (por ejemplo de 12 a 11), recalcular inmediatamente el vFPrecioTotal con la formula anterior.








## Paso 4. Datos Entrega.

Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vPuntoEntregaTexto = Select (Llamada SP: `get_puntos_entrega(vClienteSeleted)` devuelve `concatenarpuntoentrega`)
Campos devueltos: `cod_dep`, `cod_prov`, `cod_dist`, `departamento`, `provincia`, `distrito`, `ubigeo`, `codigo_puntoentrega`, `codigo_cliente`, `region_entrega`, `direccion_linea`, `referencia`, `nombre`, `dni`, `agencia`, `observaciones`, `concatenarpuntoentrega`, `estado`
Variables:
vPuntoEntregaTexto = `concatenarpuntoentrega` (visible)
vRegion_Entrega = `region_entrega` (no visible)
vDireccionLinea = `direccion_linea` (visible si LIMA)
vReferencia = `referencia` (visible si LIMA)
vNombre = `nombre` (visible si PROV)
vDni = `dni` (visible si PROV)
vAgencia = `agencia` (visible si PROV)
vObservaciones = `observaciones` (visible si PROV)
Si el cliente no tiene puntos de entrega, no mostrar esta opcion.
Para mostrar el texto en la lista usar el campo `concatenarpuntoentrega` devuelto por el procedimiento.

Nuevo: se puede darle click para entrar a otros campos
Al seleccionar "Nuevo", mostrar un mapa interactivo de Google Maps para elegir el punto de entrega.
Al seleccionar un punto en el mapa:
- Autocompletar la direccion en vDireccionLinea (visible y editable).
- Mostrar vLatitud y vLongitud (visibles solo lectura).
- Permitir ajustar manualmente vDireccionLinea si la geocodificacion no es exacta.
Datos tipicos a capturar desde el mapa: direccion formateada, latitud, longitud.
El mapa debe cargar centrado en Lima, Peru, con zoom aproximado 12 (usar centro por defecto).
La API key de Google Maps se lee desde erp.yml (google_maps.api_key).


vDepartamento = Select (Llamada SP: `get_ubigeo_departamentos()` devuelve `departamento`)
Campos devueltos: `cod_dep`, `departamento`
Variables:
vDepartamento = `departamento` (visible)
vProvincia = Select (Llamada SP: `get_ubigeo_provincias(vCod_Dep)` devuelve `provincia`)
Campos devueltos: `cod_prov`, `provincia`
Variables:
vProvincia = `provincia` (visible)
vDistrito = Select (Llamada SP: `get_ubigeo_distritos(vCod_Dep, vCod_Prov)` devuelve `distrito`)
Campos devueltos: `cod_dist`, `distrito`
Variables:
vDistrito = `distrito` (visible)
Vubigeo=concatenarvCod_Dep y vCod_Prov y vCod_Dist en ese orden
Vcodigo_puntoentrega = regla sin ambiguedad:
- Si el punto de entrega es NUEVO: calcular con SQL `SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = vClienteSeleted`.
- Si YA EXISTE: mantener el valor actual de Vcodigo_puntoentrega.


vRegion_Entrega = se calcula automaticamente segun los codigos:
Si vCod_Dep = '15' y vCod_Prov = '01' => 'LIMA' (Lima Metropolitana)
En cualquier otro caso => 'PROV'

No mostrar selector de region al usuario.

Ahora si es LIMA mostrar
Vdireccion_linea=campo para escribir
Vreferencia=campo para escribir
vLatitud=campo solo lectura (visible si LIMA y se selecciono en mapa)
vLongitud=campo solo lectura (visible si LIMA y se selecciono en mapa)

Ahora si es PROV mostrar
region_entrega


Vnombre=campo para escribir
Vdni=campo para escribir
Vagencia=campo para escribir
Vobservaciones=campo para escribir

si vRegion_Entrega es LIMA entonces pasamos al paso 5. sino vamos al paso 6

Vconcatenarpuntoentrega se define asi
Si vRegion_Entrega = "LIMA": `Vdireccion_linea | distrito | Vreferencia` (omite Vreferencia si esta vacia).
Si vRegion_Entrega = "PROV": `Vnombre | Vdni | Vagencia | Vobservaciones` (omite campos vacios).


## Paso 5. Datos Recibe (solo si vRegion_Entrega = "LIMA").


Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vConcatenarnumrecibe = Select (Llamada SP: `get_numrecibe(vClienteSeleted)` devuelve `concatenarnumrecibe`)
Campos devueltos: `codigo_cliente_numrecibe`, `ordinal_numrecibe`, `numero`, `nombre`, `concatenarnumrecibe`
Variables:
vOrdinal_numrecibe = `ordinal_numrecibe` (no visible)
vNumeroRecibe = `numero` (no visible)
vNombreRecibe = `nombre` (no visible)
vConcatenarnumrecibe = `concatenarnumrecibe` (visible)

Nuevo: se puede darle click para entrar a otros campos

vNumeroRecibe = Campo para escribir
vNombreRecibe = Campo para escribir 
Vordinal_numrecibe = regla sin ambiguedad:
- Si el numrecibe es NUEVO: asignar ordinal secuencial por nuevo registro (1,2,3...).
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = vCodigoClienteNumrecibe`.


vOrdinal_paquetedetalle = regla sin ambiguedad:
- Si el paquete es NUEVO: asignar ordinal secuencial por linea (1,2,3...) segun el indice.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vNumero_documento AND tipo_documento = 'FAC'`.

Vconcatenarnumrecibe = `numero | nombre` (omite campos vacios).

## Paso 6. Registro de Pago (Recibo).

vTipo_documento_pago = "RCP"

vNumero_documento_pago = regla sin ambiguedad:
- Si el recibo es NUEVO: calcular con SQL `SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCP'`.
- Si YA EXISTE: mantener el valor actual de vNumero_documento_pago.

vCuentaNombre = Select (Llamada SP: `get_cuentasbancarias()` devuelve `nombre`)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:  
vCuentaNombre = `nombre` (visible)
vCuentaBanco = `banco` (visible)

vMontoPendiente = Inicializar con la suma del detalle del pedido (monto total a pagar). Usar el total de la factura (Vfsaldo) como fuente si no hay calculo adicional.

vMontoPago = Inicializar con vMontoPendiente. Debe ser editable para permitir pago parcial.
Permitir no registrar pago (vMontoPago vacio o 0).
Si vMontoPago > 0, validar: vMontoPago <= vMontoPendiente.
Permitir registrar mas de un pago: cada pago se agrega a una lista `vPagos`.
Al confirmar un pago, recalcular vMontoPendiente = vMontoPendiente - vMontoPago y prellenar el siguiente vMontoPago con ese nuevo vMontoPendiente.
Bloquear pagos cuando vMontoPendiente sea 0.

## Paso 7. Asignar Base.

vBaseNombre = Select (Llamada SP: `get_bases()` devuelve `nombre`)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vCodigo_base = `codigo_base` (no visible, editable)
vBaseNombre = `nombre` (visible)

En este paso, primero construir un JSON con el contenido del grid “vProdFactura” y usarlo junto con la fecha del pedido ya definida (vFechaPedido) para consultar las bases candidatas.

Llamada SP: `get_bases_candidatas(p_vProdFactura JSON, vFechaPedido DATETIME)`
Campos devueltos: `codigo_base`, `latitud`, `longitud`
Uso: mostrar estas bases candidatas como ayuda/preview para decidir la base a asignar. Si hay bases candidatas, priorizarlas en la lista.

Seleccion automatica de base por tiempo de llegada (obligatorio):
Variables involucradas:
vLatitud, vLongitud (origen)
codigo_base, nombre, latitud, longitud (bases)
vCodigo_base, vBaseNombre (salida)

Si vLatitud y vLongitud estan definidos, llamar Google Distance Matrix API con:
origins = vLatitud,vLongitud
destinations = bases.latitud,bases.longitud
mode = driving

Seleccionar la base con menor duration.value.
Asignar automaticamente:
vCodigo_base = codigo_base de la base seleccionada
vBaseNombre = nombre de la base seleccionada

El campo vBaseNombre sigue siendo select editable con valor inicial sugerido.
Si la API falla o faltan coordenadas, no sugerir base.
Recalcular cada vez que cambien vLatitud o vLongitud.

Formato del JSON (ejemplo):
[
  {
    "vFProducto": 1001,
    "vFCantidadProducto": 2,
    "vFPrecioTotal": 150.50
  },
  {
    "vFProducto": 1002,
    "vFCantidadProducto": 1,
    "vFPrecioTotal": 75.00
  }
]


## Paso 8. Resumen y Emitir Factura.


Mostrar resumen de Pedido, Factura y Entrega, con boton "Emitir Factura".

Resumen Entrega (explicito):
Mostrar si el punto es EXISTENTE o NUEVO (se registrara)

Resumen Recibe:
Mostrar si el numrecibe es EXISTENTE o NUEVO (se registrara).
  


Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton "Emitir Factura" el sistema debera realizar las siguientes transacciones sobre la DB:

Grabar el Pedido. Tomar los datos capturados en el paso 2:


## registrarlos en la tabla pedidos:
codigo_pedido=vcodigo_pedido
codigo_cliente=vClienteSeleted
fecha=vFechaP

## registrarlos en la tabla pedido_detalle
codigo_pedido=vcodigo_pedido
ordinal=correlativo por item (1,2,3...) en pedidos nuevos; si es edicion usar vOrdinalPedDetalle calculado
codigo_producto=vProducto
cantidad=vCantidadProducto
precio_total=vPrecioTotal
saldo=vCantidadProducto
precio_unitario=vPrecioUnitario


Grabar el Punto_entrega si hubiera. Tomar los datos capturados en el paso 4:
## registrarlos en la tabla puntos_entrega
ubigeo=Vubigeo
codigo_puntoentrega=Vcodigo_puntoentrega
codigo_cliente_puntoentrega=Vcodigo_cliente
direccion_linea=Vdireccion_linea
referencia=Vreferencia
nombre=Vnombre
dni=Vdni
agencia=Vagencia
observaciones=Vobservaciones
region_entrega=vRegion_Entrega
concatenarpuntoentrega = Vconcatenarpuntoentrega


Grabar el numrecibe si hubiera. Tomar los datos capturados en el paso 5:
## registrarlos en la tabla numrecibe
ordinal_numrecibe=Vordinal_numrecibe
numero=Vnumero
nombre=Vnombre
codigo_cliente_numrecibe=Vcodigo_cliente
concatenarnumrecibe = Vconcatenarnumrecibe



Grabar Factura. Tomar los datos capturados en el paso 3:
## Guardar en la tabla "mov_contable". 
codigo_pedido=vcodigo_pedido
fecha_emision=vFechaP
fecha_vencimiento=vFechaP
fecha_valor=vFechaP
codigo_cliente=Vcodigo_cliente
monto=Vfsaldo
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
ordinal=correlativo por item (1,2,3...) en facturas nuevas; si es edicion usar vOrdinalDetMovCont calculado
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
ordinal=correlativo por item (1,2,3...) en paquetes nuevos; si es edicion usar vOrdinal_paquetedetalle calculado
estado= "pendiente empacar"


Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteSeleted, vTipo_Documento, mov_contable.saldo)`.

## Registrar Recibo (Pago)
Si existen pagos en `vPagos`:
Por cada pago en `vPagos`, usar un numero_documento incrementado (secuencial desde vNumero_documento_pago) y registrar el recibo con el monto del pago.
Guardar solo en la tabla "mov_operaciones_contables" (actualiza bancos):
tipodocumento="RCP"
numdocumento=vNumero_documento_pago (secuencial por pago)
fecha=vFechaP
monto=monto_pago
codigo_cuentabancaria=vCuentaBancaria
codigo_cuentabancaria_destino=NULL
descripcion="Recibo cliente" (opcional)

Aplicar el recibo contra facturas (de la mas reciente a la mas antigua) y registrar en Facturas_Pagadas:
`CALL aplicar_recibo_a_facturas(vClienteSeleted, vNumero_documento_pago, monto_pago)`

Actualizar saldo del cliente por el pago:
`CALL actualizarsaldosclientes(vClienteSeleted, "RCP", monto_pago)`




Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_Documento, vNumero_Documento)` (usa el codigo_pedido vinculado en mov_contable).



No utilizar datos mock

Solo utilizar datos reales de la base de datos especificada en erp.yml

  
