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

## Regla de OTP y sesion del launch (obligatoria)
- El OTP es de un solo uso y se consume en la validacion inicial de acceso al CU.
- El CU debe abrirse siempre desde el launcher, que genera y envia `vUsuario` y `vOTP` en la URL de lanzamiento.
- Despues de validar OTP con resultado `1` en el acceso inicial (`GET /` o `GET /index.html`), el backend del CU debe crear una sesion local del caso de uso.
- Las llamadas internas del mismo launch (`/api/*`) deben usar esa sesion local y no volver a consumir el OTP.
- Si no hay sesion local valida, entonces se permite validar OTP una sola vez para crear sesion; si falla, responder acceso no autorizado.

**
CU6002: Tickets Soporte

# **Prompt AI.
Modulo: 6.
Caso de uso: CU6002 - M6TicketsSoporte.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro de un solo paso para crear tickets de soporte de usuario con opcion de adjuntar multiples imagenes.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 6/CU6-002` como ruta del caso de uso.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend guarda en MySQL con endpoints js corriendo sobre node.js

**User Experience (UX)
Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 6/CU6-002/logs/`.
- El archivo debe nombrarse `CU6-002-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Captura de `Asunto` y `Descripcion`
- Carga de imagenes multiples (`jpg`, `jpeg`, `png`, `webp`)
- Vista previa de imagenes seleccionadas
- Boton "Registrar Ticket"
- Mensaje de exito con `id_ticket` generado
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos del formulario.

# **Paso del formulario.
1. Registrar Ticket de Soporte.

# **Descripcion de los pasos del formulario de registro.
Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Registrar Ticket de Soporte.

vCodigo_usuario = tomar del parametro `Codigo_usuario`. No visible no editable.

vFecha = fecha y hora actual del servidor al momento de guardar. No visible no editable.

vAsunto = campo texto. Visible editable.
Reglas:
- obligatorio
- longitud maxima `255`

vDescripcion = textarea. Visible editable.
Reglas:
- obligatorio
- longitud maxima `4096`

vImagenes = input file multiple. Visible editable.
Reglas:
- opcional
- permitir 0..10 archivos
- cada archivo maximo 5 MB
- tipos permitidos: `image/jpeg`, `image/png`, `image/webp`

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Al dar click en "Registrar Ticket" el sistema debera realizar estas transacciones:

1. Insertar ticket:
`INSERT INTO ticketsoporte (codigo_usuario, fecha, asunto, descripcion) VALUES (vCodigo_usuario, vFecha, vAsunto, vDescripcion)`

2. Obtener `vId_ticket` del insert (`insertId`).

3. Por cada archivo de `vImagenes`, insertar:
`INSERT INTO ticketsoporte_imagenes (id_ticket, imagen_binaria) VALUES (vId_ticket, vImagenBinaria)`

Reglas de persistencia:
- `vImagenBinaria` debe guardarse como binario en columna `LONGBLOB`.
- Usar transaccion DB (`BEGIN`, `COMMIT`, `ROLLBACK`).
- Si falla una imagen, hacer `ROLLBACK` completo del ticket y sus imagenes.

Validaciones de seguridad backend:
- No confiar en validaciones del frontend.
- Revalidar cantidad, tamano y tipo MIME de archivos.
- Usar queries parametrizados (sin concatenar SQL).


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
