**

CU2-001: Compras Factura

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU2-001` (siempre `wizard/CU2-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU2-001/logs/`.
- El archivo debe nombrarse `CU2-001-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

# **Pasos del formulario-multipaso.

1. Crear Compra.
2. Confirmar y Facturar Compra.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Crear Compra.

vFecha = Inicializar con la fecha del sistema.

vCodigo_provedor = Seleccionar de la lista de Proveedores devuelta por el SP get_proveedores.

vTipo_documento_compra = "FCC".

vNum_documento_compra = calcular con SQL:
`SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_compras WHERE tipo_documento_compra = vTipo_documento_compra` (si no hay filas, usar 1). No editable.

Presentar un Grid editable llamado "vDetalleCompra" que permita agregar, borrar y editar lineas. El Grid debe tener las siguientes columnas: codigo_producto, cantidad, saldo, precio_compra.

Vcodigo_producto = ofrecer la lista de productos que devuelve el SP get_productos.
Vcantidad = es editable. si es visible
Vsaldo=0 no es visible
precio_compra=es editable. si es visible



vordinalmovstockdetalles= `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipo_documento_compra AND numdocumentostock = vNum_documento_compra ` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.



## Paso 2. Confirmar y Facturar Compra.

Al terminar el formulario multipasos, cuando el usuario da click al boton "Facturar Compra" el sistema debera realizar las siguientes transacciones sobre la DB:


- Guardar en la tabla `mov_contable_compras` con estos campos (una fila por campo):
  - tipo_documento_compra = vTipo_documento_compra
  - num_documento_compra = vNum_documento_compra
  - codigo_provedor = vCodigo_provedor
  - fecha = vFecha

- Guardar en la tabla `detalle_mov_contable_compras` los datos del grid "vDetalleCompra" con ordinal correlativo por item, con estos campos (una fila por campo):
  - tipo_documento_compra = vTipo_documento_compra
  - num_documento_compra = vNum_documento_compra
  - codigo_provedor = vCodigo_provedor
  - ordinal = vordinal
  - codigo_producto = vDetalleCompra.codigo_producto
  - cantidad = vDetalleCompra.cantidad
  - saldo = 0
  - precio_compra = vDetalleCompra.precio_compra

- Actualizar el saldo del proveedor ejecutando el procedimiento:
  - `CALL actualizarsaldosprovedores(vCodigo_provedor, vTipo_documento_compra, vTotal_compra)`
  - vTotal_compra = SUM(vDetalleCompra.cantidad * vDetalleCompra.precio_compra)










No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
