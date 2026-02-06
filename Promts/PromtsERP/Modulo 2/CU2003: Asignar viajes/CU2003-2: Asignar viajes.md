**

CU2003: Asignar viajes

# **Prompt AI.
Modulo: 2.
Caso de uso: CU2003 - M2Viaje.
Puerto del wizard: 3011 (ver `Promts/Herramientas/puertos.json`).


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-XXX/logs/`.
El archivo debe nombrarse `CU-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Ver Logs de sentencias SQL
Asignar Viaje y Paquetes
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Datos del Viaje.
2. Asignar Paquetes (seleccion de paquetes) + Ubicacion (si aplica).
3. Confirmar y Guardar.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Datos del Viaje.

Registrar cabecera en la tabla `viajes` con los datos:
- vcodigoviaje = regla sin ambiguedad:
  - Siempre generar el siguiente correlativo con SQL `SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes` (si no hay registros empieza en 1).
- vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`
Variables:
vcodigo_base no visible editable
vBaseNombre visible editable

- `vnombre_motorizado` (requerido).
- `vnumero_wsp`, `vnum_llamadas`, `vnum_yape` (opcionales).
- `vlink` (requerido). acepte http:// y https:// y www.... 
- `vobservacion` (opcional).
- `vfecha`: inicializar con fecha/hora del sistema.

Vordinal = regla sin ambiguedad:
- Si el paquete es NUEVO: asignar ordinal secuencial por linea (1,2,3...) segun el indice.
- Si YA EXISTE: calcular con SQL `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = Vcodigo_paquete AND tipo_documento = 'FAC'`.


Paso 2. Asignar Paquetes (seleccion de paquetes) + Ubicacion (si aplica).

Muestra un Grid llamado "vPaquetesEmpacados" con los datos del SP: `get_paquetes_por_estado(p_estado="empacado")` y FILTRAR por `codigo_base = vcodigo_base` (el seleccionado en el Paso 1).

Campos devueltos: `codigo_paquete`, `fecha_actualizado`, `codigo_cliente`, `nombre_cliente`, `num_cliente`, `codigo_puntoentrega`, `codigo_base`, `ordinal_numrecibe`, `concatenarpuntoentrega`, `region_entrega`, `latitud`, `longitud`, `concatenarnumrecibe`
Variables:
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base no visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

El usuario podra seleccionar multiples paquetes para asignarlos al viaje. Los seleccionados se guardan en memoria para el Paso 3.

Interaccion por paquete:
- Al hacer click en un paquete del Grid, mostrar su informacion basica (vconcatenarpuntoentrega, vconcatenarnumrecibe).
- Direccion y Mapa (solo lectura) para el paquete seleccionado:
  - Solo si vRegion_Entrega = "LIMA":
    - Cargar Google Maps usando erp.yml (`google_maps.api_key`, `google_maps.default_center`, `google_maps.default_zoom`).
    - Mostrar el mapa en modo lectura (sin busqueda ni edicion), con arrastrar y zoom libre.
    - Colocar un marcador rojo fijo en `vLatitud`/`vLongitud`.
  - Si vRegion_Entrega = "PROV": no mostrar mapa.

Paso 3. Confirmar y Guardar.

Mostrar resumen del viaje y los paquetes seleccionados. Al confirmar, guardar:
Agregar un checklist de una sola opcion "Confirmar". El boton final de guardar debe estar deshabilitado hasta que este marcado y la validacion debe exigirlo (no usar modal de confirmacion).

1) Insertar en `viajes`. 
- codigoviaje=vcodigoviaje
- codigo_base=vcodigo_base
- nombre_motorizado=vnombre_motorizado
- numero_wsp=vnumero_wsp
- num_llamadas=vnum_llamadas
- num_yape=vnum_yape
- link=vlink
- observacion=vobservacion
- fecha=vfecha


2) Insertar en `detalleviaje` por cada paquete seleccionado:
- codigoviaje = vcodigoviaje 
- numero_documento=Vcodigo_paquete
- tipo_documento = 'FAC'.
- fecha_inicio = NOW().



3) Registrar en `paquetedetalle` 
- `codigo_paquete` = paquete seleccionado.
- `ordinal` = Vordinal
- `estado` = "en camino".
- `tipo_documento` = "FAC".


3) Ejecutar un procedimiento almacenado llamado `cambiar_estado_paquete(p_codigo_paquete, p_estado)`.
   - `p_codigo_paquete` = Vcodigo_paquete
   - `p_estado` = "en camino".


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
