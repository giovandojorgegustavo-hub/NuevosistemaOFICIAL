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
CU2006-2: Historial Movimientos Stock

# **Prompt AI.
Modulo: 2.
Caso de uso: CU2006 - M2HistorialMovimientosStock.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear una pagina de consulta (un solo paso) para historial de movimientos de stock por rango de fechas, con filtros opcionales de producto y base.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 2/CU2-006` como ruta del caso de uso.
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
Agregar/registrar endpoints, rutas estaticas y validaciones dentro del servidor existente, sin romper los CU2-001..CU2-005.
La carpeta del caso de uso mantiene su `index.html`, `app.js` y `styles.css`, pero su backend debe vivir en el server unico del modulo.
Regla estricta:
- Prohibido crear `wizard/Modulo 2/CU2-006/server.js`.
- Prohibido crear cualquier otro `server.js` dentro de subcarpetas del Modulo 2.
- Todos los endpoints de CU2-006 deben declararse en `wizard/Modulo 2/server.js`.
- Mantener compatibilidad con los endpoints existentes de CU2-001..CU2-005.

**User Experience (UX)
Incluir manejo de errores y mejores practicas de UX.
Regla explicita de interfaz: la pagina debe ser responsive (desktop, tablet y movil), manteniendo usabilidad en todos los breakpoints.

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-006/logs/`.
El archivo debe nombrarse `CU2-006-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel
Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.
El diseno de este CU debe mantener consistencia visual con los otros prompts/wizards del modulo 2 (tipografia, colores, espaciados, radios, tablas, botones y estados).
No crear un tema aislado; reutilizar el lenguaje visual ya establecido en los CU existentes.

# **Funcionalidades requeridas:
Barra de progreso visual
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Filtros por fecha desde/hasta (obligatorios)
Filtro por producto (opcional)
Filtro por base condicionado por privilegio de usuario (`PRIV` o `ONE`)
Grid de resultados con ordenamiento por columnas y filtro rapido por texto
Boton "Consultar" para ejecutar la busqueda
Boton "Limpiar filtros" para volver a valores iniciales
No utilizar datos mock
Solo utilizar datos reales de la base de datos especificada en erp.yml

# **Paso del formulario.
1. Consultar Historial Movimientos Stock.

# **Descripcion del paso.
Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Consultar Historial Movimientos Stock.

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
  - Puede dejar base vacia para consultar todas las bases.
  - Selector de base habilitado.
- `vPriv = "ONE"`:
  - Solo puede consultar su base asignada (`vBaseUsuario`).
  - El campo base debe mostrarse bloqueado/no editable.
  - No puede cambiar base ni limpiar base.
  - Si llega `codigo_base` en `vParámetros`, ignorarlo y usar `vBaseUsuario`.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible) SOLO si `vPriv = "PRIV"`
Campos devueltos: `codigo_base`, `nombre`
Variables:
vCodigo_base visible editable
vNombre_base visible editable

vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vCodigo_producto visible editable
vNombre_producto visible editable

vFecha_desde visible editable (obligatorio)
vFecha_hasta visible editable (obligatorio)

Reglas de validacion:
- `vFecha_desde` y `vFecha_hasta` son obligatorias.
- `vFecha_desde <= vFecha_hasta`.
- `vCodigo_producto` es opcional (si vacio, consultar todos los productos).
- Base:
  - Si `vPriv = "PRIV"` y base vacia: consultar todas las bases.
  - Si `vPriv = "ONE"`: usar siempre `vBaseUsuario`.

vHistorialMovimientos = Llamada SP:
`get_historial_movimientos_rango(p_fecha_desde, p_fecha_hasta, p_codigo_producto, p_codigo_base)`
Parametros a enviar:
- `p_fecha_desde = vFecha_desde`
- `p_fecha_hasta = vFecha_hasta`
- `p_codigo_producto = vCodigo_producto` o `NULL` si vacio
- `p_codigo_base`:
  - Si `vPriv = "ONE"`: `vBaseUsuario`
  - Si `vPriv = "PRIV"` y base seleccionada: `vCodigo_base`
  - Si `vPriv = "PRIV"` y base vacia: `NULL`

Campos devueltos por SP:
`fecha`, `tipo_documento`, `numero_documento`, `codigo_base`, `nombre_base`, `codigo_producto`, `nombre_producto`, `cantidad`

Variables Grid:
vFecha visible no editable
vTipo_documento visible no editable
vNumero_documento visible no editable
vCodigo_base_grid no visible no editable
vNombre_base_grid visible no editable
vCodigo_producto_grid no visible no editable
vNombre_producto_grid visible no editable
vCantidad visible no editable

Reglas de carga:
- Cargar el grid automaticamente al iniciar con un rango por defecto de la ultima semana considerando el momento actual (desde hoy - 6 dias hasta hoy).
- Al hacer click en "Consultar", ejecutar nuevamente con filtros actuales.
- Si el SP devuelve 0 filas, mostrar Grid vacio con mensaje "Sin registros".
- Soportar parametro opcional `vParámetros` JSON:
  - `fecha_desde`, `fecha_hasta`, `codigo_producto`, `codigo_base`
  - Aplicar `codigo_base` solo cuando `vPriv = "PRIV"`.

**
