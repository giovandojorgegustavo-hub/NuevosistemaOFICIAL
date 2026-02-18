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
CU2005-2: StockBases

# **Prompt AI.
Modulo: 2.
Caso de uso: CU2005 - M2StockBases.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear una pagina de consulta de stock por deposito (un solo paso), mostrando un Grid con saldos por base.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 2/CU2-005` como ruta del caso de uso.
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
Agregar/registrar endpoints, rutas estaticas y validaciones dentro del servidor existente, sin romper los CU2-001..CU2-004.
La carpeta del caso de uso mantiene su `index.html`, `app.js` y `styles.css`, pero su backend debe vivir en el server unico del modulo.

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-005/logs/`.
El archivo debe nombrarse `CU2-005-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel

Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.
El diseno de este CU debe mantener consistencia visual con los otros prompts/wizards del modulo 2 (tipografia, colores, espaciados, radios, tablas, botones y estados).
No crear un tema aislado; reutilizar el lenguaje visual ya establecido en los CU existentes.
Referencia directa obligatoria: usar como base visual los CU de Modulo 2 ya implementados (`CU2-001`, `CU2-002`, `CU2-003`, `CU2-004`) y mantener la misma linea de interfaz.
Si hay diferencias entre estilos, priorizar el estilo mas reciente del modulo y documentar en comentario breve cualquier ajuste visual necesario.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
`design.json` con paleta, tipografias, tamanos, radios, sombras, grid y tokens de componentes.
`tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamanos y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:
Barra de progreso visual
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Mostrar base activa en caja de texto no editable por defecto
Si vPriv = ALL permitir cambiar base con selector typeahead
Mostrar Grid `vStockBase` con filtro rapido por texto y ordenamiento por columnas
Boton "Actualizar Stock" para recargar el Grid desde DB
No utilizar datos mock
Solo utilizar datos reales de la base de datos especificada en erp.yml

# **Paso del formulario.

1. Stock por Base.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Stock por Base.

vPrivUsuario = Llamada SP: `get_priv_usuario(p_usuario = Codigo_usuario)` (devuelve campo_visible)
Campos devueltos:
Columna 1 (base asignada del usuario), Columna 2 (privilegio), Columna 3 (opcional/auxiliar)
Variables:
vBase no visible no editable
vPriv no visible no editable
vBaseAux no visible no editable
vBaseTexto visible no editable

Reglas de comportamiento:
- Mapear `vBase` con la columna 1 y `vPriv` con la columna 2.
- Mostrar `vBaseTexto` en pantalla en una caja de texto no editable.
- Si no hay filas en `get_priv_usuario`, mostrar `Warning ACCESO NO AUTORIZADO !!!`, cerrar pagina y salir.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible) SOLO si `vPriv = "ALL"`
Campos devueltos: `codigo_base`, `nombre`
Variables:
vcodigo_base visible editable
vnombre_base visible editable

Reglas de comportamiento para privilegios:
- Si `vPriv = "ALL"`: habilitar selector de base (typeahead) y permitir cambiar `vBase`.
- Si `vPriv <> "ALL"`: mantener `vBase` bloqueada (solo lectura), no permitir edicion manual.

vStockBase = Llamada SP: `get_stock_xBase(p_codigo_base = vBase)` (devuelve campo_visible)
Campos devueltos (usar los alias reales del SP):
`codigo_base`, `nombre_base`, `codigo_producto`, `nombre_producto`, `fecha_saldoactual`, `saldo_actual`, `costo_unitario`, `saldo_reservado`, `saldo_disponible`
Variables:
vnombre_base_grid visible no editable
vnombre_producto visible no editable
vsaldo_actual visible no editable
vsaldo_reservado visible no editable
vsaldo_disponible visible no editable

Reglas de carga:
- Cargar el Grid al iniciar la pagina.
- Si el usuario cambia `vBase` (solo cuando `vPriv = "ALL"`), recargar `vStockBase` automaticamente.
- Soportar parametro opcional `vParámetros` JSON:
  - Si incluye `codigo_base` y `vPriv = "ALL"`, usarlo como base inicial.
  - Si `vPriv <> "ALL"`, ignorar `codigo_base` recibido y mantener `vBase` del usuario.
- Si el SP devuelve 0 filas, mostrar Grid vacio con mensaje "Sin registros".

**
