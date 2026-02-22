## Precondicion de Acceso (Obligatoria)
La pagina debe recibir dos parametros obligatorios y un tercer parametro opcional. Los parametros son:

- `Codigo_usuario` varchar(36)
- `OTP` varchar(6)
- `vParámetros` JSON (opcional)

Al iniciar la pagina se debe llamar el SP `validar_otp_usuario` pasandole como parametros `Codigo_usuario` y `OTP` para verificar si es un usuario valido.

El SP `validar_otp_usuario` devuelve:
- `1`: SI usuario y OTP son validos.
- `-1`: OTP expirado.
- `0`: NO EXISTE TOKEN.

Si `validar_otp_usuario` devuelve un valor diferente de `1`:
- Mostrar mensaje exacto: `Warning ACCESO NO AUTORIZADO !!!`
- Cerrar la pagina y salir del programa.

**
CU009: Anular Pedidos.

# **Prompt AI.
Modulo: 1.
Caso de uso: CU009 - M1AnularPedidos.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.

Como desarrollador de aplicaciones web, ayudame a crear un formulario de gestion multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Si el caso no existe en el archivo, detenerse y pedir confirmacion del modulo.
En `wizard/Modulo 1/server.js` solo registrar el CU en `cuDefs` (proxy/ruteo del modulo).
Toda la logica backend del caso (endpoints, conexion DB, transacciones y logs) debe implementarse en `wizard/Modulo 1/CU1-009/server.js`.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3

**Estructura del codigo:**
Clase Form Wizard para manejar la logica
Validaciones con expresiones regulares
Componentes Bootstrap (progress bar, alerts, etc.)
Responsive design para moviles
El Backend, guarda en MySQL, con endpoints js corriendo sobre [node.js](http://node.js)

**User Experience (UX)

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 1/CU1-009/logs/`.
El archivo debe nombrarse `CU009-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
Los logs deben incluir: inicio del servidor, endpoints invocados, errores, y sentencias SQL con parametros.

**El look and feel

Se requiere que la interfaz grafica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
`design.json` con paleta, tipografias, tamanos, radios, sombras, grid y tokens de componentes.
`tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamanos y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:
Barra de progreso visual
Navegacion entre pasos (anterior/siguiente)
Confirmar Operacion.
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Anular Pedido.
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar Pedido con saldo pendiente.
2. Ver detalle del Pedido (solo lectura).
3. Confirmar y Anular Pedido.

# **Descripcion de los pasos del formulario de gestion.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1. Seleccionar Pedido con saldo pendiente.

Mostrar un Grid llamado "vPedidosPendientes" que llama al siguiente SP: `get_pedidospendientes()` (devuelve campo_visible)
Campos devueltos: `codigo_pedido`, `codigo_cliente`, `nombre_cliente`, `numero_cliente`, `fecha`, `created_at`
Variables:
vCodigo_pedido visible no editable
vCodigo_cliente no visible no editable
vNombre_cliente visible no editable
vNumero_cliente visible no editable
vFecha_pedido visible no editable
vCreated_at no visible no editable

Reglas:
- Mostrar solo pedidos con saldo pendiente (mismo criterio usado en Gestion Pedido).
- `get_pedidospendientes()` debe excluir pedidos con `estado = 'anulado'`.
- Permitir filtros por Cliente y Fecha para recargar el Grid.
- Al seleccionar un pedido del Grid, pasar al siguiente paso.

## Paso 2. Ver detalle del Pedido (solo lectura).

Mostrar un Grid llamado "vPedidoDetalle" que se carga con el SP:
`get_pedido_detalle_por_pedido(p_codigo_pedido)` con:
p_codigo_pedido = vCodigo_pedido (seleccionado en Paso 1)

Campos devueltos: `codigo_producto`, `nombre_producto`, `saldo`, `precio_unitario`
Variables:
vProductoCodigo no visible no editable
vProductoNombre visible no editable
vCantidadSaldo visible no editable
vPrecioUnitario visible no editable
vPrecioTotal visible no editable (`vCantidadSaldo * vPrecioUnitario`)

Reglas:
- Mostrar solo lectura (no editable).
- Mostrar resumen de pedido: cliente, fecha, total pendiente.
- Si el pedido no tiene lineas con saldo > 0, bloquear anulación y mostrar error.

## Paso 3. Confirmar y Anular Pedido.

Mostrar resumen final del pedido y requerir confirmacion explicita.

Al confirmar, ejecutar en transaccion:
1) Validar nuevamente que el pedido existe y no esta anulado.
2) Validar que tiene saldo pendiente en `pedido_detalle`.
3) Actualizar estado del pedido:
`UPDATE pedidos
 SET estado = 'anulado'
 WHERE codigo_pedido = vCodigo_pedido
   AND estado <> 'anulado';`

Resultado esperado:
- El pedido queda en estado `anulado`.
- Ya no debe volver a aparecer en `get_pedidospendientes()`.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.


