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
CU2004: Packing por Base

# **Prompt AI.
Modulo: 2.
Caso de uso: CU2004 - M2Packing.


Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
En SPs de lectura: primero declarar `vX = Llamada SP: ... (devuelve campo_visible)`, luego listar `Campos devueltos` y despues `Variables` con su visibilidad/edicion.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead) para soportar miles de registros.



Como desarrollador de aplicaciones web, ayudame a crear un formulario de registro multi-paso (2 pasos). Con un look and feel de una empresa de tecnologia que ofrece servicios globales de IaaS y PaaS.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Si el caso no existe en el archivo, detenerse y pedir confirmacion del modulo.
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
Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 2/CU2-004/logs/`.
El archivo debe nombrarse `CU2-004-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
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
Confirmar Operacion
Estados de loading y error
Ver Logs de sentencias SQL (no en interfaz)
Registrar Packing Nuevo por Base
Transaccionalidad total: si falla algo, rollback y no registrar nada.
Al finalizar (ultimo boton): limpiar datos y volver al paso 1 si el formulario tiene >1 paso.

# **Pasos del formulario-multipaso.

1. Configuracion de Base + Nuevo Packing.
2. Resumen y Guardar.

# **Descripcion de los pasos del formulario de registro.

Previo al formulario de captura, se debe establecer conexion con la DB, los datos de conexion se deben tomar del archivo erp.yml, la variable {dsn}, tiene los datos de conexion y se debe usar la DB especificada en la variable {name}.

Paso 1. Configuracion de Base + Nuevo Packing.

vBases = Llamada SP: `get_bases()` (devuelve campo_visible)
Campos devueltos: `codigo_base`, `nombre`
Variables:
vcodigo_base no visible editable
vnombre_base visible editable

vNuevoPacking = Captura manual en formulario (no llamada SP)
Variables:
vnombre_packing_nuevo visible editable
vtipo_packing_nuevo visible editable
vdescripcion_packing_nuevo visible editable

Comportamiento:

- No permitir avanzar si base, nombre, tipo o descripcion estan vacios.

Paso 2. Resumen y Guardar.

Mostrar resumen de solo lectura con:
- Base seleccionada (vcodigo_base + vnombre_base)
- Nuevo packing: vnombre_packing_nuevo + vtipo_packing_nuevo + vdescripcion_packing_nuevo.

Agregar checklist de una sola opcion para confirmar:
- vconfirmar_operacion (checkbox)
- El boton final "Guardar Packing" debe estar deshabilitado hasta que este marcado.
- No usar modal de confirmacion adicional.


# **Registro de Packing (backend)

Al dar click en "Guardar Packing" el sistema debera ejecutar transaccion:

1) Generar vcodigo_packing_nuevo con regla sin ambiguedad:
   - `SELECT COALESCE(MAX(codigo_packing), 0) + 1 AS next FROM packing`
2) Insertar en `packing`:
   - `codigo_packing = vcodigo_packing_nuevo`
   - `nombre = vnombre_packing_nuevo`
   - `tipo = vtipo_packing_nuevo`
   - `descripcion = vdescripcion_packing_nuevo`
   - `created_at = NOW()`
3) Insertar en `basespacking`:
   - `codigo_base = vcodigo_base`
   - `codigo_packing = vcodigo_packing_nuevo`
4) Commit.

Validaciones backend:
- codigo_base numerico.
- nombre/tipo/descripcion requeridos.
- Si falla cualquier paso => rollback total.



No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en erp.yml.

**
