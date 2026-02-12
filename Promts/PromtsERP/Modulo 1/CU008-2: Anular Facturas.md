**  

CU008: Anular Facturas.

  
# **Prompt AI.
Modulo: 1.
Caso de uso: CU008 - M1AnularFacturas.
Puerto del wizard: 3008 (ver `Promts/Herramientas/puertos.json`).


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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-008/logs/`.
El archivo debe nombrarse `CU008-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Anular Facturas.
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar cliente y factura (paquete llegado).
2. Ver detalle de factura (solo lectura).
3. Confirmar y anular factura.

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

Reglas:
- Filtrar la lista de paquetes por `vCodigo_cliente` seleccionado (solo paquetes del cliente).
- El `codigo_paquete` corresponde al numero de factura.
- El `tipo_documento` de la factura seleccionada es siempre `FAC`.

Validaciones:
- vCodigo_cliente requerido.
- vFecha_emision requerida.
- vCodigo_paquete requerido.

## Paso 2  Ver detalle de factura (solo lectura).

vDetalleFactura = Llamada SP: `get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vCodigo_paquete)` (devuelve campo_visible)
Campos devueltos: `tipo_documento`, `numero_documento`, `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `saldo`, `precio_total`
Variables:
vCodigo_producto no visible no editable
vNombreProducto visible no editable
vCantidad visible no editable
vSaldo visible no editable
vPrecio_unitario no visible no editable
vPrecio_total visible no editable

Reglas:
- Mostrar un grid solo lectura con los productos de la factura.
- `vPrecio_unitario` = `precio_total / cantidad` (con la cantidad original). No editable.
- `vPrecio_total` = `vCantidad` * `vPrecio_unitario`.
- vTotalFactura = suma de vPrecio_total del grid.
- vOrdinalDetMovCont = regla sin ambiguedad:
  - Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid.

## Paso 3  Confirmar y anular factura.

- Mostrar resumen de cabecera y detalle.
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el proceso de anulacion. **No se debe registrar ningun documento nuevo** (no insertar en `mov_contable` ni `mov_contable_detalle`).

### Cambiar estado de la factura a anulado.
Ejecutar:
`UPDATE mov_contable SET estado = 'anulado', saldo = 0 WHERE tipo_documento = 'FAC' AND numero_documento = vCodigo_paquete`

### Revertir pagos aplicados a la factura anulada.
Ejecutar el procedimiento:
`CALL revertir_pagos_factura_cliente('FAC', vCodigo_paquete)`
- El procedimiento debe buscar en `Facturas_Pagadas` todas las aplicaciones hechas a esa factura.
- Por cada aplicacion, debe aumentar el `saldo` del documento pagador (`RCP`/`NTC`) en `mov_contable`.
- Luego debe eliminar esas filas de `Facturas_Pagadas` para evitar doble reversa.

### Devolver productos a inventario usando cantidad negativa.
Por cada item del detalle ejecutar:
`CALL upd_stock_bases(vCodigo_base, vCodigo_producto, -vCantidad, "FAC", vCodigo_paquete)`

### Borrar partidas consumidas por esa factura.
Ejecutar:
`DELETE FROM detalle_movs_partidas WHERE tipo_documento_venta = 'FAC' AND numero_documento = vCodigo_paquete`

### Actualizar saldo del cliente.
Ejecutar el procedimiento:
`CALL actualizarsaldosclientes(vCodigo_cliente, 'FAC', -vTotalFactura)`

No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml.

  
**
