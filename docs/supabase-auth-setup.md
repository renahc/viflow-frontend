# Registro por correo: configuración y prueba

## Configuración del proyecto

1. Copiar `.env.example` a `.env.local` y completar URL y clave publishable.
2. En Supabase Authentication, habilitar correo/contraseña y confirmar correo.
3. En Emails, configurar SMTP personalizado. El entorno de desarrollo usa Mailtrap
   Sandbox: host `sandbox.smtp.mailtrap.io`, puerto 587 y credenciales del buzón.
   Esas credenciales van solo en Supabase, nunca en variables `VITE_` ni en Git.
4. Editar Confirm sign up. Asunto: `Tu código de verificación de viflow`.
   Cuerpo: el archivo `supabase/templates/confirmation.html`.
5. Guardar y reiniciar Vite si cambió `.env.local`.

La plantilla del repositorio no se despliega automáticamente. Debe coincidir con
la guardada en el panel. Con Mailtrap Sandbox los correos se capturan en ese buzón:
no se entregan al Gmail u otro buzón real del destinatario. Para producción hará
falta reemplazar el sandbox por envío real y verificar el remitente.

## Prueba manual con el propietario del proyecto

1. Abrir `/auth/register`, introducir un correo real válido no registrado y una
   contraseña elegida por el usuario. No compartir contraseña ni códigos por chat.
2. Pulsar Crear cuenta una sola vez. Verificar que los campos queden bloqueados
   durante la petición y se muestre Verifica tu correo al completarse.
3. Abrir My Sandbox en Mailtrap y localizar el mensaje más reciente. Comprobar
   destinatario y código, sin usar el enlace de una plantilla antigua.
4. Probar un código incorrecto: no debe dar acceso. El servicio puede usar el
   mismo error para código incorrecto y vencido; la UI no inventa la distinción.
5. Introducir el código del correo. Confirmar Tu cuenta está lista y el estado de
   correo verificado en Supabase Users.
6. Volver al tablero y recargar: debe aparecer Tu cuenta y seguir el contenido
   local sin subirse al backend. Cerrar sesión debe conservar ese contenido.
7. En otro registro pendiente, recargar antes de verificar y comprobar que se
   retoma el correo sin guardar contraseña/código. Tras la espera, solicitar un
   reenvío y utilizar el correo más reciente.
8. Probar fallos de red, límites de envío y contraseña débil. No repetir envíos en
   bucle; los límites y caducidad se configuran en Supabase.

## Alcance de esta entrega

Se implementan registro, confirmación OTP, reenvío, restauración de sesión del SDK
y cierre de sesión local. Los tableros siguen usando el repositorio local. No
hay endpoints ni tablas privados de usuario, ni migración de tableros a la nube.
La UI de sesión no es una política de autorización: cuando se conecten datos
remotos, se exigirán permisos del servidor y RLS según el modelo documentado.

Las pruebas automatizadas usan un adaptador simulado del SDK; no crean cuentas,
no envían correos ni validan la configuración SMTP real. La prueba de entrega de
correo y verificación debe completarse con el usuario y Mailtrap.
