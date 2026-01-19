**  

CU-007: Crear Recibos.

# **Prompt AI.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso: `wizard/CU-007` (siempre `wizard/CU-XXX`), sobrescribiendo su propio wizard para evitar duplicados. Priorizar codigo limpio y eficiente: mientras menos codigo, mejor, sin sacrificar claridad.

**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica

- Validaciones con expresiones regulares

- Componentes Bootstrap (progress bar, alerts, etc.)

- Responsive design para moviles

- El Backend, guarda en MariaDB 10.6.22, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/CU-007/logs/`.
- El archivo debe nombrarse `CU-007-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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

- Guardar progreso en localStorage

- Confirmar Operacion.

- Estados de loading y error

- Ver Logs de sentencias SQL

- Registrar Recibo.

# **Pasos del formulario-multipaso.

1. Registrar Recibo.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Crear Recibo.

vFecha_emision = Inicializar con la fecha del sistema.

vTipo_documento = "RC".

vNumero_documento = correlativo numerico (12 digitos) no editable. Se debe generar con `MAX(numero_documento) + 1` filtrando por `tipo_documento = 'RC'` en `mov_contable`.

vCodigo_cliente = Seleccionar de la lista de Clientes devuelta por el GET /api/clients (SP get_clientes).

vCodigo_cuentabancaria = Seleccionar de la lista de Cuentas bancarias devuelta por el SP get_cuentasbancarias.

vMonto = campo numerico para escribir el monto del recibo (mayor que 0).

Al terminar la captura del formulario, el usuario debera tener disponible la posibilidad de “Registrar Recibo” como cierre del proceso.

Al dar click al boton “Registrar Recibo” el formulario debera realizar las siguientes transacciones sobre la DB:

- Grabar el recibo. Tomar los datos capturados en el paso 1 y guardarlos en la tabla `mov_contable`:
  - `fecha_emision` = vFecha_emision
  - `tipo_documento` = vTipo_documento
  - `numero_documento` = vNumero_documento
  - `codigo_cliente` = vCodigo_cliente
  - `codigo_cuentabancaria` = vCodigo_cuentabancaria
  - `saldo` = vMonto

No utilizar datos mock. 

Solo utilizar datos reales de la base de datos especificada en erp.yml

**
