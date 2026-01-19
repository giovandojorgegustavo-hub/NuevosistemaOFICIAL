**

Herramienta: Afinar Prompts para Despachar

# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a revisar y afinar un prompt de caso de uso antes de despachar. El objetivo es validar que lo solicitado en el prompt coincide con la realidad del esquema SQL y los procedimientos almacenados.

**Alcance de la revision**
- Validar tablas, columnas, tipos de datos y llaves/relaciones usados por el CU.
- Validar procedimientos almacenados mencionados (existencia, parametros y resultados esperados).
- Detectar campos solicitados que no existan o no correspondan.
- Proponer ajustes claros al prompt para alinear con el SQL.
- Incluir seccion obligatoria de procedimientos y parametros (nombre, cantidad y tipo) y las columnas esperadas por el frontend/backend.
- Exigir manejo de errores por SP: si falla o no retorna filas, ocultar bloque UI y continuar.
- Incluir requisitos de logging backend: consola + archivo por ejecucion con timestamp, endpoints, errores y SQL con parametros.

**Reglas**
- No inventar tablas ni procedimientos.
- Basarse en los archivos `SQL/tablas.sql`, `SQL/procedimientos.sql` y `SQL/inserts.sql`.
- Si falta algo en el SQL, marcarlo como pendiente y sugerir el cambio minimo necesario.
- Mantener el prompt final limpio, directo y ejecutable.

**Salida esperada**
1) Lista de inconsistencias encontradas (si aplica).
2) Cambios sugeridos al prompt (texto exacto a insertar o eliminar).
3) Confirmacion de que el CU esta alineado con SQL si no hay hallazgos.

**
