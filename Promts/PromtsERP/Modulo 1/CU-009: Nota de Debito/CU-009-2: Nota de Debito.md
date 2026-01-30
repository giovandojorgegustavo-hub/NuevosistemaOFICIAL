**  

CU-009: Nota de Debito.

  
# **Prompt AI.


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.



Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados. Regla de ruta obligatoria:
Si el caso empieza con `CU-` (sin numero), usar `wizard/Modulo 1/CU-XXX/`.
Si empieza con `CU2-`, usar `wizard/Modulo 2/CU2-XXX/`.
Si empieza con `CU3-`, usar `wizard/Modulo 3/CU3-XXX/`.
Si no existe la carpeta del modulo, debe crearse.
Si no coincide con ningun prefijo, detenerse y pedir confirmacion del modulo. 

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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU-009/logs/`.
El archivo debe nombrarse `CU-009-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Emitir Nota de Debito.

# **Pasos del formulario-multipaso.

1. Crear Nota de Debito.
2. Confirmar y emitir Nota de Debito.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Crear Nota de Debito.

vFecha_emision = Inicializar con la fecha del sistema.
vCodigo_cliente = Seleccionar de la lista de Clientes devuelta por el SP `get_clientes()`.
vTipo_documento = "NTD".
vNumero_documento = regla sin ambiguedad:
- Si la nota de debito es NUEVA: calcular con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'NTD'`.
- Si YA EXISTE: mantener el valor actual de vNumero_documento.
vCodigo_base = Seleccionar de la lista de Bases devuelta por el SP `get_bases()` (opcional).

Si vCodigo_base tiene valor, presentar un Grid editable llamado "vProdNotaDebito" que permita agregar, borrar y editar lineas.
Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP `get_productos()`.

Columnas del Grid:
- vCodigo_producto=codigo_producto
- vCantidad=cantidad. Acepta decimales con hasta 2 digitos.
- vPrecio_unitario=precio_unitario (autocompletar con el producto seleccionado, no editable)
- vPrecio_total = vCantidad * vPrecio_unitario (no editable, recalcular al cambiar vCantidad)
- vSaldo = vCantidad (no editable)

vTotalNota = suma de vPrecio_total del grid "vProdNotaDebito".
vOrdinalDetMovCont = regla sin ambiguedad:
- Si la nota de debito es NUEVA: asignar ordinal secuencial por linea (1,2,3...) segun el indice del grid.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_detalle WHERE tipo_documento = vTipo_documento AND numero_documento = vNumero_documento`.

Validaciones:
- No permitir registrar la Nota de Debito si vCodigo_base tiene valor y el grid "vProdNotaDebito" no tiene lineas.
- vCodigo_cliente requerido.
- vFecha_emision requerida.


## Paso 2  Confirmar y emitir Nota de Debito.

- Mostrar resumen de cabecera y detalle.
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el registro de la Nota de Debito.

## Emitir Nota de Debito. Tomar los datos capturados en el paso 1:

### Guardar en la tabla "mov_contable".
fecha_emision=vFecha_emision  
tipo_documento=vTipo_documento  
numero_documento=vNumero_documento  
codigo_cliente=vCodigo_cliente  
codigo_base=vCodigo_base  
saldo=vTotalNota  

### Guardar en la tabla "mov_contable_detalle".
tipo_documento=vTipo_documento  
numero_documento=vNumero_documento  
ordinal=vOrdinalDetMovCont  
codigo_producto=vCodigo_producto  
cantidad=vCantidad  
saldo=vSaldo  
precio_total=vPrecio_total  

No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml.

  
**
