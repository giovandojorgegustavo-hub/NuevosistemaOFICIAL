**  

CU-006: Gestion Pedido.

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-006` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU-006/logs/`.
- El archivo debe nombrarse `CU-006-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

- Confirmar Operacion.

- Estados de loading y error

- Ver Logs de sentencias SQL

- Emitir Factura.

# **Pasos del formulario-multipaso.

1. Seleccionar Pedido

2. Crear Factura.

3. Datos Entrega.

4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

5. Resumen y Emitir Factura.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Seleccionar Pedido.

Cargar un Grid llamado “vPedidosPendientes” con las tuplas devueltas por el SP get_pedidospendientes(). Solo deben aparecer pedidos que tengan al menos un item con saldo > 0 en `pedido_detalle`. El usuario podra aplicar filtros por Cliente y Fecha, para cargar el Grid con pedidos diferentes a los cargados por DEFAULT.

El Grid debe mostrar las siguientes columnas:

- fecha del pedido
    
- codigo_pedido
    
- codigo_cliente
    
- nombre_cliente
    

El usuario podra seleccionar del Grid cual es el pedido que desea cargar para Facturar.

Al seleccionar el pedido, cargar sus items desde `pedido_detalle` y guardar vCodigo_Pedido para el resto del flujo.

Paso 2. Crear Factura.

vFecha_emision= Inicializar con la fecha del sistema.

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases

Presentar un Grid editable llamado “vProdFactura” que se inicialice automaticamente con el contenido del pedido seleccionado (filtrar `pedido_detalle` por vCodigo_Pedido). Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Columnas de vProdFactura: codigo_producto, Descripcion, Cantidad, Precio_total. Saldo no visible.

Reglas de calculo y validacion de vProdFactura:
- La cantidad editable no puede superar el saldo del pedido (pedido_detalle.saldo) del item correspondiente. Si se excede, no permitir avanzar y mostrar mensaje indicando el maximo facturable.
- El precio_total de cada linea en factura se calcula asi: precio_unitario = precio_total_pedido / cantidad_pedido; luego precio_total_factura = precio_unitario * cantidad_factura.
- Al copiar del pedido, si cantidad_factura = saldo_pedido, el precio_total_factura debe ser proporcional al precio_unitario.
- Si el usuario edita cantidad_factura (por ejemplo de 12 a 11), recalcular inmediatamente el precio_total_factura con la formula anterior.
- El total de factura (mov_contable.saldo) es la suma de todos los precio_total_factura del detalle despues de recalcular.

Paso 3. Datos Entrega.

vTipo_Documento = "F"

vPuntoEntrega = Seleccionar de la lista de puntos de entrega devuelta por el procedimiento get_puntos_entrega(vClienteSeleted). Si el cliente no tiene puntos de entrega, no mostrar esta opcion. Al seleccionar, tomar vCod_Dep, vCod_Prov, vCod_Dist y vCodigo_puntoentrega del registro.

Agregar Nuevo Punto de Entrega (opcion siempre disponible).

vCod_Dep, vCod_Prov, vCod_Dist = Seleccionar desde listas dependientes (departamento -> provincia -> distrito) con get_ubigeo_departamentos, get_ubigeo_provincias(p_cod_dep), get_ubigeo_distritos(p_cod_dep, p_cod_prov). El ubigeo final se arma concatenando cod_dep+cod_prov+cod_dist (6 digitos).

vCodigo_puntoentrega = el backend debe generar el siguiente correlativo (MAX + 1) por ubigeo antes de insertar.

vRegion_Entrega = Seleccionar "LIMA" o "PROV".

Si vRegion_Entrega = "PROV": pasar directamente al Paso 5.

Si vRegion_Entrega = "LIMA": mostrar el Paso 4.

Si se selecciona un punto existente, mostrar solo los campos que correspondan segun su vRegion_Entrega.

Paso 4. Datos Recibe (solo si vRegion_Entrega = "LIMA").

vCodigo_Cliente_Numrecibe = Seleccionar de la lista devuelta por el procedimiento get_numrecibe(vClienteSeleted). Mostrar numero y nombre en la lista.

vNumero_Recibe y vNombre_Recibe = Se completan automaticamente segun la seleccion de vCodigo_Cliente_Numrecibe.

Agregar nuevo numrecibe (opcion disponible): permitir capturar numero y nombre y registrarlo.

Paso 5. Resumen y Emitir Factura.

Mostrar resumen de Pedido, Factura y Entrega, con boton “Emitir Factura”.
  
Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton “Emitir Factura” el sistema debera realizar las siguientes transacciones sobre la DB:

- Grabar Factura.

- Guardar en la tabla "puntos_entrega" si se eligio "Agregar Nuevo Punto de Entrega". Guardar codigo_puntoentrega (si no viene, generar MAX + 1 por ubigeo), codigo_cliente, ubigeo (cod_dep+cod_prov+cod_dist), region_entrega y los datos de direccion segun region.

- Guardar en la tabla “mov_contable”. vFecha_emision, vCodigo_base, vTipo_Documento, vCodigo_Cliente_Numrecibe, ubigeo, codigo_puntoentrega y codigo_pedido (pedido seleccionado).
- mov_contable.saldo (numeric(12,2)) = SUM(precio_total) del detalle de factura.

- Actualizar saldos de cliente ejecutando el procedimiento `actualizarsaldosclientes(vClienteSeleted, vTipo_Documento, mov_contable.saldo)`.

- Guardar en la tabla “mov_contable_detalle” los datos del grid “vProdFactura”.
- mov_contable_detalle.precio_total debe ser numeric(12,2) y guardar el precio_total calculado de cada linea.

- Actualizar el saldo de `pedido_detalle` restando las cantidades facturadas ejecutando el procedimiento `salidaspedidos(vTipo_Documento, vNumero_Documento)` (usa el codigo_pedido vinculado en mov_contable).

- Insertar en la tabla `paquete` al emitir la factura:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.
  - `fecha_actualizado` = fecha/hora del sistema.

- Insertar en la tabla `paquetedetalle` una fila por cada item de `mov_contable_detalle`:
  - `codigo_paquete` = mismo valor que `numero_documento` de la factura.
  - `ordinal` = correlativo por item.
  - `estado` = "pendiente empacar".
  - `fecha_registro` = fecha/hora del sistema.

No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
