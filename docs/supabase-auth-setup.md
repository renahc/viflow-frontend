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

## Recuperación de contraseña por código

La ruta `/auth/recover` está enlazada desde **¿Olvidaste tu contraseña?** en login.
Usa `resetPasswordForEmail`, `verifyOtp` con tipo `recovery` y `updateUser`.
No utiliza enlaces con tokens ni requiere activar `detectSessionInUrl`.

### Configuración adicional obligatoria

En **Authentication → Emails → Reset password**, guardar:

- Asunto: `Recupera tu contraseña de viflow`.
- Body → Source: contenido de `supabase/templates/recovery.html`.

Guardar esta plantilla por separado: cambiar Confirm sign up no cambia los
correos de recuperación. El remitente y SMTP son los mismos ya configurados. Con
Mailtrap Sandbox el correo y su código aparecen en My Sandbox.

### Prueba con el usuario

1. Abrir Recuperar contraseña e introducir el correo de una cuenta existente.
2. Comprobar el mensaje genérico: no revela si existe una cuenta.
3. Obtener el código del correo más reciente de Mailtrap e introducirlo en viflow.
4. Tras verificar, introducir y repetir la contraseña nueva. Este paso lo realiza
   el usuario directamente; nunca compartir la contraseña ni el código por chat.
5. Comprobar Contraseña actualizada. La recuperación crea una sesión autenticada;
   se mantiene activa en este dispositivo, sin afectar tableros locales.
6. Cerrar sesión y comprobar que se puede entrar con la nueva contraseña.
7. Probar código incorrecto/vencido, reenvío tras 60 segundos y contraseñas distintas
   en la confirmación. La API decide la caducidad y aplica límites reales.

Solo se conservan correo pendiente y tiempo de reenvío en sessionStorage. Si se
recarga después de verificar, hay que verificar de nuevo; el permiso para cambiar
contraseña no se restaura desde una bandera local. Si el código ya fue consumido,
solicitar otro. El servicio también comprueba la identidad con `getUser` antes de
actualizar: un cambio de cuenta invalida la autorización de recuperación.

Las pruebas de servicio simulan el SDK y no cambian contraseñas reales. La prueba
completa queda a cargo del usuario después de configurar la plantilla.

## Nombre de la cuenta

El registro solicita un nombre para mostrar de 1 a 60 caracteres, sin exigir unicidad.
Se guarda en `user_metadata.display_name` de Supabase Auth; no requiere tablas ni migraciones.
El perfil lateral usa el nombre y la inicial de la cuenta, con el correo como texto secundario.
Las cuentas anteriores pueden usar «Completar perfil» en el menú de tres puntos para agregar su nombre.
«Configuración» permite editarlo después y refleja los errores sin cerrar el formulario.
Al cerrar sesión vuelve el perfil local, conservando su nombre y foto originales.
La foto de la cuenta se guarda en el contenedor privado descrito abajo. Los comentarios y registros de actividad nuevos usan el nombre de la cuenta verificada; sin sesión usan el perfil local. Las cuentas sin nombre aparecen como «Tu cuenta», sin exponer el correo ni atribuir acciones al perfil local. Los nombres históricos se conservan aunque cambie el perfil.
Los metadatos de usuario son datos de presentación; nunca deben utilizarse para permisos.

Validación manual: registrar con nombre, verificar correo, comprobar nombre en la barra lateral,
editarlo, recargar, cerrar sesión y comprobar que reaparece el perfil local. Para una cuenta
anterior, comprobar también «Completar perfil». El cambio real de nombre requiere una sesión conectada.

## Foto de perfil de la cuenta

Preparación única en el proyecto remoto:

1. Abrir **SQL Editor → New query** en Supabase.
2. Copiar y ejecutar `supabase/migrations/202610220001_account_avatars.sql`.
3. Comprobar en **Storage** que existe `account-avatars` y figura como privado.

El script crea el contenedor, limita los archivos a PNG/JPEG/WebP y 1 MB y crea
permisos SELECT/INSERT/DELETE para la carpeta cuyo nombre coincide con `auth.uid()`.
No concede UPDATE ni acceso anónimo. El script puede ejecutarse de nuevo.
No se ha aplicado automáticamente: se necesita acceso administrativo al proyecto.

La aplicación permite elegir una foto y verla antes de guardar. Seleccionar una imagen
o cancelar la ventana no sube archivos. Al guardar se usa una ruta nueva dentro de la
carpeta del usuario, se actualiza `user_metadata.avatar_path` y después se elimina la
foto anterior. Quitar foto limpia primero los metadatos y después borra el archivo.
Si falla la actualización del perfil se intenta limpiar solo la nueva subida; si falla
la limpieza posterior se informa al usuario sin presentar el guardado como fallido.
Las imágenes se descargan con la sesión autenticada; el navegador utiliza una URL de
objeto temporal que se libera al cambiar de foto o sesión. Nunca se guarda una URL
pública, una URL firmada ni una imagen base64 en los metadatos de la cuenta.

Prueba real después de ejecutar el SQL: iniciar sesión, abrir Configuración, subir una
imagen, guardar, recargar y comprobar que persiste. Repetir en otro navegador con la
misma cuenta; reemplazarla y quitarla. Cerrar sesión y comprobar que reaparece el perfil
local intacto. Con dos cuentas, verificar que la segunda no puede leer, subir ni borrar
archivos dentro de la carpeta de la primera; tampoco debe poder hacerlo sin sesión.
Las pruebas automáticas de servicio cubren validación, rutas, orden de operaciones,
errores y cambios de sesión, pero no reemplazan esta comprobación de RLS en Supabase.

## Pantalla de configuración de cuenta

`/settings` reúne perfil, seguridad y sesión. El menú del perfil de cuenta abre esta
pantalla; el perfil local conserva su editor. El editor de nombre y foto se reutiliza
para que la validación y el almacenamiento sigan el mismo flujo.

La sección Seguridad valida la contraseña actual con `signInWithPassword`, comprueba
la identidad y envía la nueva mediante `updateUser` con `current_password`. No depende
de que la exigencia opcional de contraseña actual esté habilitada en el proyecto.
Las contraseñas solo permanecen en memoria durante el envío; los campos se vacían al
solicitar la operación y nunca se guardan en el almacenamiento ni en registros.
Los errores de reautenticación remiten a la recuperación por correo ya implementada.
La sesión permite cerrar únicamente la sesión de este navegador.

Verificado: compilación, lint, pruebas de servicio y revisión visual en escritorio y
390 px; acceso con cuenta real y guardado del perfil sin modificar su nombre.
El cambio de contraseña real queda para una prueba realizada por el usuario.
