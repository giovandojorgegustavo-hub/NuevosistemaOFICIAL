**

CU2-002: Transferencias

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU2-002` (siempre `wizard/CU2-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre node.js

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU2-002/logs/`.
- El archivo debe nombrarse `CU2-002-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Registrar transferencia (TRS)

# **Pasos del formulario-multipaso.

1. Registrar Transferencia (TRS).
2. Registrar movimiento y actualizar saldo_stock.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Registrar Transferencia (TRS).

vFecha = Inicializar con la fecha del sistema.

vTipodocumentostock = "TRS".

vNumdocumentostock = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipodocumentostock` (si no hay filas, usar 1). No editable.

vCodigo_base = Seleccionar de la lista de Bases devuelta por el SP get_bases.

vCodigo_basedestino = Seleccionar de la lista de Bases devuelta por el SP get_bases.

Presentar un Grid editable llamado "vDetalleTransferencia" que permita agregar, borrar y editar lineas. El Grid debe tener las siguientes columnas: vcodigo_producto, Vcantidad.

vcodigo_producto = ofrecer la lista de productos que devuelve el SP get_productos.
Vcantidad= es un campo editable


ordinaldetalle =se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipodocumentostock AND numdocumentostock = vNumdocumentostock` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Paso 2. Registrar movimiento y actualizar saldo_stock.

Al terminar el formulario multipasos, cuando el usuario da click al boton "Registrar Transferencia" el sistema debera realizar las siguientes transacciones sobre la DB:

- Guardar en la tabla `movimiento_stock`: 
 tipodocumentostock=vTipodocumentostock
 numdocumentostock=vNumdocumentostock
 fecha=vFecha
 codigo_base=vCodigo_base
 codigo_basedestino=vCodigo_basedestino.

- Guardar en la tabla `detalle_movimiento_stock` los datos del grid "vDetalleTransferencia" con ordinal correlativo por item.

ordinal=ordinaldetalle
tipodocumentostock=
numdocumentostock=vNumdocumentostock
codigo_producto=vcodigo_producto
cantidad=Vcantidad

- Ejecutar el SP `get_actualizarsaldosstocktrs(vTipodocumentostock, vNumdocumentostock)` para actualizar `saldo_stock`.


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
