# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnología que ofrece servicios globales de IaaS y PaaS.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del código:**

- Clase Form Wizard para manejar la lógica

- Validaciones con expresiones regulares

- Componentes Bootstrap (progress bar, alerts, etc.)

- Responsive design para móviles

- El Backend, guarda en MYSQL 10.6.22, con endpoints js corriendo sobre [node.js](http://node.js)

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

- Registrar Recibos.

  
# **Pasos del formulario-multipaso.

1. Registrar recibos

**Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear recibos.

vFecha = Inicializar con la fecha del sistema.

vCodigo_pago =num serial num de 12 autoincrement (no edit)

vCodigo_cliente = Seleccionar de la lista de Clientes devuelta por el GET /api/clients (SP get_clientes)

vCuenta_bancariaSelect = Seleccionar de la lista de Cuentas bancarias devuelta por el SP get_cuentasbancarias

vMonto = campo para escribir texto 


Al terminar la captura del formulario multipaso, el usuario deberá tener disponible la posibilidad de “Registrar Recibo” como cierre del proceso.

  

Al dar click al botón “Registrar Recibo” el formulario deberá realizar las siguientes transacciones sobre la DB:

- Grabar el pago. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla mov_contable. fecha_emision, vCodigo_pago, vCuenta_bancariaSelect, vCodigo_cliente, vMonto.

  
