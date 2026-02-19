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
CU6001: Cambiar Contrasena

# **Prompt AI.
Modulo: 6.
Caso de uso: CU6001 - M6CambiarContrasena.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de un solo paso para cambiar contrasena del usuario autenticado por parametro.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 6/CU6-001` como ruta del caso de uso.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend consulta/actualiza en MySQL con endpoints js corriendo sobre node.js

**User Experience (UX)
Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 6/CU6-001/logs/`.
- El archivo debe nombrarse `CU6-001-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Estados de loading y error
- Ver Logs de sentencias SQL (no en interfaz)
- Solicitar `Contrasena antigua`, `Contrasena nueva` y `Repetir contrasena nueva`
- Boton "Guardar Contrasena"
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos del formulario.

# **Paso del formulario.
1. Cambiar Contrasena.

# **Descripcion de los pasos del formulario de registro.
Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Cambiar Contrasena.

vCodigo_usuario = tomar del parametro `Codigo_usuario`. No visible no editable.

vPasswordActualBD = consulta SQL directa por usuario:
`SELECT password FROM usuarios WHERE codigo_usuario = vCodigo_usuario LIMIT 1`
No visible no editable.

vContrasenaAntigua = campo password. Visible editable.
vContrasenaNueva = campo password. Visible editable.
vContrasenaNuevaRepetir = campo password. Visible editable.

Reglas:
- `vContrasenaAntigua`, `vContrasenaNueva` y `vContrasenaNuevaRepetir` son obligatorias.
- `vContrasenaAntigua` debe coincidir exactamente con `vPasswordActualBD`.
- `vContrasenaNueva` y `vContrasenaNuevaRepetir` deben ser iguales.
- `vContrasenaNueva` debe tener minimo 8 caracteres.
- `vContrasenaNueva` debe contener al menos una letra mayuscula.
- Longitud maxima para `vContrasenaNueva`: `255` caracteres.

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Al dar click en "Guardar Contrasena" el sistema debera realizar estas transacciones:

- `UPDATE usuarios SET password = vContrasenaNueva WHERE codigo_usuario = vCodigo_usuario AND password = vContrasenaAntigua`
- `affectedRows` es la cantidad de filas que el `UPDATE` realmente modifico.
- Validar `affectedRows = 1`; si es `0`, hacer rollback y mostrar error (`usuario inexistente`, `contrasena antigua incorrecta` o `la nueva contrasena es igual a la actual`).

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
