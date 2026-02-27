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
CU3003: Nota Credito Provedor

# **Prompt AI.
Modulo: 3.
Caso de uso: CU3003 - M3NotaCreditoProvedor.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (si hay varios pasos) o de un solo paso (si el formulario solo tiene un paso). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
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
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 3/CU3-003/logs/`.
- El archivo debe nombrarse `CU3-003-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
- Registrar Nota Credito Provedor
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Seleccionar FCC.
2. Editar detalle.
3. Confirmar y registrar Nota Credito.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

## Bootstrap inicial (antes del paso 1)

vFecha = fecha del sistema en formato `YYYY-MM-DD`.
vFechaDisplay = fecha/hora del sistema para mostrar en resumen.
vTipo_documento_compra = "NCC".
vNum_documento_compra = calcular con SQL:
`SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = 'NCC'`.

vProveedores = Llamada SP: `get_proveedores()` (devuelve campo_visible)
Campos devueltos: `codigo_provedor`, `nombre`
Variables:
vCodigo_provedor no visible editable
vNombreProvedor visible editable

vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vCodigo_producto no visible editable
vNombreProducto visible editable

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`
Variables:
vCodigo_base no visible editable
vNombreBase visible editable

vFacturasFCC = consulta SQL de compras `FCC` con saldo pendiente > 0, ordenadas por fecha/numero.

## Paso 1. Seleccionar FCC

vNombreProvedor visible editable con typeahead (filtra por nombre/codigo).
vCodigo_provedor no visible editable (se completa al seleccionar proveedor o factura).

Mostrar grilla de `vFacturasFCC` filtrable por proveedor/texto.
Seleccionar una fila FCC es obligatorio para continuar.

Al seleccionar FCC:
- Cargar detalle de la FCC via endpoint `POST /api/fcc-detalle`.
- Obtener columnas por item: `ordinal`, `codigo_base`, `codigo_producto`, `nombre_producto`, `saldo_disponible`, `costo_unitario`, `monto_disponible`.
- Avanzar al paso 2.

## Paso 2. Editar detalle

vTipo_nota_credito visible editable con dos opciones:
- `PRODUCTO`
- `DINERO`

Si `vTipo_nota_credito = DINERO`:
- Mostrar solo `vMonto_dinero` (decimal positivo, max 2 decimales).
- No capturar detalle de productos.

Si `vTipo_nota_credito = PRODUCTO`:
- Grilla `vDetalleNotaCredito` precargada desde la FCC seleccionada.
- Columnas visibles:
  - `vOrdinal` (no editable)
  - Producto (nombre/codigo, no editable)
  - `vCantidad` (editable, decimal positivo con max 2 decimales, no puede exceder `vSaldoMax`)
  - `vMonto` (no editable en UI, se recalcula como `vCantidad * vCostoUnitario`)

Reglas:
- `vOrdinal` secuencial por fila.
- Si tipo = `PRODUCTO`: `vSaldo` se maneja internamente como `0` para payload y debe existir al menos una linea valida.
- Si tipo = `DINERO`: no debe enviar lineas de detalle.
- `vTotal_nota`:
  - tipo `PRODUCTO`: `SUM(vDetalleNotaCredito.monto)` redondeado a 2 decimales.
  - tipo `DINERO`: `vMonto_dinero`.

## Paso 3. Confirmar y registrar Nota Credito

Mostrar resumen de proveedor, fecha, documento y total.
Mostrar detalle resumido (`ordinal`, `codigo_base`, `codigo_producto`, `cantidad`, `monto`).
Requerir checkbox de confirmacion para habilitar el submit.

Al hacer click en "Registrar Nota Credito", ejecutar transaccion DB:

1. INSERT en `mov_contable_prov`:
   - `tipo_documento_compra = vTipo_documento_compra`
   - `num_documento_compra = vNum_documento_compra`
   - `codigo_provedor = vCodigo_provedor`
   - `fecha = vFecha`
   - `monto = vTotal_nota`
   - `saldo = vTotal_nota`

2. Si `vTipo_nota_credito = PRODUCTO`, INSERT por cada item en `detalle_mov_contable_prov`:
   - `tipo_documento_compra`, `num_documento_compra`, `codigo_provedor`
   - `codigo_base` (si viene 0/null, guardar NULL)
   - `ordinal`
   - `codigo_producto`
   - `cantidad`
   - `cantidad_entregada = cantidad`
   - `saldo = 0`
   - `monto`

3. Si `vTipo_nota_credito = PRODUCTO`, por cada item ejecutar:
   - `CALL aplicar_nota_credito_partidas_prov(vTipo_documento_compra, vNum_documento_compra, vCodigo_provedor, codigo_producto, cantidad)`
   - Debe consumir saldo de detalle FCC por FIFO y registrar trazabilidad en `detalle_movs_partidas_prov`.

4. Si `vTipo_nota_credito = PRODUCTO`, por cada item con `codigo_base > 0`, ejecutar:
   - `CALL upd_stock_bases(codigo_base, codigo_producto, cantidad, vTipo_documento_compra, vNum_documento_compra)`

5. Ejecutar:
   - `CALL aplicar_nota_credito_a_facturas_prov(vCodigo_provedor, vNum_documento_compra, vTotal_nota)`

6. Ejecutar:
   - `CALL actualizarsaldosprovedores(vCodigo_provedor, vTipo_documento_compra, vTotal_nota)`

7. COMMIT.
   - Si falla cualquier sentencia/SP: ROLLBACK y devolver `ERROR_REGISTRAR_NCC`.









No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
