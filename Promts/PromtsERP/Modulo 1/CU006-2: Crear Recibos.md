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
CU006: Crear Recibos.

  
# **Prompt AI.
Modulo: 1.
Caso de uso: CU006 - M1CrearRecibos.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.



Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-006/logs/`.
El archivo debe nombrarse `CU006-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Registrar Recibo.
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Listar clientes con saldo pendiente.
2. Registrar pago (datos del recibo).
3. Confirmar y registrar recibo.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1  Listar clientes con saldo pendiente.

Mostrar un Grid llamado "vClientesPendientes" que llama al siguiente SP: `get_clientes_saldo_pendiente()` (devuelve campo_visible)
Campos devueltos: `codigo_cliente`, `nombre`, `saldo_final`
Variables:
vCodigo_cliente no visible no editable
vNombreCliente visible no editable
vSaldoPendiente visible no editable

Accion:
- Seleccionar un cliente para continuar al paso 2.


## Paso 2  Registrar pago.

Al seleccionar un cliente, mostrar sus datos (solo nombre y saldo pendiente) y debajo el formulario de pago.

Variables:
vCodigo_cliente = Cliente seleccionado en el paso 1 (no editable).
vNombreCliente = nombre del cliente seleccionado (no editable).
vSaldoPendiente = saldo_final del cliente seleccionado (no editable).

Campos del pago:
vFecha_emision = Inicializar con la fecha del sistema (editable).
vTipo_documento = "RCP".
vNumero_documento = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(numero_documento), 0) + 1 AS next FROM mov_contable WHERE tipo_documento = 'RCP'` (si no hay registros empieza en 1).
vCuentas = Llamada SP: `get_cuentasbancarias()` (devuelve campo_visible)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:
vCodigo_cuentabancaria no visible editable
vCuentaNombre visible editable
vCuentaBanco visible editable
vMonto = campo numerico para escribir el monto del recibo (mayor que 0 y menor o igual a vSaldoPendiente).

Validaciones:
- vMonto > 0.
- vMonto <= vSaldoPendiente.
- vCodigo_cuentabancaria requerido.


## Paso 3  Confirmar y registrar recibo.

- Mostrar resumen de cliente y pago (nombre, saldo pendiente, monto a pagar, fecha, cuenta bancaria).
- Requerir confirmacion explicita.
- Al confirmar, ejecutar el registro del recibo y actualizar saldos.

## Grabar Recibo. Tomar los datos capturados en el paso 2:

### Guardar en la tabla "mov_contable".
codigo_cliente=vCodigo_cliente  
tipo_documento=vTipo_documento  
numero_documento=vNumero_documento  
fecha_emision=vFecha_emision  
fecha_vencimiento=vFecha_emision  
fecha_valor=vFecha_emision  
codigo_cuentabancaria=vCodigo_cuentabancaria  
monto=vMonto  
saldo=vMonto  

### Aplicar recibo contra facturas
- Ejecutar `CALL aplicar_recibo_a_facturas(vCodigo_cliente, vNumero_documento, vMonto)` para actualizar saldo de `mov_contable` y registrar en `Facturas_Pagadas`.

### Actualizar saldo del cliente
- Ejecutar el procedimiento `actualizarsaldosclientes(vCodigo_cliente, vTipo_documento, vMonto)`.


No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml.

  
**
