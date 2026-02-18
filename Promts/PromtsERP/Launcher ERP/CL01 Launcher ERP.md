CL01: Launcher ERP

## Caso de Uso: Narrativa
Como desarrollador de aplicaciones web, ayúdame a crear un aplicativo web que actúe como Launcher de web apps y páginas web, con look and feel de una empresa tecnológica que ofrece sistemas ERP en modalidad SaaS a nivel global.

## Configuración obligatoria
- Usar exclusivamente el `erp.yml` de la raíz del proyecto.
- Tomar la conexión desde `connections[0]`, usando:
- `{dsn}` para conectar a MySQL.
- `{name}` como base de datos objetivo.
- El backend del Launcher debe iniciar con `bk_launcher`; si no existe, usar `main_port`; último fallback `2026`.
- No duplicar `erp.yml` dentro de `wizard/CL01/`.
- Cada módulo usa un único puerto definido en `erp.yml`:
- `bk_modulo1_port`
- `bk_modulo2_port`
- `bk_modulo3_port`
- `bk_modulo4_port`

## Stack técnico
HTML5, JavaScript ES6+, Bootstrap 5.3, Node.js (Express), MySQL.

## Estructura del código
- Web form para captura y validación de credenciales de usuario y login.
- Landing page con módulos y apps disponibles.
- Componentes Bootstrap (alerts, badges, cards, etc.).
- Responsive design para desktop y móviles.
- Backend con endpoints JS en Node.js y persistencia en MySQL:
- `POST /api/login`
- `GET /api/menu`
- `POST /api/otp`
- `POST /api/logout`

## User Experience (UX)
- Incluir manejo de errores y mejores prácticas de UX.
- Mostrar mensajes claros de login fallido según causa.
- La GUI debe mostrarse en el idioma predeterminado del navegador del usuario.

## Flujo funcional requerido
1. Capturar `vUsuario` y `vPassword` y permitir login con botón "Login".
2. Validar credenciales llamando al SP `validar_credenciales_usuario(vUsuario, vPassword)`.
3. Interpretar resultado del SP:
- `0`: login exitoso.
- `1`: usuario erróneo.
- `2`: password errónea.
4. Si las credenciales son válidas:
- Cargar menú con módulos y sus casos de uso usando `get_usecases_usuario(vUsuario)`.
- Registrar sesión de usuario en tabla `sesiones`.
5. Si las credenciales no son válidas:
- Loguear intento fallido de login.
- Mostrar mensaje de error en pantalla.
6. Debe existir opción o botón `Logout` para cerrar formalmente la sesión:
- Registrar traza de cierre (hora de logout) en la sesión.
- Cerrar sesión activa del usuario/IP actual.

## Contrato oficial de lanzamiento de use cases
- Cada vez que el usuario invoca un caso de uso o web app:
- Generar OTP con `generar_otp_usuario(vUsuario)`.
- Abrir la URL de destino enviando exactamente:
- `vUsuario=<id_usuario_logueado>`
- `vOTP=<otp_generado>`
- No usar aliases (`u`, `otp`, `codigo_usuario`, etc.).
- La URL base del caso de uso debe construirse con el puerto del módulo correspondiente (no puertos por CU).

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y TODO el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecución dentro de `wizard/CL01/logs/`.
- Formato de nombre: `CL01-YYYYMMDD-HHMMSS-001.log`.
- Incrementar sufijo si ya existe (`002`, `003`, etc.).
- Incluir como mínimo:
- Inicio del servidor.
- Endpoints invocados.
- Trazas de navegación.
- Intentos fallidos de login.
- Sesiones iniciadas y cerradas.
- Mensajes de error.
- Sentencias SQL con parámetros.

## Unicidad del resultado
- El resultado debe quedar únicamente en `wizard/CL01/`.
- Debe existir un solo launcher activo para este prompt.
- Si existe carpeta duplicada (por ejemplo `wizard/Laucher/`), eliminarla.
- Para backends de módulos, mantener un único `server.js` por módulo en:
- `wizard/Modulo 1/server.js`
- `wizard/Modulo 2/server.js`
- `wizard/Modulo 3/server.js`
- `wizard/Modulo 4/server.js`

## Funcionalidades requeridas
- Login con captura y validación de credenciales.
- Logout con cierre formal de sesión.
- Logueo de trazas de navegación.
- Logueo de intentos fallidos de login.
- Logueo de errores.
- Logueo de sesiones.
- Launch de web apps y páginas web asociadas a use cases del usuario logueado.
- Menú de módulos disponibles y casos de uso del usuario logueado.
- Iconos de módulos en landing page y posibilidad de adicionar accesos directos.

## Restricciones
- No utilizar datos mock.
- Solo utilizar datos reales de la base definida en `erp.yml`.
