**

CU4002: Ajuste Stock

# **Prompt AI.
Modulo: 4.
Caso de uso: CU4002 - M4AjusteStock.
Puerto del wizard: 3017 (ver `Promts/Herramientas/puertos.json`).


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

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

Incluir manejo de errores y mejores practicas de UX.

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
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Registrar ajuste de stock: Entrada (AJE) y Salida (AJS)

# **Pasos del formulario-multipaso.

1. Registrar Ajuste (AJE/AJS).
2. Confirmar y ejecutar ajuste (actualizar partidas y saldo_stock).

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Registrar Ajuste (AJE/AJS).

vFecha = Inicializar con la fecha del sistema.

vTipodocumentostock = se determina automaticamente por linea:
  - "AJE" si Vcantidad > 0
  - "AJS" si Vcantidad < 0
  - Vcantidad = 0 se registra como "AJS" pero NO aplica partidas

vNumdocumentostock_AJE = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJE'` (si no hay filas, usar 1). No editable.

vNumdocumentostock_AJS = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = 'AJS'` (si no hay filas, usar 1). No editable.

vCodigo_provedor = usar proveedor generico 0:
- Si no existe, crearlo con SQL:
  `INSERT INTO provedores (codigo_provedor, nombre) VALUES (0, 'PROVEEDOR GENERICO')`
  (solo si no existe).

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vCodigo_base no visible editable
vBaseNombre visible editable

Presentar un Grid editable llamado "vDetalleAjuste" que permita agregar, borrar y editar lineas.
vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vcodigo_producto no visible editable
vNombreProducto visible editable

El Grid debe tener las siguientes columnas:
vcodigo_producto, Vcantidad_sistema, Vcantidad_real, Vcantidad,
Vmonto (solo AJE, costo total por item; en AJS el campo es invisible).
Vcantidad_sistema = cargar automaticamente desde la tabla saldo_stock segun vCodigo_base y vcodigo_producto (saldo_actual). Campo de solo lectura. se actualiza cada vez q se pone un producto o una base. no es editable

Vcantidad_real = campo editable donde el usuario registra el conteo fisico. Acepta decimales con hasta 2 digitos.
Vcantidad = campo calculado automaticamente como Vcantidad_real - Vcantidad_sistema. Campo de solo lectura. Esta es la cantidad que se debe registrar en el ajuste.

Vmonto = editable solo cuando la linea es AJE (Vcantidad > 0). Es el costo total por item. En AJS el campo es invisible y el valor se fuerza a 0.

vordinaldetalle_AJS = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = 'AJS' AND numdocumentostock = vNumdocumentostock_AJS` (si no hay filas, usar 1).

vordinaldetalle_AJE = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = 'AJE' AND num_documento_compra = vNumdocumentostock_AJE AND codigo_provedor = vCodigo_provedor` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Paso 2. Confirmar y ejecutar ajuste.

Al terminar el formulario multipasos, cuando el usuario da click al boton "Registrar Ajuste" el sistema debera realizar las siguientes transacciones sobre la DB:

Nota: Por cada ajuste se generan 2 registros de cabecera en movimiento_stock:
- Uno para AJE (si hay lineas positivas).
- Otro para AJS (si hay lineas negativas).
Cada cabecera tiene su propio numdocumentostock correlativo.

- Si existen lineas con Vcantidad < 0 (AJS - Ajuste Salida):
  - Crear cabecera en `movimiento_stock` con tipodocumentostock = "AJS" y su numdocumentostock propio.
  - Guardar en la tabla `detalle_movimiento_stock` los datos del grid "vDetalleAjuste" con ordinal correlativo por item:
    - ordinal=vordinaldetalle_AJS
    - tipodocumentostock="AJS"
    - numdocumentostock=vNumdocumentostock_AJS
    - codigo_producto=vcodigo_producto
    - cantidad=ABS(Vcantidad)
  - Por cada item, aplicar partidas consumiendo saldos mas antiguos con:
    - `CALL aplicar_salida_partidas("AJS", vNumdocumentostock_AJS, vcodigo_producto, ABS(Vcantidad))`
    - Este procedimiento descuenta saldo en `detalle_mov_contable_prov` y registra en `detalle_movs_partidas`.

- Si existen lineas con Vcantidad = 0:
  - Registrar en `detalle_movimiento_stock` como "AJS" (cantidad = 0) para trazabilidad.
  - NO aplicar `aplicar_salida_partidas`.

- Si existen lineas con Vcantidad > 0 (AJE - Ajuste Entrada):
  - Crear cabecera en `movimiento_stock` con tipodocumentostock = "AJE" y su numdocumentostock propio.
  - Crear cabecera minima en `mov_contable_prov` (para cumplir FK del detalle):
    - tipo_documento_compra = "AJE"
    - num_documento_compra = vNumdocumentostock_AJE
    - codigo_provedor = vCodigo_provedor (0)
    - fecha = vFecha
    - monto = SUM(Vmonto)
  - Registrar detalle en `detalle_mov_contable_prov` con ordinal correlativo por item:
    - tipo_documento_compra = "AJE"
    - num_documento_compra = vNumdocumentostock_AJE
    - codigo_provedor = vCodigo_provedor
    - ordinal = vordinaldetalle_AJE
    - codigo_producto = vcodigo_producto
    - cantidad = Vcantidad
    - cantidad_entregada = Vcantidad
    - saldo = Vcantidad
    - monto = Vmonto

- Actualizar `saldo_stock` usando el SP unico `upd_stock_bases` por cada item del grid `vDetalleAjuste`.
  Para cada fila:
  - `p_codigo_base = vCodigo_base`
  - `p_codigo_producto = vcodigo_producto`
  - `p_cantidad = ABS(Vcantidad)`
  - `p_tipodoc = ("AJE" si Vcantidad > 0, "AJS" si Vcantidad < 0)` (el SP debe soportar AJE/AJS)
  - `p_numdoc = (vNumdocumentostock_AJE o vNumdocumentostock_AJS segun linea)`


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
