**

CU-002: Empaquetar

# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnología que ofrece servicios globales de IaaS y PaaS.

El código generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-002` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar código limpio y eficiente: mientras menos código, mejor, sin sacrificar claridad.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del código:**

- Clase Form Wizard para manejar la lógica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para móviles
- El Backend, guarda en MariaDB 10.6.22, con endpoints js corriendo sobre [node.js](http://node.js)

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
- Registrar Empaque

# **Pasos del formulario-multipaso.

1. Seleccionar Paquete Pendiente.
2. Detalle del Documento (solo lectura).
3. Entrega/Recibe (si aplica) + Confirmar Empaque.

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Seleccionar Paquete Pendiente.

Mostrar un Grid llamado “vPaquetesPendientes” con los paquetes en estado "pendiente empacar" (estado definido en CU-001 y en el backend de emisión de factura).

El Grid se debe cargar mediante un procedimiento almacenado:
- `get_paquetes_por_estado(p_estado)` con `p_estado = "pendiente empacar"`.

Columnas sugeridas del Grid:
- codigo_paquete
- estado
- fecha_registro
- codigo_cliente
- nombre_cliente
- ubigeo
- region_entrega

Al seleccionar un paquete del Grid, cargar el detalle del paquete para el paso 2 con una consulta en backend (no SP):
- Entrega: `puntos_entrega` por `codigo_puntoentrega` y `ubigeo` desde `mov_contable`.
- Recibe: `numrecibe` por `codigo_cliente_numrecibe` y `ordinal_numrecibe` desde `mov_contable`.

Paso 2. Detalle del Documento (solo lectura).

Mostrar un grid con el detalle de `mov_contable_detalle` del documento seleccionado (solo lectura, no editable):
- Columnas: `nombre_producto`, `cantidad`.
- `nombre_producto` se obtiene haciendo JOIN con `productos` por `codigo_producto`.
- Filtrar por `tipo_documento = 'F'` y `numero_documento = codigo_paquete`.

Paso 3. Entrega/Recibe + Confirmar Empaque.

Mostrar la informacion de entrega y recepcion del paquete seleccionado:
- Entrega (siempre):
  - Si `region_entrega = "LIMA"`: direccion_linea, referencia, destinatario_nombre, destinatario_dni, ubigeo (con nombres si aplica).
  - Si `region_entrega = "PROV"`: agencia y ubigeo (con nombres si aplica).
- Recibe: solo mostrar si `region_entrega = "LIMA"`.
  - Mostrar `numero` y `nombre` del numrecibe.

Mostrar resumen del paquete seleccionado y un botón “Empacar”.

# **Registro de Empaque (backend)

Al dar click en “Empacar” el sistema deberá realizar las siguientes transacciones sobre la DB:

1) Registrar en `paquetedetalle` (por cada item de `mov_contable_detalle` del documento):
   - `codigo_paquete` = paquete seleccionado.
   - `ordinal` = correlativo del detalle de factura.
   - `estado` = "empacado".
   - Si la fila ya existe, actualizar solo el `estado`.

2) Llamar a un procedimiento almacenado para cambiar el estado del paquete:
   - `cambiar_estado_paquete(p_codigo_paquete, p_estado)` con `p_estado = "empacado"`.
   - El procedimiento debe actualizar `paquete.estado` y `paquete.fecha_actualizado`.
   - (Opcional) Actualizar `paquetedetalle.estado` para mantener consistencia.

# **Procedimientos necesarios (revisar SQL/procedimientos.sql)

Si no existen, crear los siguientes SP:

- `get_paquetes_por_estado(p_estado)`
  - Debe listar paquetes por estado y devolver datos del cliente/entrega usando join con `mov_contable`, `clientes` y `puntos_entrega`.

- `cambiar_estado_paquete(p_codigo_paquete, p_estado)`
  - Debe actualizar `paquete.estado` y `paquete.fecha_actualizado`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
