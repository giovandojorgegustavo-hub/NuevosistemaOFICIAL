CL01: Launcher ERP

# **Prompt AI.

Como desarrollador de aplicaciones web, ayúdame a crear un aplicativo web que actúe como Launcher de web apps y páginas web, con look and feel de una empresa tecnológica que ofrece sistemas ERP en modalidad SaaS a nivel global.

El código generado debe guardarse en una sola carpeta por caso de uso: `wizard/CL01`, sobrescribiendo su propio wizard para evitar duplicados. El Launcher debe tener su propia carpeta y un `index.html` como entrada principal. El backend debe iniciar en el puerto `3000`. Priorizar código limpio y eficiente: mientras menos código, mejor, sin sacrificar claridad.

El aplicativo deberá pedir Usuario y Password para poder acceder a las apps disponibles. Una vez cargados estos datos en las variables `vUsuario` y `vPassword`, el usuario podrá acceder al Launcher a través del botón "Login".

Al dar click en "Login" el app debe validar las credenciales del usuario con el SP `validar_credenciales_usuario(vUsuario, vPassword)` de la DB. Devuelve 0 si es exitoso, 1 si usuario erróneo y 2 si password errónea.

Los datos de conexión se deben tomar del archivo `erp.yml`; la variable `{dsn}` tiene los datos de conexión y se debe usar la DB especificada en la variable `{name}`.

Si las credenciales son válidas:
- Desplegar en el Launcher los módulos y casos de uso asociados al usuario que devuelve el SP `get_usecases_usuario(vUsuario)`.
- Loguear sesión de usuario en la tabla `sesiones` de la DB.

Si no son válidas:
- Loguear intento fallido de login.
- Mostrar mensaje de error en pantalla.

El app debe tener un botón de "Logout" para que el usuario pueda cerrar formalmente su sesión de trabajo.

Se requiere que la interfaz gráfica de usuario (GUI) se muestre en el idioma predeterminado del navegador del usuario.

**Stack técnico:** HTML5, JavaScript ES6+, Bootstrap 5.3, MySQL, Node.js

**Estructura del código:**
- Web form para captura de credenciales de usuario y login.
- Landing page con módulos y apps disponibles.
- Componentes Bootstrap (alerts, badges, cards, etc.).
- Responsive design para móviles.
- Backend con endpoints JS corriendo sobre Node.js y persistencia en MySQL.

**User Experience (UX)**
Incluir manejo de errores y mejores prácticas de UX.

## Logging obligatorio (backend Node.js)
- Imprimir en consola TODOS los errores y el SQL ejecutado (incluyendo stored procedures) con timestamp.
- Guardar los mismos logs en archivo por ejecución dentro de `wizard/CL01/logs/`.
- El archivo debe nombrarse `CL01-YYYYMMDD-HHMMSS-001.log` (incrementar el sufijo si ya existe).
- Los logs deben incluir: inicio del servidor, endpoints invocados, errores y sentencias SQL con parámetros.

## Consistencia visual (primer wizard)
Si existe `wizard/_design-system/`, leerlo solo como referencia y copiar sus tokens a `styles.css` del wizard actual (no depender en runtime).
Si no existe `wizard/_design-system/`, crear la carpeta, inventar un baseline visual y guardar:
- `design.json` con paleta, tipografías, tamaños, radios, sombras, grid y tokens de componentes.
- `tokens.css` con variables CSS equivalentes.

Los wizards posteriores deben reutilizar esos tokens para mantener colores, tamaños y estilos consistentes.
Si `wizard/_design-system/` no existe, generar un nuevo baseline visual y luego copiarlo al wizard actual.

# **Funcionalidades requeridas:**
- Login. Captura y validación de credenciales de usuario.
- Logout. Cierra la sesión del usuario y sale de la aplicación.
- Logueo de trazas de navegación.
- Logueo de intentos fallidos de login.
- Logueo de mensajes de error.
- Logueo de sesiones.
- Launch de web apps y páginas web asociadas a los use cases del usuario logueado.
- Menú de módulos disponibles y casos de uso para el usuario logueado.
- Iconos de módulos en landing page y posibilidad de adicionar accesos directos.

No utilizar datos mock.
Solo utilizar datos reales de la base de datos especificada en `erp.yml`.
