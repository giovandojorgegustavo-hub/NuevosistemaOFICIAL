**  

CU-005: Crear Nota de Credito.

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

- Emitir Nota de Credito.

# **Pasos del formulario-multipaso.

1. Crear Nota de Credito

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Nota de Credito.

vFecha_emision= Inicializar con la fecha del sistema. 

vCodigo_cliente = Seleccionar de la lista de Clientes devuelta por el SP get_clientes

vTipo_Documento = “NC”

vCodigo_base = Seleccionar de la lista de Bases devuelta por el SP get_bases (opcional).

Si vCodigo_base tiene valor, presentar un Grid editable llamado “vProdNotaCredito” que permita agregar, borrar y editar líneas. Para la columna codigo_producto ofrecer la lista de productos que devuelve el SP get_productos. El Grid debe tener las siguientes columnas: codigo_producto, Cantidad.

Validación: No permitir registrar la Nota de Credito si vCodigo_base tiene valor y el grid “vProdNotaCredito” no tiene líneas.

Emitir Nota de Credito. Al terminar el formulario multipasos, cuando el usuario da click al boton “Emitir Nota de Credito” el sistema deberá realizar las siguientes transacciones sobre la DB:

- Grabar Nota de Credito.

- Guardar en la tabla “mov_contable”. vFecha_emision, vCodigo_cliente, vTipo_Documento, vCodigo_base.

- Guardar en la tabla “mov_contable_detalle” los datos del grid “vProdNotaCredito”.

No utilizar datos mock. 

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
