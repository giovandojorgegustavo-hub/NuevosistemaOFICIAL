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
CU002: Reasignar Base

# **Prompt AI.
Modulo: 1.
Caso de uso: CU002 - M1ReasignarBase.
Puerto del wizard: 3002 (ver `Promts/Herramientas/puertos.json`).


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
Clase Form Wizard para manejar la logica
Validaciones con expresiones regulares
Componentes Bootstrap (progress bar, alerts, etc.)
Responsive design para moviles
El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 4/CU4-XXX/logs/`.
El archivo debe nombrarse `CU4-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Confirmar Operacion
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Reasignar Base
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar Paquete Pendiente.
2. Detalle del Documento + Nueva Base.
3. Confirmar Reasignacion.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Seleccionar Paquete Pendiente.

Muestra un Grid llamado "PaquetesPendientes" con los datos del SP: `get_paquetes_por_estado(p_estado="pendiente empacar")` 

Campos devueltos: `codigo_paquete`, `fecha_actualizado`, `codigo_cliente`, `nombre_cliente`, `num_cliente`, `codigo_puntoentrega`, `codigo_base`, `nombre_base`, `codigo_packing`, `nombre_packing`, `ordinal_numrecibe`, `concatenarpuntoentrega`, `region_entrega`, `latitud`, `longitud`, `concatenarnumrecibe`
Variables:
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base visible no editable
vcodigo_packing visible no editable
vnombre_packing visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

Al seleccionar un item del Grid PaquetesPendientes, pasar al siguiente paso


Paso 2. Detalle del Documento + Nueva Base.

Mostrar como lectura:
- vconcatenarpuntoentrega
- vconcatenarnumrecibe
- vcodigo_base (base actual)
- vnombre_packing

Direccion y Mapa (solo lectura).
Solo si vRegion_Entrega = "LIMA":
- Cargar Google Maps usando erp.yml (`google_maps.api_key`, `google_maps.default_center`, `google_maps.default_zoom`).
- Mostrar el mapa en modo lectura (sin busqueda ni edicion), con arrastrar y zoom libre.
- Colocar un marcador rojo fijo en `vLatitud`/`vLongitud`.
Si vRegion_Entrega = "PROV": no mostrar mapa.

traer un Grid llamado Mov_contable_detalle donde se llama un SP: `get_mov_contable_detalle(p_tipo_documento, p_numero_documento)` con:
p_tipo_documento = "FAC"
p_numero_documento = vcodigo_paquete (seleccionado en Paso 1)
Campos devueltos: `tipo_documento`, `numero_documento`, `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `saldo`, `precio_total`
Variables:
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable

vNombre_base_nueva = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
vCodigo_base_nueva
vNombre_base_nueva

Variables
vCodigo_base_nueva visible editable
vNombre_base_nueva visible no editable (autocompletar desde vBases)

El selector de nueva base debe ser typeahead y validar que no sea igual a la base actual.


Paso 3. Confirmar Reasignacion.



# **Registro de Reasignacion (backend)
mostrar un resumen 
Al dar click en "Reasignar Base" el sistema debera registrar en tablas y luego ejecutar el procedimiento.

1) Registrar en Log_reasignacionBase (INSERT directo):
   - `INSERT INTO Log_reasignacionBase (tipo_documento, numero_documento, codigo_base_actual, codigo_base_reasignada, codigo_usuario, fecha)
      VALUES (vtipo_documento, vcodigo_paquete, vcodigo_base, vCodigo_base_nueva, vcodigo_usuario, NOW())`.

2) Ejecutar procedimiento para el cambio de base:
   - `CALL get_actualizarbasespaquete(vtipo_documento, vcodigo_paquete, vCodigo_base_nueva)`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
