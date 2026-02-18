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
CU4003: Gestion Compras

# **Prompt AI.
Modulo: 4.
Caso de uso: CU4003 - M4GestionCompras.
Puerto del wizard: 3018 (ver `Promts/Herramientas/puertos.json`).


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.
Para cualquier campo de cantidad, aceptar decimales con `.` o `,` y normalizar a `.` antes de enviar al backend.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso. Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

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

Incluir manejo de errores y mejores practicas de UX."

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-XXX/logs/`.
- El archivo debe nombrarse `CU2-XXX-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Confirmar Operacion.
- Estados de loading y error
- Ver Logs de sentencias SQL (no en interfaz)
- Gestionar Remitos de Compras
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar Factura de Compra Pendiente.
2. Definir Remito de Compra.
3. Confirmar y Registrar Remito.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Paso 1. Seleccionar Factura de Compra Pendiente.

Mostrar un Grid llamado "vFacturasPendientes" que llama al siguiente SP: `get_facturascompras_pendientes()` (devuelve campo_visible)
Campos devueltos: `tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`, `nombre_provedor`, `fecha`
Variables:
vTipo_documento_compra_origen = `tipo_documento_compra` (visible no editable)
vNum_documento_compra_origen = `num_documento_compra` (visible no editable)
vCodigo_provedor = `codigo_provedor` (no visible no editable)
vNombre_provedor = `nombre_provedor` (visible no editable)
vFecha = `fecha` (visible no editable)
Solo deben aparecer facturas de compra tipo **FCC** que tengan al menos un item con `cantidad_entregada < cantidad`.


El usuario podra seleccionar del Grid cual es la factura de compra para pasar al paso siguiente.




## Paso 2. Definir Remito de Compra.


vTipo_documento_compra_remito = "REM".

vNum_documento_compra_remito =
`SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = vTipo_documento_compra_remito` (si no hay filas, usar 1). No editable.
vOrdinal = `SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = vTipo_documento_compra_remito AND num_documento_compra = vNum_documento_compra_remito AND codigo_provedor = vCodigo_provedor` (si no hay filas, usar 1).

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vCodigo_base no visible editable
vBaseNombre visible editable


Presentar un Grid editable llamado "vDetalleRemitoCompra" que se inicialice automaticamente con el SP:
`get_detalle_compra_por_documento(p_tipo_documento_compra, p_num_documento_compra, p_codigo_provedor)`
Parametros:
p_tipo_documento_compra = vTipo_documento_compra_origen
p_num_documento_compra = vNum_documento_compra_origen
p_codigo_provedor = vCodigo_provedor
Campos devueltos: `ordinal`, `codigo_producto`, `nombre_producto`, `cantidad`, `cantidad_entregada`, `saldo`
Variables:
vOrdinalCompra no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vCantidadDisponible visible editable (cantidad - cantidad_entregada)

Regla:
- vCantidadDisponible <= (cantidad - cantidad_entregada)



## Paso 3. Confirmar y Registrar Remito.

Mostrar resumen de Remito seleccionada, Base destino y lineas del remitodetalle.
Requerir confirmacion explicita antes de registrar.


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

## Tablas a registrar
mov_contable_prov:
tipo_documento_compra=vTipo_documento_compra_remito  
num_documento_compra=vNum_documento_compra_remito  
codigo_provedor=vCodigo_provedor  
fecha=vFecha  
monto=0  
saldo=0  

detalle_mov_contable_prov (por item):
tipo_documento_compra=vTipo_documento_compra_remito  
num_documento_compra=vNum_documento_compra_remito  
codigo_provedor=vCodigo_provedor  
codigo_base=vCodigo_base  
ordinal=vOrdinal  
codigo_producto=vcodigo_producto  
cantidad=vCantidadDisponible  
cantidad_entregada=vCantidadDisponible  
saldo=vCantidadDisponible  
monto=0  

## Procedimientos que se llaman
`CALL aplicar_entrega_compra(vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor, vOrdinalCompra, vCantidadDisponible)` por item  
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto, vCantidadDisponible, vTipo_documento_compra_remito, vNum_documento_compra_remito)` por item  

**
