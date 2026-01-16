**  

CU-015: Gestion Pedidos de clientes.

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

1. Seleccionar Pedido

2. Crear Factura.

3. Datos Entrega.

  

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Seleccionar Pedido.

Cargar un Grid llamado “vPedidosPendientes” con las tuplas devueltas por el SP get_pedidospendientes(). El usuario podrá aplicar filtros por Cliente y Fecha, para cargar el Grid con pedidos diferentes a los cargados por DEFAULT.

  

El Grid debe mostrar las siguientes columnas: 

- fecha del pedido
    
- codigo_pedido
    
- codigo_cliente
    
- nombre_cliente
    

El usuario podrá seleccionar del Grid cuál es el pedido que desea cargar para Facturar.,

Paso 2. Crear Factura.

vFecha_emision= Inicializar con la fecha del sistema. 

vCodigo_base = Seleccionar de una lista la base devuelta por el procedimiento get_bases

Presentar un Grid editable llamado “vProdFactura” que se inicialice con el contenido de vProdPedidos y permita editar las líneas de productos y/o agregar nuevas.  Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Paso 3. Datos Entrega.

vCodigo_Cliente_Direccion = Seleccionar de la lista el Clientes_direccion devuelta por el procedimiento get_direcciones

vTipo_Documento = “F” 

vCodigo_Cliente_Numrecibe = Seleccionar de la lista el Clientes_numrecibe devuelta por el procedimiento get_numrecibe

vCodigo_Cliente_DireccionProv = Seleccionar de la lista el Clientes_direccionprov devuelta por el procedimiento get_direccionesprov

Emitir Factura. Al terminar el formulario multipasos, cuando el usuario da click al boton “Emitir Factura” el sistema deberá realizar las siguientes transacciones sobre la DB:

- Grabar Factura.

- Guardar en la tabla “mov_contable”. vFecha_emision, vCodigo_base,+ vCodigo_Cliente_Direccion, vTipo_Documento, vCodigo_Cliente_Numrecibe, vCodigo_Cliente_DireccionProv.

- Guardar en la tabla “mov_contable_detalle” los datos del grid “vProdFactura”.

No utilizar datos mock.

Solo utilizar datos reales de la base de datos especificada en erp.yml

**