**

CU3001: Compras Factura

# **Prompt AI.
Modulo: 3.
Caso de uso: CU3001 - M3ComprasFactura.
Puerto del wizard: 3012 (ver `Promts/Herramientas/puertos.json`).


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
- Facturar Compra
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar o Crear Proveedor.
2. Agregar productos.
3. Confirmar y Facturar Compra.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Seleccionar o Crear Proveedor.

vFecha = Inicializar con la fecha del sistema.

Mostrar un checklist/radio con opciones: "Proveedor existente" y "Proveedor nuevo".

Proveedor existente (opcion por defecto):
vProveedores = Llamada SP: `get_proveedores()` (devuelve campo_visible)
Campos devueltos: `codigo_provedor`, `nombre`
Variables:
vCodigo_provedor no visible no editable
vNombreProvedor visible editable

Proveedor nuevo:
vCodigo_provedor = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(codigo_provedor), 0) + 1 AS next FROM provedores` (si no hay registros empieza en 1).
No visible.
vNombreProvedor = campo visible y editable.

## Paso 2. Agregar productos.

vTipo_documento_compra = "FCC".

vNum_documento_compra = calcular con SQL:
`SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = vTipo_documento_compra` (si no hay filas, usar 1). No editable.

Presentar un Grid editable llamado "vDetalleCompra" que permita agregar, borrar y editar lineas.

vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vcodigo_producto no visible editable
vNombreProducto visible editable

Vcantidad = es editable. si es visible. Acepta decimales con hasta 2 digitos.
Vsaldo=0 no es visible
monto=es editable. si es visible

vTotal_compra=la suma de todos los monto que hay en vDetalleCompra


vordinalmovstockdetalles = regla sin ambiguedad:
- Asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid (documento nuevo).



## Paso 3. Confirmar y Facturar Compra.

Mostrar resumen de la compra (proveedor, fecha, total y detalle).
Boton: "Facturar Compra".


Al terminar el formulario multipasos, cuando el usuario da click al boton "Facturar Compra" el sistema debera realizar las siguientes transacciones sobre la DB:


- Guardar en la tabla `mov_contable_prov` con estos campos (una fila por campo):

  - tipo_documento_compra = vTipo_documento_compra
  - num_documento_compra = vNum_documento_compra
  - codigo_provedor = vCodigo_provedor
  - fecha = vFecha
  - monto = vTotal_compra

- Guardar en la tabla `detalle_mov_contable_prov` los datos del grid "vDetalleCompra" con ordinal correlativo por item, con estos campos (una fila por campo):
  - tipo_documento_compra = vTipo_documento_compra
  - num_documento_compra = vNum_documento_compra
  - codigo_provedor = vCodigo_provedor
  - ordinal = vordinal
  - codigo_producto = vDetalleCompra.codigo_producto
  - cantidad = vDetalleCompra.cantidad
  - cantidad_entregada = 0
  - saldo = 0
  - monto = vDetalleCompra.monto

- Actualizar el saldo del proveedor ejecutando el procedimiento:
  - `CALL actualizarsaldosprovedores(vCodigo_provedor, vTipo_documento_compra, vTotal_compra)`









No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**