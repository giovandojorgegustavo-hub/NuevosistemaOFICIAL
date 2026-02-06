**

CU5001: Transferencia Bancos

# **Prompt AI.
Modulo: 5.
Caso de uso: CU5001 - M5TransferenciaBancos.
Puerto del wizard: 3020 (ver `Promts/Herramientas/puertos.json`).


## Campos devueltos por SPs de lectura (obligatorio)
Usar los nombres exactos de columnas segun `Promts/PromtsERP/_procedimientos_campos.md`.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar el modulo indicado en `Promts/Herramientas/puertos.json` (campo `module`).
Si el caso no existe en el archivo, detenerse y pedir confirmacion del modulo.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**

- Clase Form Wizard para manejar la logica
- Validaciones con expresiones regulares
- Componentes Bootstrap (progress bar, alerts, etc.)
- Responsive design para moviles
- El Backend, guarda en MySQL, con endpoints js corriendo sobre node.js

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 3/CU3-XXX/logs/`.
- El archivo debe nombrarse `CU3-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Registrar transferencia bancaria (TRS)
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Registrar Transferencia Bancaria (TRS).
2. Confirmar y Registrar Operacion.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Registrar Transferencia Bancaria (TRS).

vFecha = Inicializar con la fecha del sistema.

vTipodocumento = "TRS".

vNumdocumento = calcular con SQL:
`SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_operaciones_contables WHERE tipodocumento = vTipodocumento` (si no hay filas, usar 1). No editable.

vCuentas = Llamada SP: `get_cuentasbancarias()` (devuelve campo_visible)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:
vCodigo_cuentabancaria no visible editable
vCuentaNombre visible editable
vCodigo_cuentabancaria_destino no visible editable
vCuentaDestinoNombre visible editable
vCuentaBanco visible editable

vMonto = Monto de la transferencia. Campo editable.

vDescripcion = Texto libre. Campo editable.

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Paso 2. Confirmar y Registrar Operacion.

Mostrar resumen de la transferencia seleccionada y las cuentas origen/destino.

Al terminar el formulario multipasos, cuando el usuario da click al boton "Registrar Transferencia" el sistema debera realizar las siguientes transacciones sobre la DB:

- Guardar en la tabla `mov_operaciones_contables`:
 tipodocumento=vTipodocumento
 numdocumento=vNumdocumento
 fecha=vFecha
 monto=vMonto
 codigo_cuentabancaria=vCodigo_cuentabancaria
 codigo_cuentabancaria_destino=vCodigo_cuentabancaria_destino
 descripcion=vDescripcion

- Ejecutar el SP `aplicar_operacion_bancaria(vTipodocumento, vNumdocumento)` para actualizar saldos de cuentas.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**