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
CU4001: Transferencias

# **Prompt AI.
Modulo: 4.
Caso de uso: CU4001 - M4Transferencias.
Puerto del wizard: 3016 (ver `Promts/Herramientas/puertos.json`).


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
- Registrar transferencia (TRS) con salida (origen) y entrada (destino)
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Registrar Transferencia (TRS).
2. Confirmar y registrar transferencia.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1  Registrar Transferencia (TRS) y Entrada (TRE).

vFecha = Inicializar con la fecha del sistema.

vTipodocumentostockSalida = "TRS".
vTipodocumentostockEntrada = "TRE".

vNumdocumentostockSalida = calcular con SQL:
`SELECT COALESCE(MAX(numdocumentostock), 0) + 1 AS next FROM movimiento_stock WHERE tipodocumentostock = vTipodocumentostockSalida` (si no hay filas, usar 1). No editable.

vNumdocumentostockEntrada = vNumdocumentostockSalida + 1 (asegurar que ambos sean numericos; no volver a consultar SQL para evitar duplicados). No editable.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`, `latitud`, `longitud`
Variables:
vCodigo_base no visible editable
vBaseNombre visible editable
vCodigo_basedestino no visible editable
vBaseNombreDestino visible editable

Presentar un Grid editable llamado "vDetalleTransferencia" que permita agregar, borrar y editar lineas.
vProductos = Llamada SP: `get_productos()` (devuelve campo_visible)
Campos devueltos: `codigo_producto`, `nombre`
Variables:
vcodigo_producto no visible editable
vNombreProducto visible editable

El Grid debe tener las siguientes columnas: vcodigo_producto, Vcantidad.
Vcantidad= es un campo editable. Acepta decimales con hasta 2 digitos.


ordinaldetalleSalida =se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipodocumentostockSalida AND numdocumentostock = vNumdocumentostockSalida` (si no hay filas, usar 1).

ordinaldetalleEntrada =se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM detalle_movimiento_stock WHERE tipodocumentostock = vTipodocumentostockEntrada AND numdocumentostock = vNumdocumentostockEntrada` (si no hay filas, usar 1).

En la vista, cada campo debe usar el mismo nombre de variable definido arriba y registrar ese valor.

Paso 2. Confirmar y registrar transferencia.

- Mostrar resumen de base origen, base destino y lineas del detalle.
- Requerir confirmacion explicita antes de registrar.


No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

## Tablas a registrar
movimiento_stock (salida TRS):
tipodocumentostock=vTipodocumentostockSalida  
numdocumentostock=vNumdocumentostockSalida  
fecha=vFecha  
codigo_base=vCodigo_base  
codigo_basedestino=vCodigo_basedestino  

movimiento_stock (entrada TRE):
tipodocumentostock=vTipodocumentostockEntrada  
numdocumentostock=vNumdocumentostockEntrada  
fecha=vFecha  
codigo_base=vCodigo_basedestino  
codigo_basedestino=vCodigo_base  

detalle_movimiento_stock (salida TRS, por item):
ordinal=ordinaldetalleSalida  
tipodocumentostock=vTipodocumentostockSalida  
numdocumentostock=vNumdocumentostockSalida  
codigo_producto=vcodigo_producto  
cantidad=Vcantidad  

detalle_movimiento_stock (entrada TRE, por item):
ordinal=ordinaldetalleEntrada  
tipodocumentostock=vTipodocumentostockEntrada  
numdocumentostock=vNumdocumentostockEntrada  
codigo_producto=vcodigo_producto  
cantidad=Vcantidad  

## Procedimientos que se llaman
`CALL upd_stock_bases(vCodigo_base, vcodigo_producto, Vcantidad, vTipodocumentostockSalida, vNumdocumentostockSalida)` por item (salida TRS)  
`CALL upd_stock_bases(vCodigo_basedestino, vcodigo_producto, Vcantidad, vTipodocumentostockEntrada, vNumdocumentostockEntrada)` por item (entrada TRE)  

**
