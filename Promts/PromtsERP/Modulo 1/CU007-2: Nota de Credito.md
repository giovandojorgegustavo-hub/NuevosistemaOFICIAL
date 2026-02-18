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
CU007: Nota de Credito.

  
# **Prompt AI.
Modulo: 1.
Caso de uso: CU007 - M1NotaCreditoPedido.
Puerto del wizard: 3007 (ver `Promts/Herramientas/puertos.json`).


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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-007/logs/`.
El archivo debe nombrarse `CU007-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Emitir Nota de Credito.
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar cliente, factura y tipo de nota de credito.
2. (Producto) Editar detalle de factura para nota de credito parcial.
3. (Dinero) Registrar monto de nota de credito.
4. Confirmar y emitir Nota de Credito.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Seleccionar cliente y factura (paquete llegado).

vFecha_emision = Inicializar con la fecha del sistema.
vClientes = Llamada SP: `get_clientes()` (devuelve campo_visible)
Campos devueltos: `codigo_cliente`, `nombre`, `numero`
Variables:
vCodigo_cliente no visible editable
vNombreCliente visible editable

vPaquetesLlegados = Llamada SP: `get_paquetes_por_estado(p_estado="llegado")` (devuelve campo_visible)
Campos devueltos: `codigo_paquete`, `fecha_actualizado`, `codigo_cliente`, `nombre_cliente`, `num_cliente`, `codigo_puntoentrega`, `codigo_base`, `nombre_base`, `codigo_packing`, `nombre_packing`, `ordinal_numrecibe`, `concatenarpuntoentrega`, `region_entrega`, `latitud`, `longitud`, `concatenarnumrecibe`
Variables:
vCodigo_paquete visible editable
vFecha_actualizado visible no editable
vCodigo_base visible no editable
vNombre_base visible no editable
vCodigo_packing visible no editable
vNombre_packing visible no editable
vRegion_entrega visible no editable (solo fallback si no existe nombre_base)

vTipo_nota = Seleccion en checklist/radio (Productos o Dinero).
Variables:
vTipo_nota visible editable

Reglas:
- Filtrar la lista de paquetes por `vCodigo_cliente` seleccionado (solo paquetes del cliente).
- El `codigo_paquete` corresponde al numero de factura.
- El `tipo_documento` de la factura seleccionada es siempre `FAC`.

vTipo_documento = "NTC".
vNumero_documento = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTC'` (si no hay registros empieza en 1).

Validaciones:
- vCodigo_cliente requerido.
- vFecha_emision requerida.
- vCodigo_paquete requerido.
- vTipo_nota requerida.

Reglas de flujo:
- Si vTipo_nota = Productos, continuar al Paso 2 y omitir Paso 3.
- Si vTipo_nota = Dinero, omitir Paso 2 e ir al Paso 3.

## Paso 2  Editar detalle de factura para nota de credito parcial (solo Productos).

vDetalleFactura = Llamada SP: `get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vCodigo_paquete)` (devuelve campo_visible)
Campos devueltos: `tipo_documento`, `numero_documento`, `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `saldo`, `precio_total`
Variables:
vCodigo_producto no visible no editable
vNombreProducto visible no editable
vCantidad_original no visible no editable (inicializar con `cantidad`)
vCantidad visible editable (inicializar con `cantidad`, permite nota de credito parcial)
vSaldo no visible no editable
vPrecio_unitario no visible no editable
vPrecio_total visible no editable

Reglas:
- Mostrar un grid editable con los productos de la factura.
- `vCantidad` se puede reducir (parcial), no se permite aumentar por encima de `vCantidad_original`.
- `vPrecio_unitario` = `precio_total / cantidad` (con la cantidad original). No editable.
- `vPrecio_total` = `vCantidad` * `vPrecio_unitario` (recalcular al cambiar `vCantidad`).
- vTotalNota = suma de vPrecio_total del grid.
- vOrdinalDetMovCont = regla sin ambiguedad:
  - Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid.

Validaciones:
- Debe existir al menos una linea con vCantidad > 0.

## Paso 3  Registrar monto de nota de credito (solo Dinero).

vMonto_dinero visible editable (input numerico).

Reglas:
- vTotalNota = vMonto_dinero.
- No se genera detalle.

Validaciones:
- vMonto_dinero > 0.

## Paso 4  Confirmar y emitir Nota de Credito.

- Mostrar resumen de cabecera y detalle.
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el registro de la Nota de Credito.


### Guardar en la tabla "mov_contable".
codigo_pedido = `mov_contable.codigo_pedido` de la FAC origen (`vCodigo_paquete`) cuando la nota es de tipo Producto.  
fecha_emision=vFecha_emision  
tipo_documento=vTipo_documento  
numero_documento=vNumero_documento  
codigo_cliente=vCodigo_cliente  
codigo_base=vCodigo_base  
monto=vTotalNota  
saldo=vTotalNota  

### Guardar en la tabla "mov_contable_detalle" (solo Productos).
tipo_documento=vTipo_documento  
numero_documento=vNumero_documento  
ordinal=vOrdinalDetMovCont  
codigo_producto=vCodigo_producto  
cantidad=vCantidad  
saldo=vSaldo  
precio_total=vPrecio_total  

### Actualizar stock por cada linea (entrada a inventario) (solo Productos).
Por cada item del detalle ejecutar:
`CALL upd_stock_bases(vCodigo_base, vCodigo_producto, vCantidad, vTipo_documento, vNumero_documento)`

### Aplicar Nota de Credito a la factura (si tiene saldo).
Ejecutar:
`CALL aplicar_nota_credito_a_factura(vTipo_documento, vNumero_documento, "FAC", vCodigo_paquete, vTotalNota)`
- Si la factura ya tiene saldo 0, no aplica nada y la NTC queda con saldo completo.

### Actualizar saldo de cliente.
Ejecutar:
`CALL actualizarsaldosclientes(vCodigo_cliente, vTipo_documento, vTotalNota)`

### Revertir partidas de compras por nota de credito (solo Productos).
Por cada item del detalle ejecutar:
`CALL aplicar_devolucion_partidas("FAC", vCodigo_paquete, vTipo_documento, vNumero_documento, vCodigo_producto, vCantidad)`

### Revertir saldo del pedido (parcial, solo Productos).
Ejecutar:
`CALL revertir_salidaspedidos(vTipo_documento, vNumero_documento)`
- Este SP debe usar el `codigo_pedido` guardado en la NTC y el detalle de la NTC para reponer `pedido_detalle.saldo` por producto/cantidad.

No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml.

  
**
