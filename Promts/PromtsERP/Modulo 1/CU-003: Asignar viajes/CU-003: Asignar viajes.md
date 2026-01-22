**

CU-003: Asignar viajes

# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnología que ofrece servicios globales de IaaS y PaaS.

El código generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-003` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar código limpio y eficiente: mientras menos código, mejor, sin sacrificar claridad.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del código:**

- Clase Form Wizard para manejar la lógica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para móviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores prácticas de UX.”

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecución dentro de `wizard/CU-XXX/logs/`.
- El archivo debe nombrarse `CU-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
- Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parámetros.

**El look and feel

Se requiere que la interfaz gráfica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
- `design.json` con paleta, tipografias, tamaños, radios, sombras, grid y tokens de componentes.
- `tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamaños y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:

- Barra de progreso visual
- Navegación entre pasos (anterior/siguiente)
- Confirmar Operación
- Estados de loading y error
- Ver Logs de sentencias SQL
- Asignar Viaje y Paquetes

# **Pasos del formulario-multipaso.

1. Datos del Viaje.
2. Detalle del Viaje (seleccion de paquetes).
3. Confirmar y Guardar.

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1. Datos del Viaje.

Registrar cabecera en la tabla `viajes` con los datos:
- `codigoviaje`: generar correlativo (MAX + 1).
- `codigo_base`: seleccionar desde lista devuelta por el SP `get_bases`.
- `nombre_motorizado` (requerido).
- `numero_wsp`, `num_llamadas`, `num_yape` (opcionales).
- `link` (opcional).
- `observacion` (opcional).
- `fecha`: inicializar con fecha/hora del sistema.

Paso 2. Detalle del Viaje (seleccion de paquetes).

Mostrar un Grid llamado “vPaquetesEmpacados” con los paquetes en estado "empacado" (estado definido en CU-002).

El Grid se debe cargar mediante el procedimiento almacenado:
- `get_paquetes_por_estado(p_estado)` con `p_estado = "empacado"`.

Columnas sugeridas del Grid:
- codigo_paquete
- estado
- fecha_registro
- codigo_cliente
- nombre_cliente
- ubigeo
- region_entrega

El usuario podra seleccionar multiples paquetes para asignarlos al viaje. Los seleccionados se guardan en memoria para el Paso 3.

Paso 3. Confirmar y Guardar.

Mostrar resumen del viaje y los paquetes seleccionados. Al confirmar, guardar:

1) Insertar en `viajes`.

2) Insertar en `detalleviaje` por cada paquete seleccionado:
- `codigoviaje` = viaje creado.
- `tipo_documento` = 'F'.
- `numero_documento` = codigo_paquete.
- `fecha_inicio` = NOW().
- `fecha_fin` = NOW().

3) Registrar en `paquetedetalle` (por cada item de `mov_contable_detalle` del documento):
- `codigo_paquete` = paquete seleccionado.
- `ordinal` = correlativo del detalle de factura.
- `estado` = "en camino".
- Si la fila ya existe, actualizar solo el `estado`.

4) Llamar a un procedimiento almacenado para cambiar el estado del paquete:
- `cambiar_estado_paquete(p_codigo_paquete, p_estado)` con `p_estado = "en camino"`.
- El procedimiento debe actualizar `paquete.estado` y `paquete.fecha_actualizado`.
- (Opcional) Actualizar `paquetedetalle.estado` para mantener consistencia.

# **Procedimientos necesarios (revisar SQL/procedimientos.sql)

Si no existen, crear los siguientes SP:

- `get_paquetes_por_estado(p_estado)`
  - Debe listar paquetes por estado y devolver datos del cliente/entrega usando join con `mov_contable`, `clientes` y `puntos_entrega`.

- `cambiar_estado_paquete(p_codigo_paquete, p_estado)`
  - Debe actualizar `paquete.estado` y `paquete.fecha_actualizado`.

- `get_bases()`
  - Debe listar `codigo_base`, `nombre` desde `bases`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
