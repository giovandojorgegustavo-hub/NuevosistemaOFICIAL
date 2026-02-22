## Precondicion de Acceso (Obligatoria)
La pagina debe recibir dos parametros obligatorios y un tercer parametro opcional. Los parametros son:

- `Codigo_usuario` varchar(36)
- `OTP` varchar(6)
- `vParámetros` JSON (opcional)

Al iniciar la pagina se debe llamar el SP `validar_otp_usuario` pasandole como parametros `Codigo_usuario` y `OTP` para verificar si es un usuario valido.

El SP `validar_otp_usuario` devuelve:
- `1`: SI usuario y OTP son validos.
- `-1`: OTP expirado.
- `0`: NO EXISTE TOKEN.

Si `validar_otp_usuario` devuelve un valor diferente de `1`:
- Mostrar mensaje exacto: `Warning ACCESO NO AUTORIZADO !!!`
- Cerrar la pagina y salir del programa.

**  
CU005: Gestion Pedido.

  
# **Prompt AI.
Modulo: 1.
Caso de uso: CU005 - M1GestionPedidos.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.



Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-005/logs/`.
El archivo debe nombrarse `CU005-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

1. Seleccionar Pedido

2. Crear Factura.

3. Datos Entrega.

4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

5. Registro de Pago (Recibo).

6. Asignar Base.

7. Resumen y Emitir Factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Seleccionar Pedido.

Mostrar un Grid llamado "vPedidosPendientes" que llama al siguiente SP: `get_pedidospendientes()` (devuelve campo_visible)
Campos devueltos: `codigo_pedido`, `codigo_cliente`, `nombre_cliente`, `numero_cliente`, `fecha`, `created_at`
Variables:
vcodigo_pedido visible no editable
vClienteCodigo no visible no editable
vnombre_cliente visible no editable
vnumero_cliente visible no editable
vfecha visible no editable

Permitir filtros por Cliente y Fecha para recargar el Grid.
Al seleccionar un pedido del Grid, pasar al siguiente paso.

## Paso 2. Crear Factura.

vFechaemision = Inicializar con la fecha del sistema (fecha de factura, no la del pedido seleccionado).
vHoraemision = Inicializar con la hora del sistema (hora de factura).
vFechaP = concatenar vFechaemision y vHoraemision de tal manera que fecha se guarde con datetime.

vTipo_documento = "FAC"
vNumero_documento = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'FAC'` (si no hay registros empieza en 1).

Mostrar un Grid llamado "vProdFactura" que se carga con el SP:
`get_pedido_detalle_por_pedido(p_codigo_pedido)` con:
p_codigo_pedido = vcodigo_pedido (seleccionado en Paso 1)
Campos devueltos: `codigo_producto`, `nombre_producto`, `saldo`, `precio_unitario`
Variables:
vFProductoCodigo no visible no editable (inicia con codigo_producto)
vFProductoNombre visible no editable (inicia con nombre_producto)
vFCantidadProducto visible editable (inicia con saldo, acepta decimales hasta 2)
vFPrecioUnitario no visible no editable (inicia con precio_unitario)
vFPrecioTotal visible no editable (vFCantidadProducto * vFPrecioUnitario, recalcular al cambiar cantidad)

Filtrar el Grid: mostrar solo items con `saldo > 0`. Si saldo = 0, no mostrar en el grid.

VfMontoDetalleProductos = suma de vFPrecioTotal del Grid vProdFactura
VfCostoEnvio = vCostoEnvio, definida luego en el paso 3 por eso no es editable ni visible.
VfMonto = VfMontoDetalleProductos + VfCostoEnvio
Vfsaldo = VfMonto (saldo inicial, incluye costo de envio).
vOrdinalDetMovCont = regla sin ambiguedad:
- Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid (siempre factura nueva).

### Saldo a favor (antes de pagos)
vSaldoFavor = Llamada SP: `get_saldo_favor_cliente(vClienteCodigo)` (devuelve campo_visible)
Campos devueltos: `tipo_documento`, `numero_documento`, `fecha_emision`, `saldo`
Variables:
vSaldoFavorTotal visible no editable (suma de saldos)
vSaldoFavorNTC visible no editable (suma donde tipo_documento = "NTC")
vSaldoFavorRCP visible no editable (suma donde tipo_documento = "RCP")
vUsarSaldoFavor visible editable (checkbox)

Reglas:
- Si vUsarSaldoFavor = true, usar `vSaldoFavorUsar = MIN(vSaldoFavorTotal, VfMonto)`.
- Si vUsarSaldoFavor = false, `vSaldoFavorUsar = 0`.

Requerimientos:
- No agregar filas; solo eliminar si hay mas de una.
- Cantidad editable directa.
- Validar: cantidad factura <= saldo del pedidodetalle por producto (error al avanzar).






## Paso 3. Datos Entrega.

Mostrar un checklist que tenga como opcion :nuevo, existe 

Existe: es el que esta como defecto. 

vPuntoEntregaTexto = Select (Llamada SP: `get_puntos_entrega(vClienteCodigo)` devuelve `concatenarpuntoentrega`)
Campos devueltos: `cod_dep`, `cod_prov`, `cod_dist`, `departamento`, `provincia`, `distrito`, `ubigeo`, `codigo_puntoentrega`, `codigo_cliente`, `region_entrega`, `direccion_linea`, `referencia`, `nombre`, `dni`, `agencia`, `observaciones`, `concatenarpuntoentrega`, `latitud`, `longitud`, `estado`
Variables:
vPuntoEntregaTexto = `concatenarpuntoentrega` (visible)
vRegion_Entrega = `region_entrega` (no visible)
vDireccionLinea = `direccion_linea` (visible si LIMA)
vReferencia = `referencia` (visible si LIMA)
vNombre = `nombre` (visible si PROV)
vDni = `dni` (visible si PROV)
vAgencia = `agencia` (visible si PROV)
vObservaciones = `observaciones` (visible si PROV)
vLatitud = `latitud` (no visible)
vLongitud = `longitud` (no visible)
Si el cliente no tiene puntos de entrega, no mostrar esta opcion.
Para mostrar el texto en la lista usar el campo `concatenarpuntoentrega` devuelto por el procedimiento.

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
- vUbigeo = concatenar vCod_Dep + vCod_Prov + vCod_Dist
3) Codigo punto entrega: recalcular si cambia el punto.
- Si el punto es NUEVO: vCodigo_puntoentrega = `SELECT COALESCE(MAX(codigo_puntoentrega), 0) + 1 AS next FROM puntos_entrega WHERE codigo_cliente_puntoentrega = vClienteCodigo` (si no hay registros empieza en 1).
- Si el punto es EXISTENTE: vCodigo_puntoentrega = valor seleccionado del registro existente (no recalcular).
4) Region y campos visibles:
- vRegion_Entrega se calcula: LIMA si vCod_Dep='15' y vCod_Prov='01', si no PROV. No mostrar selector.
- Si LIMA: vDireccionLinea, vReferencia, vLatitud, vLongitud.
- Si PROV: vNombre, vDni, vAgencia, vObservaciones.
- vCostoEnvio = 50 si vRegion_Entrega = "PROV", si no 0. (no visible)
5) Navegacion:
- Si vRegion_Entrega=LIMA => paso 4. Si no => paso 5.
6) vConcatenarPuntoEntrega:
- LIMA: `vDireccionLinea | distrito | vReferencia` (omite referencia vacia).
- PROV: `vNombre | vDni | vAgencia | vObservaciones` (omite vacios).


## Paso 4. Datos Recibe (solo si vRegion_Entrega = "LIMA").


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
vOrdinal_numrecibe = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(ordinal_numrecibe), 0) + 1 AS next FROM numrecibe WHERE codigo_cliente_numrecibe = vClienteCodigo` (si no hay registros empieza en 1).


vOrdinal_paquetedetalle = regla sin ambiguedad:
- Si el paquete es NUEVO: asignar ordinal secuencial por linea (1,2,3...) segun el indice.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vNumero_documento AND tipo_documento = 'FAC'`.

vConcatenarNumRecibe = `numero | nombre` (omite campos vacios).

## Paso 5. Registro de Pago (Recibo).

vTipo_documento_pago = "RCP"

vNumero_documento_pago = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'` (si no hay registros empieza en 1).
Numeracion para multiples pagos:
- Al agregar pagos en vPagos, asignar numdocumento secuencial: primer pago usa vNumero_documento_pago, los siguientes usan vNumero_documento_pago + 1, +2, etc.

vCuentaNombre = Select (Llamada SP: `get_cuentasbancarias()` devuelve `nombre`)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:  
vCodigo_cuentabancaria = `codigo_cuentabancaria` (no visible)
vCuentaNombre = `nombre` (visible)
vCuentaBanco = `banco` (visible)


vMontoPago = Inicializar con VfMonto. Debe ser editable para permitir pago parcial.
vMontoPendiente = VfMonto.
Permitir no registrar pago (vMontoPago vacio o 0).
Permitir registrar mas de un pago: cada pago se agrega a una lista `vPagos`.
Al confirmar un pago, recalcular vMontoPendiente = vMontoPendiente - vMontoPago y prellenar el siguiente vMontoPago con ese nuevo vMontoPendiente.

## Paso 6. Asignar Base.

vBaseNombre = Select (Llamada SP: `get_bases()` devuelve `nombre`)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vcodigo_base no visible editable
vBaseNombre visible editable

En este paso, primero construir un JSON con el contenido del grid “vProdFactura” y usarlo junto con la fecha/hora de emision de la factura (vFechaP, no vFechaPedido) para consultar las bases candidatas.

Llamada SP: `get_bases_candidatas(p_vProdFactura JSON, vFechaP DATETIME)`
Campos devueltos: `codigo_base`, `latitud`, `longitud`
Uso: mostrar estas bases candidatas como ayuda/preview para decidir la base a asignar. Si hay bases candidatas, priorizarlas en la lista.
Regla de cupo: `get_bases_candidatas` SI debe respetar `base_horarios.cantidad_pedidos < maximo_pedidos`.
Regla manual: la asignacion manual de base NO debe bloquearse por cupo de horario; puede elegir base aunque ya este en el maximo.
Mostrar dos listados simultaneos:
(a) Bases candidatas por stock/horario (SP `get_bases_candidatas`),
(b) Bases con tiempo estimado de llegada (Google Distance Matrix), ordenadas por menor tiempo.

El tiempo estimado debe calcularse SOLO con las bases retornadas por `get_bases_candidatas`. Si no hay candidatas, no calcular ETA y mostrar "Sin bases candidatas".

Seleccion automatica de base por tiempo de llegada (obligatorio):
Variables involucradas:
vLatitud, vLongitud (origen)
codigo_base, nombre, latitud, longitud (bases)
vcodigo_base, vBaseNombre (salida)

Si vLatitud y vLongitud estan definidos, llamar Google Distance Matrix API con:
origins = vLatitud,vLongitud
destinations = bases.latitud,bases.longitud
mode = driving

Seleccionar la base con menor duration.value.
Asignar automaticamente:
vcodigo_base = codigo_base de la base seleccionada
vBaseNombre = nombre de la base seleccionada

El campo vBaseNombre sigue siendo select editable con valor inicial sugerido.
El usuario puede seleccionar manualmente cualquier base de `get_bases()`; la sugerida solo preselecciona.
Si la API falla o faltan coordenadas, no sugerir base.
Recalcular cada vez que cambien vLatitud o vLongitud.

Formato del JSON (ejemplo):
[
  {
    "vFProductoCodigo": 1,
    "vFCantidadProducto": 2,
    "vFPrecioTotal": 150.50
  },
  {
    "vFProductoCodigo": 2,
    "vFCantidadProducto": 1,
    "vFPrecioTotal": 75.00
  }
]


## Paso 7. Resumen y Emitir Factura.

Mostrar resumen de Pedido, Factura y Entrega, con boton "Emitir Factura".

Resumen Entrega (explicito):
Mostrar si el punto es EXISTENTE o NUEVO (se registrara)

Resumen Recibe:
Mostrar si el numrecibe es EXISTENTE o NUEVO (se registrara).

Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton "Emitir Factura" el sistema debera realizar las siguientes transacciones sobre la DB:

## Grabar el Punto_entrega si hubiera. Tomar los datos capturados en el paso 3:

## registrarlos en la tabla puntos_entrega
ubigeo=vUbigeo
codigo_puntoentrega=vCodigo_puntoentrega
codigo_cliente_puntoentrega=vClienteCodigo
direccion_linea=vDireccionLinea
referencia=vReferencia
nombre=vNombre
dni=vDni
agencia=vAgencia
observaciones=vObservaciones
region_entrega=vRegion_Entrega
concatenarpuntoentrega = vConcatenarPuntoEntrega
latitud = vLatitud
longitud = vLongitud

## Grabar el numrecibe si hubiera. Tomar los datos capturados en el paso 4:
## registrarlos en la tabla numrecibe
ordinal_numrecibe=vOrdinal_numrecibe
numero=vNumeroRecibe
nombre=vNombreRecibe
codigo_cliente_numrecibe=vClienteCodigo
concatenarnumrecibe = vConcatenarNumRecibe

## Grabar Factura. Tomar los datos capturados en el paso 2 (factura) y paso 6 (base):
## Guardar en la tabla "mov_contable". 
codigo_pedido=vcodigo_pedido
fecha_emision=vFechaP
fecha_vencimiento=vFechaP
fecha_valor=vFechaP
codigo_cliente=vClienteCodigo
montodetalleproductos=VfMontoDetalleProductos
monto=VfMonto
saldo=VfMonto
tipo_documento="FAC"
numero_documento=vNumero_documento
codigo_base=vcodigo_base
codigo_cliente_numrecibe= (si vRegion_Entrega = "LIMA") vClienteCodigo, si no NULL
ordinal_numrecibe= (si vRegion_Entrega = "LIMA") vOrdinal_numrecibe, si no NULL
codigo_cliente_puntoentrega=vClienteCodigo
codigo_puntoentrega=vCodigo_puntoentrega
costoenvio=vCostoEnvio

## Guardar en la tabla "mov_contable_detalle". 
tipo_documento="FAC"
numero_documento=vNumero_documento
ordinal=correlativo por item (1,2,3...) en facturas nuevas; si es edicion usar vOrdinalDetMovCont calculado
codigo_producto=vFProductoCodigo
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

Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteCodigo, vTipo_documento, mov_contable.saldo)`.

## Registrar Recibo (Pago)
Si existen pagos en `vPagos`:
Por cada pago en `vPagos`, registrar el recibo con los valores de la lista.
Guardar en la tabla "mov_contable":
codigo_cliente=vClienteCodigo
tipo_documento="RCP"
numero_documento=secuencial segun la regla definida en Paso 5
fecha_emision=vFechaP
fecha_vencimiento=vFechaP
fecha_valor=vFechaP
codigo_cuentabancaria=vCodigo_cuentabancaria
monto=monto_pago
saldo=monto_pago

Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteCodigo, vTipo_documento_pago, monto_pago)`.

Aplicar el recibo contra facturas (de la mas reciente a la mas antigua) y registrar en Facturas_Pagadas:
`CALL aplicar_recibo_a_facturas(vClienteCodigo, vNumero_documento_pago, monto_pago)`

Actualizar saldo del cliente por cada pago:
`CALL actualizarsaldosclientes(vClienteCodigo, "RCP", monto_pago)`

### Aplicar saldo a favor (NTC/RCP) a la factura
Si `vSaldoFavorUsar > 0`, ejecutar:
`CALL aplicar_saldo_favor_a_factura(vClienteCodigo, vNumero_documento, vSaldoFavorUsar)`

Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_documento, vNumero_documento)` (usa el codigo_pedido vinculado en mov_contable).

No utilizar datos mock

Solo utilizar datos reales de la base de datos especificada en erp.yml
