**  

CU-006: Compras y facturar la compra.

# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnología que ofrece servicios globales de IaaS y PaaS.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del código:**

- Clase Form Wizard para manejar la lógica

- Validaciones con expresiones regulares

- Componentes Bootstrap (progress bar, alerts, etc.)

- Responsive design para móviles

- El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

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

- Facturar Compra.

# **Pasos del formulario-multipaso.

1. Crear Compra.

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Compra.

vFecha = Inicializar con la fecha del sistema.

vCodigo_provedor = Seleccionar de la lista de Proveedores devuelta por el SP get_proveedores.

vNum_documento_compra = num serial num de 12 autoincrement (no edit).

vTipo_documento_compra = "FC".

Presentar un Grid editable llamado “vDetalleCompra” que permita agregar, borrar y editar líneas. El Grid debe tener las siguientes columnas: codigo_producto, cantidad, saldo, precio_compra.

Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

El saldo se pone como valor inicial el valor de la cantidad.

Facturar Compra. Al terminar el formulario multipasos, cuando el usuario da click al boton “Facturar Compra” el sistema deberá realizar las siguientes transacciones sobre la DB:

- Grabar Compra.

- Guardar en la tabla “mov_contable_compras”. vTipo_documento_compra, vNum_documento_compra, vCodigo_provedor, vFecha.

- Guardar en la tabla “detalle_mov_contable_compras” los datos del grid “vDetalleCompra”.

No utilizar datos mock. 

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
