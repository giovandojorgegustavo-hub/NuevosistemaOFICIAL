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
C12: Crear Recibos Proveedores

# **Prompt AI.
Caso de uso: C12 - Crear Recibos Proveedores.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de un solo paso para crear recibos de proveedores.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/C12 Crear Recibos Proveedores` como ruta del caso de uso.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (alerts, cards, etc.)
- Responsive design para moviles
- El Backend consulta/inserta en MySQL con endpoints js corriendo sobre node.js

**User Experience (UX)
Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/C12 Crear Recibos Proveedores/logs/`.
- El archivo debe nombrarse `C12-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Barra de progreso visual (aunque sea un paso, para consistencia)
- Estados de loading y error
- Ver Logs de sentencias SQL (no en interfaz)
- Formulario de captura de datos del recibo
- Boton "Crear Recibo"
- Transaccionalidad: si falla el insert, mostrar error y no guardar.
- Al finalizar: limpiar formulario y mostrar mensaje de exito.

# **Paso del formulario.
1. Datos del Recibo.

# **Descripcion de los pasos del formulario de registro.
Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Datos del Recibo.

vProveedores = Llamada SP: `get_proveedores()` (devuelve campo_visible)
Campos devueltos: `codigo_proveedor`, `nombre_proveedor`
Variables:
vCodigo_proveedor visible editable (Select Typeahead)
vFecha = campo fecha (default hoy). Visible editable.
vImporte = campo numerico (decimal). Visible editable.
vConcepto = campo texto. Visible editable.
vReferencia = campo texto (opcional). Visible editable.

Reglas:
- `vCodigo_proveedor`, `vFecha`, `vImporte` son obligatorios.
- `vImporte` debe ser mayor a 0.

Al dar click en "Crear Recibo" el sistema debera realizar la siguiente transaccion:

- `INSERT INTO mov_contable (codigo_proveedor, fecha, importe, concepto, referencia, fecha_creacion) VALUES (vCodigo_proveedor, vFecha, vImporte, vConcepto, vReferencia, NOW())`
- Validar que el insert fue exitoso (`affectedRows > 0`).

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.
**