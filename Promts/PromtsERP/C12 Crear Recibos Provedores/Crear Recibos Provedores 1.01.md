**  

CU-012: Crear Recibos Provedores.

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

- Registrar Recibos Provedores.

# **Pasos del formulario-multipaso.

1. Registrar recibos provedores

# **Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear recibos provedores.

vFecha = Inicializar con la fecha del sistema.

vTipo_documento_compra = "RC".

vNum_documento_compra = num serial num de 12 autoincrement (no edit).

vCodigo_provedor = Seleccionar de la lista de Proveedores devuelta por el GET /api/proveedores (SP get_proveedores)


Al terminar la captura del formulario multipaso, el usuario deberá tener disponible la posibilidad de “Registrar Recibo” como cierre del proceso.

  

Al dar click al botón “Registrar Recibo” el formulario deberá realizar las siguientes transacciones sobre la DB:

- Grabar el pago. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla mov_contable_compras. vTipo_documento_compra, vNum_documento_compra, vCodigo_provedor, vFecha.

No utilizar datos mock. 

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
