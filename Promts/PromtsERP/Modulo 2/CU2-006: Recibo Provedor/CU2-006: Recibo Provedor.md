**

CU2-006: Recibo Provedor

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados. Regla de ruta obligatoria:
- Si el caso empieza con `CU-` (sin numero), usar `wizard/Modulo 1/CU-XXX/`.
- Si empieza con `CU2-`, usar `wizard/Modulo 2/CU2-XXX/`.
- Si empieza con `CU3-`, usar `wizard/Modulo 3/CU3-XXX/`.
- Si no existe la carpeta del modulo, debe crearse.
- Si no coincide con ningun prefijo, detenerse y pedir confirmacion del modulo. 

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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-006/logs/`.
- El archivo debe nombrarse `CU2-006-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Registrar Recibo Provedor

# **Pasos del formulario-multipaso.

1. Listar proveedores con saldo pendiente.
2. Registrar pago (datos del recibo).
3. Confirmar y registrar recibo.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Listar proveedores con saldo pendiente.

Cargar un Grid llamado "vProveedoresPendientes" con las tuplas devueltas por el SP `get_proveedores_saldos_pendientes()`.

Columnas visibles del Grid:
- vNombreProvedor=nombre
- vSaldoPendiente=saldo_final

Columnas no visibles:
- vCodigo_provedor=codigo_provedor

Accion:
- Seleccionar un proveedor para continuar al paso 2.


## Paso 2  Registrar pago.

Al seleccionar un proveedor, mostrar sus datos (solo nombre y saldo pendiente) y debajo el formulario de pago.

Variables:
vCodigo_provedor = Proveedor seleccionado en el paso 1 (no editable).
vNombreProvedor = nombre del proveedor seleccionado (no editable).
vSaldoPendiente = saldo_final del proveedor seleccionado (no editable).

Campos del pago:
vFecha = Inicializar con la fecha del sistema (editable).
vTipo_documento_compra = "RCC".
vNum_documento_compra = correlativo numerico (12 digitos) no editable. Se debe generar con SQL: 
`SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = 'RCC'`.
vCodigo_cuentabancaria = Seleccionar de la lista de cuentas bancarias devuelta por el SP `get_cuentasbancarias()`.
vMonto = campo numerico para escribir el monto del recibo (mayor que 0 y menor o igual a vSaldoPendiente).

Validaciones:
- vMonto > 0.
- vMonto <= vSaldoPendiente.
- vCodigo_cuentabancaria requerido.


## Paso 3  Confirmar y registrar recibo.

- Mostrar resumen de proveedor y pago (nombre, saldo pendiente, monto a pagar, fecha, cuenta bancaria).
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el registro del recibo y actualizar saldos.

## Grabar Recibo. Tomar los datos capturados en el paso 2:

### Guardar en la tabla "mov_operaciones_contables".
tipodocumento=vTipo_documento_compra  
numdocumento=vNum_documento_compra  
fecha=vFecha  
monto=vMonto  
codigo_cuentabancaria=vCodigo_cuentabancaria  
codigo_cuentabancaria_destino=NULL  
descripcion=opcional  

### Detalle
Para recibos proveedores (RCC) no registrar detalle.

### Actualizar saldo del proveedor
- Ejecutar el procedimiento `actualizarsaldosprovedores(vCodigo_provedor, vTipo_documento_compra, vMonto)`.

### Actualizar saldo bancario
- Ejecutar el procedimiento `aplicar_operacion_bancaria(vTipo_documento_compra, vNum_documento_compra)`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
