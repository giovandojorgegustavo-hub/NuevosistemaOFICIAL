**  

CU-009: Crear Ajustes.

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

- Crear Ajuste de Movimiento de Stock.

# **Pasos del formulario-multipaso.

1. Crear Ajuste de Movimiento de Stock.

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Ajuste de Movimiento de Stock.

vFecha = Inicializar con la fecha del sistema.

vTipo_documento = "AJU".

vNum_documento = num serial num de 12 autoincrement (no edit).

vCodigo_base = Seleccionar de la lista de Bases devuelta por el SP get_bases.

Presentar un Grid editable llamado “vDetalleAjuste” que permita agregar, borrar y editar líneas. El Grid debe tener las siguientes columnas: codigo_producto, cantidad.

Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos.

Crear Ajuste de Movimiento de Stock. Al terminar el formulario multipasos, cuando el usuario da click al boton “Crear Ajuste” el sistema deberá realizar las siguientes transacciones sobre la DB:

- Guardar en la tabla “movimiento_stock”. vTipo_documento, vNum_documento, vFecha, vCodigo_base.

- Guardar en la tabla “detalle_movimiento_stock” los datos del grid “vDetalleAjuste”.

No utilizar datos mock. 

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
