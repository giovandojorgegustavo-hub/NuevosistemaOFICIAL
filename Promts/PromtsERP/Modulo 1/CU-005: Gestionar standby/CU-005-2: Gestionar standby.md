**

CU-005: Gestionar paquetes en standby

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de gestion multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-005` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.”

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
- Gestionar estado de paquetes en standby

# **Pasos del formulario-multipaso.

1. Seleccion de paquete en standby.
2. Detalle completo del paquete (cliente, entrega, productos y datos del viaje).
3. Confirmar y Guardar.

# **Descripcion de los pasos del formulario de gestion.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Seleccion de paquete en standby.

Mostrar un Grid llamado “vPaquetesStandby” con los paquetes en estado "standby".

El Grid se debe cargar mediante el procedimiento almacenado:
- `get_paquetes_por_estado(p_estado)` con `p_estado = "standby"`.

Columnas sugeridas del Grid:

- Vcodigo_paquete=codigo_paquete
- vfecha=fecha_actualizado
- vnombre_cliente=nombre_cliente
- vnum_cliente=num_cliente
- vconcatenarpuntoentrega=concatenarpuntoentrega
- vconcatenarnumrecibe=concatenarnumrecibe

El usuario podra seleccionar un paquete para continuar al detalle.

Al seleccionar un paquete del Grid, llama el procedimiento get_mov_contable_detalle(Tipo_documento,Num_documento) los parametros son
Tipo_documento="FAC"
Num_documento=Vcodigo_paquete


Vordinal=`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = Vcodigo_paquete AND tipo_documento = 'FAC';` (si no hay filas, usar 1).


Paso 2. Mostrar informacion de ese paquete que esta en camino (solo lectura).

traer el procedimiento get_viaje_por_documento(Vcodigo_paquete);
aqui nos va a mostrar los datos del viaje de este paquete
mostrar como lectura

fecha
nombrebase
nombre_motorizado
numero_wsp
num_llamadas
num_yape
link
observacion

tambien mostrar 
vconcatenarpuntoentrega mostrar como lectura
vconcatenarnumrecibe mostrar como lectura

Mostrar un grid con el detalle de `mov_contable_detalle` del documento seleccionado (solo lectura, no editable): con los datos campos traidos del procedimiento get_mov_contable_detalle

Vnombre_producto=nombre_producto
vcantidad=cantidad



Paso 3. Confirmar y Guardar.

El usuario define el nuevo estado del paquete:

- `robado`, `devuelto`, `empacado` o `llegado`. dale para escoger solo entre estas opciones

Mostrar resumen del paquete seleccionado y el viaje asociado (incluyendo `link`).


Al confirmar, guardar:

1) Llamar a `cambiar_estado_paquete(p_codigo_paquete, p_estado)` con el nuevo estado.

2) Registrar en `paquetedetalle` 
- `codigo_paquete` = paquete seleccionado.
- `ordinal` = Vordinal 
- `estado` = con el nuevo estado.
- `tipo_documento` = "FAC".


3) Registrar en `detalleviaje` 
- `fecha_fin` = now en datetime
siempre y cuando los estados `robado`, `devuelto`, `empacado` o `llegado` .



No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
