**

CU3004: Anular Factura Provedor

# **Prompt AI.
Modulo: 3.
Caso de uso: CU3004 - M3AnularFacturaProvedor.
Puerto del wizard: 3015 (ver `Promts/Herramientas/puertos.json`).


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

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre node.js

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 3/CU3-004/logs/`.
- El archivo debe nombrarse `CU3004-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Anular Factura Provedor
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar proveedor y factura de compra.
2. Ver detalle de factura (solo lectura).
3. Confirmar y anular factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Seleccionar proveedor y factura de compra.

vFecha = Inicializar con la fecha del sistema.

vProveedores = Llamada SP: `get_proveedores()` (devuelve campo_visible)
Campos devueltos: `codigo_provedor`, `nombre`
Variables:
vCodigo_provedor no visible editable
vNombreProvedor visible editable

vFacturasCompras = Llamada SP: `get_facturascompras_pendientes()` (devuelve campo_visible)
Campos devueltos: `tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `nombre_provedor`, `fecha`
Variables:
vTipo_documento_compra visible no editable
vNum_documento_compra visible editable
vFecha_factura visible no editable
vMonto_factura visible no editable
vSaldo_factura visible no editable

Reglas:
- Filtrar la lista de facturas por `vCodigo_provedor` seleccionado (solo facturas del proveedor).
- El tipo de documento de compra a anular es el devuelto por el SP (normalmente `FCC`).
- Obtener los montos del encabezado con SQL:
  `SELECT monto, saldo FROM mov_contable_prov WHERE tipo_documento_compra = vTipo_documento_compra AND num_documento_compra = vNum_documento_compra AND codigo_provedor = vCodigo_provedor`

Validaciones:
- vCodigo_provedor requerido.
- vNum_documento_compra requerido.

## Paso 2  Ver detalle de factura (solo lectura).

vDetalleCompra = Llamada SP: `get_detalle_compra_por_documento(p_tipo_documento_compra=vTipo_documento_compra, p_num_documento_compra=vNum_documento_compra, p_codigo_provedor=vCodigo_provedor)` (devuelve campo_visible)
Campos devueltos: `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `cantidad_entregada`, `saldo`
Variables:
vOrdinal visible no editable
vCodigo_producto no visible no editable
vNombreProducto visible no editable
vCantidad visible no editable
vCantidad_entregada visible no editable
vSaldo visible no editable

Reglas:
- Mostrar un grid solo lectura con el detalle de la factura.
- vTotalFactura = vMonto_factura (solo informativo).

## Paso 3  Confirmar y anular factura.

- Mostrar resumen de cabecera y detalle.
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el proceso de anulacion. **No se debe registrar ningun documento nuevo** (no insertar en `mov_contable_prov` ni `detalle_mov_contable_prov`).

### Cambiar estado de la factura de compra a anulado.
Intentar ejecutar:
`UPDATE mov_contable_prov
 SET estado = 'anulado'
 WHERE tipo_documento_compra = vTipo_documento_compra
   AND num_documento_compra = vNum_documento_compra
   AND codigo_provedor = vCodigo_provedor`

### Revertir stock usando cantidad negativa.
Obtener base asociada a la compra (si existe) desde `movimiento_stock`:
`SELECT codigo_base
 FROM movimiento_stock
 WHERE tipo_documento_compra = vTipo_documento_compra
   AND num_documento_compra = vNum_documento_compra
   AND codigo_provedor = vCodigo_provedor
 ORDER BY fecha DESC
 LIMIT 1`
Por cada item del detalle ejecutar:
`CALL upd_stock_bases(vCodigo_base, vCodigo_producto, -vCantidad, 'REM', vNum_documento_compra)`

### Borrar partidas ligadas a esa compra.
Ejecutar:
`DELETE FROM detalle_movs_partidas
 WHERE tipo_documento_compra = vTipo_documento_compra
   AND num_documento_compra = vNum_documento_compra
   AND codigo_provedor = vCodigo_provedor`

### Actualizar saldo del proveedor.
Ejecutar el procedimiento existente:
`CALL actualizarsaldosprovedores(vCodigo_provedor, 'RCC', vTotalFactura)`

### TODO: Logica especifica de anulacion (pendiente de definicion)
Agregar aqui la logica especial de anulacion, por ejemplo:
- Si tambien se deben revertir pagos ya aplicados, usar `Facturas_Pagadas_Prov` y devolver saldo a `RCC`.
- Definir si la anulacion exige bloquear cuando la compra ya fue consumida en otras partidas.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
