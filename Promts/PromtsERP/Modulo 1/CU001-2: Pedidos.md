**

CU001: Pedidos

  
# **Prompt AI.
Modulo: 1.
Caso de uso: CU001 - M1TomaDePedidos.
Puerto del wizard: 3001 (ver `Promts/Herramientas/puertos.json`).


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

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

Incluir manejo de errores y mejores practicas de UX."

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

Confirmar Operacion.

Estados de loading y error

Ver Logs de sentencias SQL (no en interfaz)

Emitir Factura.

Transaccionalidad total: si falla algo, rollback y no registrar nada.

Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

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
vClienteCodigo = `codigo_cliente` (no visible)
vClienteNombre = `nombre` (visible)
vClienteNumero = `numero` (no visible)
Solo es visible el select de clientes. No mostrar campos de cliente nuevo.

Cliente nuevo:
vClienteCodigo = regla sin ambiguedad:
- Si el cliente es NUEVO: calcular con SQL `SELECT COALESCE(MAX(codigo_cliente), 0) + 1 AS next FROM clientes`.
- Si YA EXISTE: mantener el valor actual de vClienteCodigo.
No visible.
vClienteNombre = campo visible y editable.
vClienteNumero = campo visible y editable.
Los campos nombre y numero solo son visibles si se elige "Cliente nuevo". Si no se completan, no puede continuar.



## Paso 2. Crear Pedido.

vFechaPedido = Inicializar con la fecha del sistema.
vHoraPedido = Inicializar con la hora del sistema.

vcodigo_pedido = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(codigo_pedido), 0) + 1 AS next FROM pedidos` (si no hay registros empieza en 1).
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
vOrdinalPedDetalle = 
- Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid (siempre pedido nuevo).
No visible.


Con estos requerimientos:
Permitir agregar nuevas lineas, borrar y editar lineas existentes.
No se debe poder guardar en vProdPedidos mas de un registro con el mismo codigoproducto sino debe salir error al avanzar


## Paso 3. Crear Factura.

vFechaemision= vFechaPedido no editable
vHoraemision = vHoraPedido no editable
vTipo_documento="FAC"
vNumero_documento = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'` (si no hay registros empieza en 1).


Presentar un Grid editable llamado "vProdFactura" 

vFProducto = iniciar con el valor de vProducto, no editable
vFCantidadProducto = iniciar con el valor de vCantidadProducto, editable. Acepta decimales con hasta 2 digitos.
vFPrecioTotal = inicia con vPrecioTotal y se recalcula cada que vFCantidadProducto cambia. Aparece pero no es editable

vPrecioUnitario: vPrecioTotal / vCantidadProducto de los datos del paso 2 por cada fila que estoy copiando.
el vFPrecioTotal en el recalculo seria vPrecioUnitario* vFCantidadProducto cada que vFCantidadProducto cambie de valor.


VfMonto = suma de cada item del Grid vProdFactura. Guardar en mov_contable.monto.
VfCostoEnvio = vCostoEnvio, variable definida luego por eso esto no es visible ni editable en este paso
VfTotal = VfMonto + VfCostoEnvio
Vfsaldo = VfTotal (saldo inicial, incluye costo de envio).
vOrdinalDetMovCont = regla sin ambiguedad:
- Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid (siempre factura nueva).

Requerimientos:
- No agregar filas; solo eliminar si hay mas de una.
- Cantidad editable 
- Validar: cantidad factura <= cantidad pedido por producto (error al avanzar).








## Paso 4. Datos Entrega.

Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vPuntoEntregaTexto = Select (Llamada SP: `get_puntos_entrega(vClienteCodigo)` devuelve `concatenarpuntoentrega`)
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

Nuevo: se puede darle click para entrar a otros campos
Nuevo: formulario guiado + mapa
1) Mapa + busqueda:
- Mostrar mapa de Google Maps y un campo de busqueda (autocomplete).
- El usuario selecciona direccion desde el autocomplete o hace clic en el mapa.
- Al elegir ubicacion: autocompletar vDireccionLinea (editable) y guardar vLatitud/vLongitud (solo lectura).
- Mapa centrado en Lima con zoom 12 usando erp.yml (google_maps.default_center, google_maps.default_zoom) y api_key.
2) Ubigeo:
- Preseleccionar vCod_Dep='15' y vCod_Prov='01' (Lima). Ambos editables.
- vDepartamento = Select get_ubigeo_departamentos()
- vProvincia = Select get_ubigeo_provincias(vCod_Dep)
- vDistrito = Select get_ubigeo_distritos(vCod_Dep, vCod_Prov)
- Vubigeo = concatenar vCod_Dep + vCod_Prov + vCod_Dist
3) Codigo punto entrega: recalcular si cambia el punto.
- Si el punto es NUEVO: Vcodigo_puntoentrega = `SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = vClienteCodigo` (si no hay registros empieza en 1).
- Si el punto es EXISTENTE: Vcodigo_puntoentrega = valor seleccionado del registro existente (no recalcular).
4) Region y campos visibles:
- vRegion_Entrega se calcula: LIMA si vCod_Dep='15' y vCod_Prov='01', si no PROV. No mostrar selector.
- Si LIMA: vDireccionLinea, vReferencia, vLatitud, vLongitud.
- Si PROV: vNombre, vDni, vAgencia, vObservaciones.
- vCostoEnvio = 50 si vRegion_Entrega = "PROV", si no 0. (no visible)
5) Navegacion:
- Si vRegion_Entrega=LIMA => paso 5. Si no => paso 6.
6) Vconcatenarpuntoentrega:
- LIMA: `Vdireccion_linea | distrito | Vreferencia` (omite referencia vacia).
- PROV: `Vnombre | Vdni | Vagencia | Vobservaciones` (omite vacios).


## Paso 5. Datos Recibe (solo si vRegion_Entrega = "LIMA").


Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vConcatenarnumrecibe = Select (Llamada SP: `get_numrecibe(vClienteCodigo)` devuelve `concatenarnumrecibe`)
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
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = vClienteCodigo` (si no hay registros empieza en 1).


vOrdinal_paquetedetalle = regla sin ambiguedad:
- Si el paquete es NUEVO: asignar ordinal secuencial por linea (1,2,3...) segun el indice.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vNumero_documento AND tipo_documento = 'FAC'`.

Vconcatenarnumrecibe = `numero | nombre` (omite campos vacios).

## Paso 6. Registro de Pago (Recibo).

vTipo_documento_pago = "RCP"

vNumero_documento_pago = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCP'` (si no hay registros empieza en 1).
Numeracion para multiples pagos:
- Al agregar pagos en vPagos, asignar numdocumento secuencial: primer pago usa vNumero_documento_pago, los siguientes usan vNumero_documento_pago + 1, +2, etc.

vCuentaNombre = Select (Llamada SP: `get_cuentasbancarias()` devuelve `nombre`)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:  
vCuentaNombre = `nombre` (visible)
vCuentaBanco = `banco` (visible)


vMontoPago = Inicializar con VfTotal. Debe ser editable para permitir pago parcial.
vMontoPendiente = VfTotal.
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
Mostrar dos listados simultaneos:
(a) Bases candidatas por stock/horario (SP `get_bases_candidatas`),
(b) Bases con tiempo estimado de llegada (Google Distance Matrix), ordenadas por menor tiempo.

El tiempo estimado debe calcularse SOLO con las bases retornadas por `get_bases_candidatas`. Si no hay candidatas, no calcular ETA y mostrar "Sin bases candidatas".

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
El usuario puede seleccionar manualmente cualquier base candidata; la sugerida solo preselecciona.
Si la API falla o faltan coordenadas, no sugerir base.
Recalcular cada vez que cambien vLatitud o vLongitud.

Formato del JSON (ejemplo):
[
  {
    "vFProducto": 1,
    "vFCantidadProducto": 2,
    "vFPrecioTotal": 150.50
  },
  {
    "vFProducto": 2,
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

## Registrar Cliente (condicional, antes de pedidos)
Si el primer checklist en el paso 1 esta marcado como nuevo entonces

- Tabla `clientes`: codigo_cliente=vClienteCodigo, nombre=vClienteNombre, numero=vClienteNumero



## registrarlos en la tabla pedidos:
codigo_pedido=vcodigo_pedido
codigo_cliente=vClienteCodigo
fecha=vFechaP

## registrarlos en la tabla pedido_detalle
codigo_pedido=vcodigo_pedido
ordinal=correlativo por item (1,2,3...) en pedidos nuevos; si es edicion usar vOrdinalPedDetalle calculado
codigo_producto=vProducto
cantidad=vCantidadProducto
precio_total=vPrecioTotal
saldo=vCantidadProducto


Grabar el Punto_entrega si hubiera. Tomar los datos capturados en el paso 4:
## registrarlos en la tabla puntos_entrega
ubigeo=Vubigeo
codigo_puntoentrega=Vcodigo_puntoentrega
codigo_cliente_puntoentrega=vClienteCodigo
direccion_linea=Vdireccion_linea
referencia=Vreferencia
nombre=Vnombre
dni=Vdni
agencia=Vagencia
observaciones=Vobservaciones
region_entrega=vRegion_Entrega
concatenarpuntoentrega = Vconcatenarpuntoentrega
latitud = vLatitud
longitud = vLongitud


Grabar el numrecibe si hubiera. Tomar los datos capturados en el paso 5:
## registrarlos en la tabla numrecibe
ordinal_numrecibe=Vordinal_numrecibe
numero=Vnumero
nombre=Vnombre
codigo_cliente_numrecibe=vClienteCodigo
concatenarnumrecibe = Vconcatenarnumrecibe



Grabar Factura. Tomar los datos capturados en el paso 3:
## Guardar en la tabla "mov_contable". 
codigo_pedido=vcodigo_pedido
fecha_emision=vFechaP
fecha_vencimiento=vFechaP
fecha_valor=vFechaP
codigo_cliente=vClienteCodigo
monto=Vfsaldo
saldo=Vfsaldo
tipo_documento="FAC"
numero_documento=vNumero_documento
codigo_base=vCodigo_base
codigo_cliente_numrecibe=vClienteCodigo
ordinal_numrecibe=Vordinal_numrecibe
codigo_cliente_puntoentrega=vClienteCodigo
codigo_puntoentrega=Vcodigo_puntoentrega
costoenvio=VfCostoEnvio



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

## Registrar Recibo (Pago)
Si existen pagos en `vPagos`:
Por cada pago en `vPagos`, registrar el recibo con los valores de la lista.
Guardar solo en la tabla "mov_operaciones_contables" :
tipodocumento="RCP"
numdocumento=secuencial segun la regla definida en Paso 6
fecha=vFechaP
monto=monto_pago
codigo_cuentabancaria=vCuentaBancaria
codigo_cuentabancaria_destino=NULL

Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteCodigo, vTipo_Documento, mov_contable.saldo)`.

Aplicar el recibo contra facturas (de la mas reciente a la mas antigua) y registrar en Facturas_Pagadas:
`CALL aplicar_recibo_a_facturas(vClienteCodigo, vNumero_documento_pago, monto_pago)`

Actualizar saldo del cliente por cada pago:
`CALL actualizarsaldosclientes(vClienteCodigo, "RCP", monto_pago)`

Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_Documento, vNumero_Documento)` (usa el codigo_pedido vinculado en mov_contable).



No utilizar datos mock

Solo utilizar datos reales de la base de datos especificada en erp.yml

  
