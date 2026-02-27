## Precondicion de Acceso (Obligatoria)
La pagina debe recibir dos parametros obligatorios y un tercer parametro opcional. Los parametros son:

- `Codigo_usuario` varchar(36)
- `OTP` varchar(6)
- `vParametros` JSON (opcional)

Al iniciar la pagina se debe llamar el SP `validar_otp_usuario` pasandole como parametros `Codigo_usuario` y `OTP` para verificar si es un usuario valido.

El SP `validar_otp_usuario` devuelve:
- `1`: SI usuario y OTP son validos.
- `-1`: OTP expirado.
- `0`: NO EXISTE TOKEN.

Si `validar_otp_usuario` devuelve un valor diferente de `1`:
- Mostrar mensaje exacto: `Warning ACCESO NO AUTORIZADO !!!`
- Cerrar la pagina y salir del programa.

**
CU3004: Borrar FCC

# **Prompt AI.
Modulo: 3.
Caso de uso: CU3004 - M3BorrarFCC.

Reglas:
Toda variable/campo empieza con `v` y se lista sin `-`.
Cada variable debe indicar si es visible / no visible y si es editable / no editable.
Todo campo tipo Select debe permitir escribir y filtrar la lista conforme se escribe (typeahead).

Como desarrollador de aplicaciones web, ayudame a crear un formulario de un solo paso para borrar facturas de compra FCC no aplicadas.

El codigo generado debe guardarse en una sola carpeta por caso de uso, dentro de su modulo correspondiente, sobrescribiendo su propio wizard para evitar duplicados.
Regla de ruta obligatoria:
Usar `wizard/Modulo 3/CU3-004` como ruta del caso de uso.
**Stack tecnico:** HTML5, JavaScript ES6+, Bootstrap 5.3, Node.js, MySQL.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecucion dentro de `wizard/Modulo 3/CU3-004/logs/`.
- El archivo debe nombrarse `CU3-004-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).

# **Funcionalidades requeridas:

- Buscar FCC por numero/proveedor.
- Mostrar FCC con saldo pendiente.
- Confirmar borrado (con motivo opcional).
- Bloquear borrado si la FCC tiene referencias.
- Ver logs de sentencias SQL (no en interfaz).
- Operacion transaccional: `COMMIT` en exito, `ROLLBACK` en error.

# **Descripcion funcional.

Previo al formulario de captura, se debe establecer conexion con la DB usando `erp.yml`.

vFCCPendientes = consulta SQL de compras `FCC` con `saldo > 0` (sin depender de campo `estado`).

Regla de arquitectura (obligatoria):
- La logica de negocio de anulacion/borrado debe vivir en el procedimiento `anular_fcc_proveedor`.
- El backend Node.js (`/api/borrar-fcc`) NO debe duplicar esa logica; solo orquesta transaccion y respuesta HTTP.

## Flujo paso a paso (obligatorio)

1. Traer listado de FCC pendientes.
   - Consultar `mov_contable_prov` (`FCC`) con `saldo > 0`.
   - Permitir filtro por numero/proveedor.

2. Seleccionar FCC y confirmar borrado.
   - Capturar `vNum_documento_compra` y `vCodigo_provedor`.
   - Mostrar confirmacion final (motivo opcional).

3. Invocar backend de borrado.
   - Endpoint: `POST /api/borrar-fcc`.
   - Validar datos minimos de entrada.

4. Iniciar transaccion en backend e invocar SP.
   - Ejecutar `CALL anular_fcc_proveedor(vNum_documento_compra, vCodigo_provedor)`.

5. Dentro del SP `anular_fcc_proveedor`, ejecutar la logica en este orden:
   - Verificar que la FCC existe.
   - Si hay aplicaciones en `Facturas_Pagadas_Prov` (ej. `RCC`/`NCC`):
     - devolver saldo al documento de pago,
     - eliminar filas relacionadas en `Facturas_Pagadas_Prov`.
   - Si existen remitos `REM` relacionados a la FCC origen:
     - borrar referencias en `detalle_movs_partidas_prov`,
     - borrar detalle/cabecera del remito en `detalle_mov_contable_prov` y `mov_contable_prov`.
   - Validar que la FCC no quede referenciada en:
     - `detalle_movs_partidas_prov`,
     - `movimiento_stock`,
     - `mov_contable_gasto`.
   - Borrar la FCC:
     - `detalle_mov_contable_prov`,
     - `mov_contable_prov`.
   - Actualizar saldo del proveedor:
     - `CALL actualizarsaldosprovedores(vCodigo_provedor, 'FCC', -vMontoFCC)`.

6. Confirmar o revertir transaccion.
   - Si todo sale bien: `COMMIT`.
   - Si algo falla: `ROLLBACK` y devolver `ERROR_BORRAR_FCC`.

7. Responder al frontend.
   - Exito: mensaje de FCC eliminada.
   - Error: mapear codigo de error a mensaje UX.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en `erp.yml`.

**
