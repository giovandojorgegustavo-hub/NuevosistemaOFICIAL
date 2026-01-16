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

- Despachar viajes.

  
# **Pasos del formulario-multipaso.

1. Crear Viaje

2. Datos viajesdetalle.

**Descripción de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexión con la DB, los datos de conexión se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexión y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear viaje.

vCodigo_viaje =num serial num de 12 autoincrement (no edit)

vFechaViaje = Inicializar con la fecha del sistema.

Vnombre_motorizado = campo para escribir texto

Vnumero_wsp = campo para escribir texto

Vnum_llamadas = campo para escribir texto

Vnum_yape = campo para escribir texto

Vlink = campo para escribir texto  
Vobservacion = campo para escribir texto

vBaseSelected = Seleccionar de la lista de Bases devuelta por el SP get_bases

Capturar en un grid llado vViajeDetalle es un grill que tiene una columna editable numero_documento y otra columna editable que lo escriba o pueda elegir de la lista  codigo_packing que es uno de la lista que sale de get_packing.

  


Al dar click al botón “Despachar viaje” el formulario deberá realizar las siguientes transacciones sobre la DB:

- Grabar el viajes. Tomar los datos capturados en el paso 1:

- Guardarlos en la tabla “viajes”. vCodigo_viaje, vFechaViaje, Vnombre_motorizado,Vnumero_wsp,Vnum_llamadas,Vnum_yape,Vlink,Vobservacion.

  

- Guardar en la tabla “viajes_detalle” los datos del grid “vViajeDetalle”.

- Grabar viajesdetalle

.

- Guardar en la tabla “vViajeDetalle”. numero_documento, y en la tabla mov_contable guardar codigo_packing**