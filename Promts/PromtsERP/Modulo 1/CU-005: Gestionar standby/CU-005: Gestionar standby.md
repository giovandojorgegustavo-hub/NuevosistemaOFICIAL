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
- codigo_paquete
- estado
- fecha_registro
- codigo_cliente
- nombre_cliente
- ubigeo
- region_entrega

El usuario podra seleccionar un paquete para continuar al detalle.

Paso 2. Detalle completo del paquete.

Mostrar:
- Datos del cliente y entrega (como en CU-002).
- Productos del documento (`mov_contable_detalle` + `productos`).
- Datos del viaje asociado (tabla `viajes` + `detalleviaje`).
  - `codigoviaje`, `codigo_base`, `nombre_motorizado`, `numero_wsp`, `num_llamadas`, `num_yape`, `link`, `observacion`, `fecha`.

Paso 3. Confirmar y Guardar.

El usuario define el nuevo estado del paquete:
- `llegado` o `empacado`.

Mostrar resumen del paquete seleccionado y el viaje asociado (incluyendo `link`).

Al confirmar, guardar:

1) Llamar a `cambiar_estado_paquete(p_codigo_paquete, p_estado)` con el nuevo estado.

2) Actualizar `paquetedetalle.estado` para el paquete, si aplica, para mantener consistencia.

# **Procedimientos necesarios (revisar SQL/procedimientos.sql)

Si no existen, crear los siguientes SP:

- `get_paquetes_por_estado(p_estado)`
  - Debe listar paquetes por estado y devolver datos del cliente/entrega usando join con `mov_contable`, `clientes` y `puntos_entrega`.

- `cambiar_estado_paquete(p_codigo_paquete, p_estado)`
  - Debe actualizar `paquete.estado` y `paquete.fecha_actualizado`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
