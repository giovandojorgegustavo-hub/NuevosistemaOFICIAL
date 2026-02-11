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
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Registrar Ajuste (AJE/AJS).
2. Confirmar y registrar ajuste.

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
Al seleccionar una base, el grid debe listar automaticamente todos los productos, mostrando `Vcantidad_sistema` desde `saldo_stock` (0 si no existe). El usuario solo actualiza `Vcantidad_real`.

El Grid debe tener las siguientes columnas:
vcodigo_producto, Vcantidad_sistema, Vcantidad_real, Vcantidad,
Vmonto (solo AJE, costo total por item; en AJS el campo es invisible).
Vcantidad_sistema = cargar automaticamente desde la suma de `detalle_mov_contable_prov.saldo` por `vcodigo_producto` (saldo de partidas). Campo de solo lectura. se actualiza cada vez q se pone un producto o una base. no es editable

Vcantidad_real = campo editable donde el usuario registra el conteo fisico. Acepta decimales con hasta 2 digitos.
Vcantidad = campo calculado automaticamente como Vcantidad_real - Vcantidad_sistema. Campo de solo lectura. Esta es la cantidad que se debe registrar en el ajuste.

Vmonto = **no visible** en la interfaz. Se calcula en segundo plano para lineas AJE (Vcantidad > 0) y se envia en el payload.
Para lineas AJE, **llamar a un procedimiento** que reciba `vcodigo_producto` y devuelva el costo unitario del ultimo registro en `detalle_mov_contable_prov` (ordenado por fecha desc, num_documento_compra desc y ordinal desc). Luego **precargar** `Vmonto = costo_unitario * Vcantidad`. Si no existe costo, dejar `Vmonto` en blanco.

vordinaldetalle_AJS = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = 'AJS' AND numdocumentostock = vNumdocumentostock_AJS` (si no hay filas, usar 1).

vordinaldetalle_AJE = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = 'AJE' AND num_documento_compra = vNumdocumentostock_AJE AND codigo_provedor = vCodigo_provedor` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Paso 2. Confirmar y registrar ajuste.

- Mostrar resumen de base, productos y cantidades.
- Requerir confirmacion explicita antes de registrar.


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

## Tablas a registrar
movimiento_stock (AJS, si existen lineas con Vcantidad <= 0):
tipodocumentostock="AJS"  
numdocumentostock=vNumdocumentostock_AJS  
fecha=vFecha  
codigo_base=vCodigo_base  

detalle_movimiento_stock (AJS, por item con Vcantidad <= 0):
ordinal=vordinaldetalle_AJS  
tipodocumentostock="AJS"  
numdocumentostock=vNumdocumentostock_AJS  
codigo_producto=vcodigo_producto  
cantidad=ABS(Vcantidad)  

movimiento_stock (AJE, si existen lineas con Vcantidad > 0):
tipodocumentostock="AJE"  
numdocumentostock=vNumdocumentostock_AJE  
fecha=vFecha  
codigo_base=vCodigo_base  

mov_contable_prov (AJE, cabecera minima):
tipo_documento_compra="AJE"  
num_documento_compra=vNumdocumentostock_AJE  
codigo_provedor=vCodigo_provedor  
fecha=vFecha  
monto=SUM(Vmonto)  

detalle_mov_contable_prov (AJE, por item con Vcantidad > 0):
tipo_documento_compra="AJE"  
num_documento_compra=vNumdocumentostock_AJE  
codigo_provedor=vCodigo_provedor  
ordinal=vordinaldetalle_AJE  
codigo_producto=vcodigo_producto  
cantidad=Vcantidad  
cantidad_entregada=Vcantidad  
saldo=Vcantidad  
monto=Vmonto  

## Procedimientos que se llaman
`CALL aplicar_salida_partidas("AJS", vNumdocumentostock_AJS, vcodigo_producto, ABS(Vcantidad))` por item con Vcantidad < 0  
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto, ABS(Vcantidad), "AJE", vNumdocumentostock_AJE)` por item con Vcantidad > 0  
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto, ABS(Vcantidad), "AJS", vNumdocumentostock_AJS)` por item con Vcantidad < 0  

**
