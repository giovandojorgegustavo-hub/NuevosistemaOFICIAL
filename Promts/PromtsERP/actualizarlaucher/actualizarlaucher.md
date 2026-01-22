actualizarlaucher: Actualizar rutas del Launcher

# **Prompt AI**

Actua como asistente tecnico para mantener el Launcher ERP. Necesito que generes los SQL y pasos exactos para actualizar los links de los casos de uso, el modulo correcto, y las asignaciones por perfil y usuario. No modifiques codigo del frontend ni backend; solo entregar SQL . El resultado debe separarse en archivos SQL para que yo lo pegue manualmente.

Revisas los links de los wizard para saber como crear los links para conectarlos modulos
revisa insertlogin.sql para que te des una idea de la estructura pero cambialo a los datos que te pedimos

todos estos casos de uso metelos en el modulo Pedido por ahora solo hay un modulo y lo va a tener el perfil Administrador y este lo va a tener el usuario 1 que su contraseña es 1111 y su codigo 1 

Requisitos de salida:
1) registras los datosrequeridos aqui:
   - `insertloginnuevo.sql`: contiene el SQL actualizado del login aislado.
2) SQL para `insert_usecases.sql`:
   - Insertar/actualizar modulo en `modulos`.
   - Insertar/actualizar `usecases` con `codigo_usecase` y `linktolaunch`.
   - Vincular `modulo_usecases` con los usecases del modulo.
3) SQL para `insert_perfiles.sql`:
   - Asignar `perfiles_ucases` al perfil.
   - Asignar `usuarios_perfiles` a los usuarios.


Notas:
- Asume MySQL y que las tablas son: `usecases`, `modulos`, `modulo_usecases`, `perfiles_ucases`, `usuarios_perfiles`.
- No uses datos mock.
- Mantener respuestas en espanol.
