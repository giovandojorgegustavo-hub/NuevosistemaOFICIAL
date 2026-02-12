**

CU5004: Factura Gasto

# **Prompt AI.
Modulo: 5.
Caso de uso: CU5004 - M5FacturaGasto.
Puerto del wizard: 3023 (ver `Promts/Herramientas/puertos.json`).



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
- Registrar factura de gasto (FCG)
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Registrar Factura de Gasto (FCG).
2. Registrar detalle de etiquetas.
3. Confirmar y Registrar Operacion.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Registrar Factura de Gasto (FCG).

vFecha = Inicializar con la fecha del sistema.

vTipoDocumentoGasto = "FCG".

vNumDocumentoGasto = calcular con SQL:
`SELECT COALESCE(MAX(numdocumento), 0) + 1 AS next FROM mov_contable_gasto WHERE tipodocumento = vTipoDocumentoGasto` (si no hay filas, usar 1). No editable.

vMontoGastoTotal = campo editable.

vCuentas = Llamada SP: `get_cuentasbancarias()` (devuelve campo_visible)
Campos devueltos: `codigo_cuentabancaria`, `nombre`, `banco`
Variables:
vCodigo_cuentabancaria no visible editable
vCuentaNombre visible editable
vCuentaBanco visible editable

Paso 2. Registrar detalle de etiquetas.

Presentar un Grid editable llamado "vDetalleGasto" que permita agregar, borrar y editar lineas.
vEtiquetasGasto = Llamada SP: `get_etiquetas_gastos()` (devuelve campo_visible)
Campos devueltos: `codigoetiquetagasto`, `nombre`
Variables:
vcodigoetiquetagasto no visible editable
vnombre_etiquetagasto visible no editable

El Grid debe tener las siguientes columnas: vcodigoetiquetagasto, vnombre_etiquetagasto, vmonto.
vmonto = campo editable (monto por etiqueta).

vOrdinalGasto = se calcula con SQL:
`SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM mov_contable_gasto_detalle WHERE tipodocumento = vTipoDocumentoGasto AND numdocumento = vNumDocumentoGasto` (si no hay filas, usar 1).

Reglas:
- Debe existir al menos 1 etiqueta en vDetalleGasto.
- La suma de vmonto del detalle debe ser igual a vMontoGastoTotal.

Paso 3. Confirmar y Registrar Operacion.

Mostrar resumen del gasto, cuenta seleccionada y detalle de etiquetas.

Al terminar el formulario multipasos, cuando el usuario da click al boton "Registrar Gasto" el sistema debera realizar las siguientes transacciones sobre la DB:

1) Guardar cabecera en `mov_contable_gasto`:
 tipodocumento=vTipoDocumentoGasto
 numdocumento=vNumDocumentoGasto
 fecha=vFecha
 monto=vMontoGastoTotal
 codigo_cuentabancaria=vCodigo_cuentabancaria

2) Guardar detalle en `mov_contable_gasto_detalle` por cada item:
 tipodocumento=vTipoDocumentoGasto
 numdocumento=vNumDocumentoGasto
 ordinal=vOrdinalGasto
 codigoetiquetagasto=vcodigoetiquetagasto

3) Ejecutar el procedimiento `aplicar_gasto_bancario(vTipoDocumentoGasto, vNumDocumentoGasto)` para actualizar saldo bancario.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**