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
CU4004: Fabricacion

# **Prompt AI.
Modulo: 4.
Caso de uso: CU4004 - M4Fabricacion.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.


Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (3 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

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

Incluir manejo de errores y mejores practicas de UX.

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
- Confirmar Operacion
- Estados de loading y error
- Ver Logs de sentencias SQL
- Registrar Fabricacion (salida insumos FBI en movimiento_stock + entrada produccion FBF en mov_contable_prov)
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Datos generales + insumos de fabricacion (fecha + base + insumos).
2. Registrar gastos asociados.
3. Registrar productos producidos.
4. Confirmar y registrar fabricacion (ejecutar todas las transacciones).

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Variables generales:

vFecha = Inicializar con la fecha del sistema.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vCodigo_base no visible editable
vBaseNombre visible editable

vCodigo_provedor = usar proveedor generico 0:
- Si no existe, crearlo con SQL:
  `INSERT INTO provedores (codigo_provedor, nombre) VALUES (0, 'PROVEEDOR GENERICO')`
  (solo si no existe).

vTipoDocumentoStockInsumo = "FBI" (salida de insumos).

vNumDocumentoStockInsumo = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockInsumo` (si no hay filas, usar 1). No editable.

vTipoDocumentoStockProduccion = "FBF" (entrada de productos terminados).

vNumDocumentoStockProduccion = calcular con SQL:
`SELECT COALESCE(MAX(num_documento_compra), 0) + 1 AS next FROM mov_contable_prov WHERE tipo_documento_compra = vTipoDocumentoStockProduccion AND codigo_provedor = vCodigo_provedor` (si no hay filas, usar 1). No editable.

vTipoDocumentoGasto = "GAS".

vNumDocumentoGasto = calcular con SQL:
`SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_contable_gasto WHERE tipodocumento = vTipoDocumentoGasto` (si no hay filas, usar 1). Se incrementa por cada gasto registrado. No editable.

Paso 1. Datos generales + registrar insumos de fabricacion.

En este paso se definen primero los datos generales de la fabricacion (siempre hay insumos), por lo tanto:

vFecha = fecha actual no editable si visible.
vCodigo_base = seleccionar de la lista de Bases devuelta por el SP get_bases.

Presentar un Grid editable llamado "vDetalleInsumos" que permita agregar, borrar y editar lineas.
vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vcodigo_producto_insumo no visible editable
vnombre_producto_insumo visible no editable

El Grid debe tener las siguientes columnas: vcodigo_producto_insumo, vnombre_producto_insumo, vcantidad_insumo.
vnombre_producto_insumo = se completa segun el producto seleccionado (solo lectura).
vcantidad_insumo = campo editable. Acepta decimales con hasta 2 digitos.


vOrdinalInsumo = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipoDocumentoStockInsumo AND numdocumentostock = vNumDocumentoStockInsumo` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

## Paso 2. Registrar gastos asociados.

Registrar multiples gastos (cada fila es un gasto).

Presentar un Grid editable llamado "vDetalleGastos" que permita agregar, borrar y editar lineas.
vEtiquetasGasto = Llamada SP: `get_etiquetas_gastos()` (devuelve campo_visible)
Campos devueltos: `codigoetiquetagasto`, `nombre`
vCuentas = Llamada SP: `get_cuentasbancarias()` (devuelve campo_visible)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`

Variables por fila:
vcodigoetiquetagasto no visible editable
vnombre_etiquetagasto visible no editable
vcodigo_cuentabancaria no visible editable
vnombre_cuentabancaria visible no editable
vbanco visible no editable
vmonto_gasto visible editable

El Grid debe tener las siguientes columnas: vcodigoetiquetagasto, vnombre_etiquetagasto, vnombre_cuentabancaria, vbanco, vmonto_gasto.

Para cada fila:
- Registrar cabecera en mov_contable_gasto (monto y cuenta por fila).
- Registrar detalle en mov_contable_gasto_detalle con ordinal = 1.
- vNumDocumentoGasto se asigna automaticamente y se incrementa por cada fila.

Validaciones:
- Debe existir al menos 1 gasto en vDetalleGastos.
- Cada gasto requiere etiqueta, cuenta bancaria y monto > 0.

Paso 3. Registrar productos producidos.

Presentar un Grid editable llamado "vDetalleProduccion" que permita agregar, borrar y editar lineas.
vProductosProduccion = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vcodigo_producto_producido no visible editable
vnombre_producto_producido visible no editable

El Grid debe tener las siguientes columnas: vcodigo_producto_producido, vnombre_producto_producido, vcantidad_producida.

vnombre_producto_producido = se completa segun el producto seleccionado (solo lectura).

vcantidad_producida = campo editable. Acepta decimales con hasta 2 digitos.
El costo total se calcula automaticamente con aplicar_costo_fabricacion.

vOrdinalProduccion = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_mov_contable_prov WHERE tipo_documento_compra = vTipoDocumentoStockProduccion AND num_documento_compra = vNumDocumentoStockProduccion AND codigo_provedor = vCodigo_provedor` (si no hay filas, usar 1).

Paso 4. Confirmar y registrar fabricacion.

En este paso se muestra el resumen final y el boton "Registrar Fabricacion".
Requerir confirmacion explicita antes de registrar.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

## Tablas a registrar
movimiento_stock (insumos):
tipodocumentostock=vTipoDocumentoStockInsumo  
numdocumentostock=vNumDocumentoStockInsumo  
fecha=vFecha  
codigo_base=vCodigo_base  

detalle_movimiento_stock (insumos, por item):
tipodocumentostock=vTipoDocumentoStockInsumo  
numdocumentostock=vNumDocumentoStockInsumo  
ordinal=vOrdinalInsumo  
codigo_producto=vcodigo_producto_insumo  
cantidad=vcantidad_insumo  

mov_contable_prov (produccion, cabecera minima):
tipo_documento_compra=vTipoDocumentoStockProduccion  
num_documento_compra=vNumDocumentoStockProduccion  
codigo_provedor=vCodigo_provedor  
fecha=vFecha  
monto=se calcula automaticamente con aplicar_costo_fabricacion  

detalle_mov_contable_prov (produccion, por item):
tipo_documento_compra=vTipoDocumentoStockProduccion  
num_documento_compra=vNumDocumentoStockProduccion  
codigo_provedor=vCodigo_provedor  
codigo_base=vCodigo_base  
ordinal=vOrdinalProduccion  
codigo_producto=vcodigo_producto_producido  
cantidad=vcantidad_producida  
cantidad_entregada=vcantidad_producida  
saldo=vcantidad_producida  
monto=se calcula automaticamente con aplicar_costo_fabricacion  

mov_contable_gasto:
tipodocumento=vTipoDocumentoGasto  
numdocumento=vNumDocumentoGasto  
tipo_documento_compra=vTipoDocumentoStockProduccion  
num_documento_compra=vNumDocumentoStockProduccion  
codigo_provedor=vCodigo_provedor  
fecha=vFecha  
monto=vmonto_gasto (por fila)  
descripcion=vnombre_etiquetagasto (por fila)  
codigo_cuentabancaria=vcodigo_cuentabancaria (por fila)  

mov_contable_gasto_detalle (por item):
tipodocumento=vTipoDocumentoGasto  
numdocumento=vNumDocumentoGasto  
ordinal=1  
codigoetiquetagasto=vcodigoetiquetagasto  

## Procedimientos que se llaman
`CALL aplicar_salida_partidas(vTipoDocumentoStockInsumo, vNumDocumentoStockInsumo, vcodigo_producto_insumo, vcantidad_insumo)` por item de insumo  
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto_insumo, vcantidad_insumo, vTipoDocumentoStockInsumo, vNumDocumentoStockInsumo)` por item de insumo  
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto_producido, vcantidad_producida, vTipoDocumentoStockProduccion, vNumDocumentoStockProduccion)` por item producido  
`CALL aplicar_costo_fabricacion(vTipoDocumentoStockInsumo, vNumDocumentoStockInsumo, vTipoDocumentoStockProduccion, vNumDocumentoStockProduccion, vCodigo_provedor)` despues de registrar produccion y gastos  

**
