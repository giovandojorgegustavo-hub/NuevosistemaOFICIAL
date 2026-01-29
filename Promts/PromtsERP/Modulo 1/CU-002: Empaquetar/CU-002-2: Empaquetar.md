**

CU-002: Empaquetar

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados. Regla de ruta obligatoria:
- Si el caso empieza con `CU-` (sin numero), usar `wizard/Modulo 1/CU-XXX/`.
- Si empieza con `CU2-`, usar `wizard/Modulo 2/CU2-XXX/`.
- Si empieza con `CU3-`, usar `wizard/Modulo 3/CU3-XXX/`.
- Si no existe la carpeta del modulo, debe crearse.
- Si no coincide con ningun prefijo, detenerse y pedir confirmacion del modulo. 

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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU-XXX/logs/`.
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
- Ver Logs de sentencias SQL (no en interfaz)
- Registrar Empaque

# **Pasos del formulario-multipaso.

1. Seleccionar Paquete Pendiente.
2. Detalle del Documento (solo lectura).
3. Entrega/Recibe (si aplica) + Confirmar Empaque.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Seleccionar Paquete Pendiente.

Mostrar un Grid llamado "vPaquetesPendientes" 

El Grid se debe cargar mediante un procedimiento almacenado:
- `get_paquetes_por_estado(p_estado)` con `p_estado = "pendiente empacar"`.


Columnas sugeridas del Grid:

- Vcodigo_paquete=codigo_paquete
- vfecha=fecha_actualizado
- vnombre_cliente=nombre_cliente
- vnum_cliente=num_cliente
- vconcatenarpuntoentrega=concatenarpuntoentrega
- vconcatenarnumrecibe=concatenarnumrecibe

Al seleccionar un paquete del Grid, llama el procedimiento get_mov_contable_detalle(Tipo_documento,numero_documento) los parametros son
Tipo_documento="FAC"
numero_documento=Vcodigo_paquete

Vordinal=`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = Vcodigo_paquete AND tipo_documento = 'FAC';` (si no hay filas, usar 1).


Paso 2. Detalle del Documento (solo lectura).

vconcatenarpuntoentrega mostrar como lectura
vconcatenarnumrecibe mostrar como lectura

Mostrar un grid con el detalle de `mov_contable_detalle` del documento seleccionado (solo lectura, no editable): con los datos campos traidos del procedimiento get_mov_contable_detalle

Vnombre_producto=nombre_producto
vcantidad=cantidad


Paso 3. Confirmar Empaque.



# **Registro de Empaque (backend)
mostrar un resumen 
Al dar click en "Empacar" el sistema debera realizar las siguientes transacciones sobre la DB:

1) Registrar en `paquetedetalle` 
   - `codigo_paquete` = Vcodigo_paquete
   - `ordinal` = Vordinal
   - `estado` = "empacado".
   - `tipo_documento` = "FAC".

2) Ejecutar `cambiar_estado_paquete(p_codigo_paquete, p_estado)`.
   - `p_codigo_paquete` = Vcodigo_paquete
   - `p_estado` = "empacado".

3) Actualizar `saldo_stock` usando el SP unico `upd_stock_bases` por cada item del documento:
   - Obtener `codigo_base` desde `mov_contable` del documento seleccionado.
   - Por cada fila de `mov_contable_detalle`:
     - `p_codigo_base = codigo_base`
     - `p_codigo_producto = codigo_producto`
     - `p_cantidad = cantidad`
     - `p_tipodoc = "FAC"` (salida, negativo)
     - `p_numdoc = Vcodigo_paquete`

4) Aplicar salida de partidas por cada item del documento:
   - Ejecutar `aplicar_salida_partidas(p_tipo_documento_venta, p_numero_documento, p_codigo_producto, p_cantidad)` por cada fila de `mov_contable_detalle`:
     - `p_tipo_documento_venta = "FAC"`
     - `p_numero_documento = Vcodigo_paquete`
     - `p_codigo_producto = codigo_producto`
     - `p_cantidad = cantidad`

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
