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
CU2007-2: Asistencia por Base

# **Prompt AI.
Modulo: 2.
Caso de uso: CU2007 - M2AsistenciaPorBase.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear una pagina de consulta (un solo paso) para ver asistencia por base y fecha.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 2/CU2-007` como ruta del caso de uso.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
Clase Form Wizard para manejar la logica
Validaciones con expresiones regulares
Componentes Bootstrap (progress bar, alerts, etc.)
Responsive design para moviles
El Backend consulta en MySQL con endpoints js corriendo sobre node.js

## Integracion obligatoria del backend (Modulo 2)
No crear un `server.js` nuevo para este caso de uso.
El modulo 2 trabaja con un solo servidor compartido y este caso debe integrarse en `wizard/Modulo 2/server.js`.
Agregar/registrar endpoints, rutas estaticas y validaciones dentro del servidor existente, sin romper los CU2-001..CU2-006.
La carpeta del caso de uso mantiene su `index.html`, `app.js` y `styles.css`, pero su backend debe vivir en el server unico del modulo.
Regla estricta:
- Prohibido crear `wizard/Modulo 2/CU2-007/server.js`.
- Prohibido crear cualquier otro `server.js` dentro de subcarpetas del Modulo 2.
- Todos los endpoints de CU2-007 deben declararse en `wizard/Modulo 2/server.js`.
- Mantener compatibilidad con los endpoints existentes de CU2-001..CU2-006.

**User Experience (UX)
Incluir manejo de errores y mejores practicas de UX.
Regla explicita de interfaz: la pagina debe ser responsive (desktop, tablet y movil), manteniendo usabilidad en todos los breakpoints.

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-007/logs/`.
El archivo debe nombrarse `CU2-007-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel
Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.
El diseno de este CU debe mantener consistencia visual con los otros prompts/wizards del modulo 2 (tipografia, colores, espaciados, radios, tablas, botones y estados).
No crear un tema aislado; reutilizar el lenguaje visual ya establecido en los CU existentes.

# **Funcionalidades requeridas:
Barra de progreso visual
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Fecha de consulta editable (por defecto hoy)
Filtro por base condicionado por privilegio de usuario (`PRIV` o `ONE`)
Grid de resultados de asistencia por turno/base
Boton "Consultar" para ejecutar la busqueda
Boton "Limpiar" para volver a valores iniciales
No utilizar datos mock
Solo utilizar datos reales de la base de datos especificada en erp.yml

# **Paso del formulario.
1. Consultar Asistencia por Base.

# **Descripcion del paso.
Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Consultar Asistencia por Base.

vPrivUsuario = Llamada SP: `get_priv_usuario(p_usuario = Codigo_usuario)` (devuelve campo_visible)
Campos devueltos:
Columna 1 (base asignada del usuario), Columna 2 (privilegio), Columna 3 (opcional/auxiliar)
Variables:
vBaseUsuario no visible no editable
vPriv no visible no editable
vBaseAux no visible no editable

Reglas de privilegios:
- Si no hay filas en `get_priv_usuario`, mostrar `Warning ACCESO NO AUTORIZADO !!!`, cerrar pagina y salir.
- `vPriv = "PRIV"`:
  - Puede consultar cualquier base.
  - Selector de base habilitado (typeahead).
  - Puede cambiar base libremente.
- `vPriv = "ONE"`:
  - Solo puede consultar su base asignada (`vBaseUsuario`).
  - El campo base debe mostrarse con nombre de base y bloqueado/no editable.
  - Solo puede editar la fecha para consultar otros dias.
  - Si llega `codigo_base` en `vParámetros`, ignorarlo y usar `vBaseUsuario`.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible) SOLO si `vPriv = "PRIV"`
Campos devueltos: `codigo_base`, `nombre`
Variables:
vCodigo_base visible editable
vNombre_base visible editable

vFecha_consulta visible editable (obligatorio)
Reglas:
- Inicializar por defecto con la fecha de hoy del servidor.
- Permitir elegir cualquier dia.
- Formato `YYYY-MM-DD`.

vAsistenciaDia = Llamada SP: `get_asistencia_dia_filtrado(p_fecha, p_codigo_base)` (devuelve campo_visible)
Parametros a enviar:
- `p_fecha = vFecha_consulta`
- `p_codigo_base`:
  - Si `vPriv = "ONE"`: `vBaseUsuario`
  - Si `vPriv = "PRIV"` y base seleccionada: `vCodigo_base`
  - Si `vPriv = "PRIV"` y base vacia: `NULL`

Campos devueltos por SP:
`FECHA`, `TURNO`, `codigo_base`, `FechaRegistro`, `TurnoRegistro`, `codigo_usuario`, `codigo_bitacora`

Variables Grid:
vFecha visible no editable
vTurno visible no editable
vCodigo_base_grid no visible no editable
vFechaRegistro visible no editable
vTurnoRegistro visible no editable
vCodigo_usuario_grid visible no editable
vCodigo_bitacora_grid no visible no editable

Reglas de carga:
- Cargar el grid automaticamente al iniciar con la fecha de hoy.
- Al hacer click en "Consultar", ejecutar nuevamente con fecha/base actuales.
- Si el SP devuelve 0 filas, mostrar Grid vacio con mensaje "Sin registros".
- Soportar parametro opcional `vParámetros` JSON:
  - `fecha_consulta`, `codigo_base`
  - Aplicar `codigo_base` solo cuando `vPriv = "PRIV"`.

## Integracion obligatoria con launcher/DB
- Registrar `CU2-007` en `wizard/Modulo 2/server.js` dentro de `cuDefs`.
- Registrar `CU2-007` en `erp.yml` dentro de `ports.usecases`.
- Agregar `CU2007` en `SQL/insertlogin.sql` (tabla `usecases`, `modulo_usecases`, `perfiles_ucases`) para que aparezca en login.
- Agregar `CU2007` en `SQL/migracion_links_modulos.sql` para mantener linktolaunch por puerto de modulo.
- Aplicar en BD los inserts/upserts para `CU2007` sin mocks.

**
