**

CU-003: Asignar viajes

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-003` (siempre `wizard/CU-XXX`). Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU-XXX/logs/`.
- El archivo debe nombrarse `CU-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Asignar Viaje y Paquetes

# **Pasos del formulario-multipaso.

1. Datos del Viaje.
2. Detalle del Viaje (seleccion de paquetes).
3. Confirmar y Guardar.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Datos del Viaje.

Registrar cabecera en la tabla `viajes` con los datos:
- `vcodigoviaje`: calcular con SQL: `SELECT COALESCE(MAX(codigoviaje), 0) + 1 AS next FROM viajes` (si no hay filas, usar 1).
- `vcodigo_base`: seleccionar desde lista devuelta por el SP `get_bases`.
- `vnombre_motorizado` (requerido).
- `vnumero_wsp`, `vnum_llamadas`, `vnum_yape` (opcionales).
- `vlink` (requerido). acepte http:// y https:// y www.... 
- `vobservacion` (opcional).
- `vfecha`: inicializar con fecha/hora del sistema.

- `vcodigo_base`: seleccionar desde lista devuelta por el SP `get_bases`.

Vordinal=`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = Vcodigo_paquete AND tipo_documento = 'FAC';` (si no hay filas, usar 1).


Paso 2. Detalle del Viaje (seleccion de paquetes).

Mostrar un Grid llamado "vPaquetesEmpacados" con los paquetes en estado "empacado" (estado definido en CU-002).

El Grid se debe cargar mediante el procedimiento almacenado:
- `get_paquetes_por_estado(p_estado)` con `p_estado = "empacado"`.

Columnas sugeridas del Grid:
- Vcodigo_paquete=codigo_paquete
- vfecha=fecha_actualizado
- vnombre_cliente=nombre_cliente
- vnum_cliente=num_cliente
- vconcatenarpuntoentrega=concatenarpuntoentrega
- vconcatenarnumrecibe=concatenarnumrecibe

El usuario podra seleccionar multiples paquetes para asignarlos al viaje. Los seleccionados se guardan en memoria para el Paso 3.

Paso 3. Confirmar y Guardar.

Mostrar resumen del viaje y los paquetes seleccionados. Al confirmar, guardar:

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
   - `p_estado` = "empacado".


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
