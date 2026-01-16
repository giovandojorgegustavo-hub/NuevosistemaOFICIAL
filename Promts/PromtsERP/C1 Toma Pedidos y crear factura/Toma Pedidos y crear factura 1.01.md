**  

CU-001: Toma Pedidos de clientes. y Crear Factura.

  
# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnología que ofrece servicios globales de IaaS y PaaS.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del código:**

- Clase Form Wizard para manejar la lógica

- Validaciones con expresiones regulares

- Componentes Bootstrap (progress bar, alerts, etc.)

- Responsive design para móviles

- El Backend, guarda en MariaDB 10.6.22, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores prácticas de UX.”

**El look and feel

Se requiere que la interfaz gráfica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

# **Funcionalidades requeridas:

- Barra de progreso visual

- Navegación entre pasos (anterior/siguiente)

- Guardar progreso en localStorage

- Confirmar Operación.

- Estados de loading y error

- Ver Logs de sentencias SQL

- Emitir Factura.

# **Pasos del formulario-multipaso.

1. Crear Pedido

2. Crear Factura.

3. Datos Entrega.

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Pedido.

vFechaPedido = Inicializar con la fecha del sistema.

vHoraPedido = Inicializar con la hora del sistema.

vClienteSeleted = Seleccionar de la lista de Clientes devuelta por el SP get_clientes

Presentar un Grid llamado “vProdPedidos” que permita capturar los productos y la cantidad que el cliente desee de cada uno. El Grid debe tener las siguientes columnas codigo_producto, Descripción, Cantidad, Precio, Monto, Saldo. El Grid debe permitir agregar nuevas líneas, borrar y editar líneas existentes.

Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Paso 2. Crear Factura.

vFecha_emision= Inicializar con la fecha del sistema. 

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases

vCodigo_packing = Seleccionar de una lista el Packing devuelta por el procedimiento get_packing

Presentar un Grid editable llamado “vProdFactura” que se inicialice con el contenido de vProdPedidos y permita editar las líneas de productos y/o agregar nuevas.  Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Paso 3. Datos Entrega.

vCodigo_Cliente_Direccion = Seleccionar de la lista el Clientes_direccion devuelta por el procedimiento get_direcciones

vTipo_Documento = “F” 

vCodigo_Cliente_Numrecibe = Seleccionar de la lista el Clientes_numrecibe devuelta por el procedimiento get_numrecibe

vCodigo_Cliente_DireccionProv = Seleccionar de la lista el Clientes_direccionprov devuelta por el procedimiento get_direccionesprov

  

Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton “Emitir Factura” el sistema deberá realizar las siguientes transacciones sobre la DB:

- Grabar el Pedido. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla “pedidos”. vFechaPedido, vHoraPedido, vClienteSeleted.

- Guardar en la tabla “pedido_detalle” los datos del grid “vProdPedidos”.

- Grabar Factura.

- Guardar en la tabla “mov_contable”. vFecha_emision, vCodigo_base, vCodigo_packing, vCodigo_Cliente_Direccion, vTipo_Documento, vCodigo_Cliente_Numrecibe, vCodigo_Cliente_DireccionProv.

- Guardar en la tabla “mov_contable_detalle” los datos del grid “vProdFactura”.

  

No utilizar datos mock 

Solo utilizar datos reales de la base de datos especificada en erp.yml

  

# Cambios pedidos

## Version 2.01

Al terminar la captura del formulario multipaso, el usuario deberá tener disponible la posibilidad de “Emitir Factura” como cierre del proceso.

  

Al dar click al botón “Emitir Factura” el formulario deberá realizar las siguientes transacciones sobre la DB:

- Grabar el Pedido. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla “pedidos”. vFechaPedido, vHoraPedido, vClienteSeleted.

- Guardar en la tabla “pedido_detalle” los datos del grid “vProdPedidos”.

- Grabar Factura.

- Guardar en la tabla “mov_contable”. vFecha_emision, vCodigo_base, vCodigo_packing, vCodigo_Cliente_Direccion, vTipo_Documento, vCodigo_Cliente_Numrecibe, vCodigo_Cliente_DireccionProv.

- Guardar en la tabla “mov_contable_detalle” los datos del grid “vProdFactura”.

  

## Version 2.02

Eliminar la captura del Campo Packing de la creación de Factura en el paso 2 del Formulario.

**