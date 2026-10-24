# Tableros de cuenta en la nube

## Preparación

Después de las migraciones de avatar y base privada, ejecutar una sola vez en
Supabase SQL Editor `supabase/migrations/202610220003_cloud_workspace.sql`.
La migración agrega referencias locales estables, las funciones RPC de carga y
guardado y el registro privado de operaciones. No importa contenido local.

Comprobación de instalación:

```sql
select to_regprocedure('public.viflow_load_workspace()'),
       to_regprocedure('public.viflow_save_workspace(jsonb,uuid)');
```

También puedes ejecutar `supabase/checks/cloud_workspace.sql`, que realiza esa
comprobación y solicita la actualización del esquema de PostgREST.
Ambas columnas deben mostrar una función, no NULL. Si existen pero PostgREST
responde PGRST202, ejecutar `NOTIFY pgrst, 'reload schema';` y reintentar en la web.
No volver a ejecutar las migraciones anteriores ni borrar tablas para reintentarlo.

## Comportamiento

Sin sesión, `LocalWorkspace` conserva el repositorio local y sus respaldos. Con una
cuenta verificada, `CloudWorkspace`, identificado por el ID de usuario, carga
exclusivamente los datos de esa cuenta. La autenticación debe terminar antes de
mostrar cualquiera de los dos espacios; un error de sesión no muestra datos de
invitado como si fueran de cuenta. Al cambiar de cuenta o cerrar sesión se desmonta
el estado privado y se invalidan respuestas tardías.

La franja superior indica carga, guardado, confirmación y errores. Se bloquean las
ediciones mientras una operación está pendiente para que un segundo formulario
no reemplace cambios en vuelo. Un guardado confirmado reemplaza la vista optimista
por los datos canónicos, incluidos autores, fechas y actividad del servidor.
Las pestañas y la selección son estado de navegación en memoria, no contenido
compartido. Recargar conserva el acceso directo al tablero por su URL.

Cada guardado envía únicamente tableros modificados, sin propietarios, identidades
de autores, fechas de comentarios ni actividad del cliente. La RPC autentica la
cuenta y verifica revisiones mientras mantiene un bloqueo por cuenta. Todas las
filas y eventos se guardan en una sola transacción; una falla revierte todo.
Los hijos reciben IDs UUID en el servidor. `client_key` conserva referencias como
las columnas iniciales todo/in-progress/done y no se usa para permisos.

Una clave de operación y un hash del contenido permiten reintentar exactamente la
misma petición aunque se haya perdido la respuesta. No se duplican tableros ni
comentarios. Usar esa clave con otro contenido se rechaza. Los accesos directos de
escritura a las tablas se revocan, incluidos permisos por columna: los clientes
escriben por las RPC transaccionales; RLS sigue limitando las lecturas.

El borrado de columnas archiva su fila remota después de mover/archivar las tarjetas,
como hace el flujo local. Las etiquetas eliminadas conservan su historia. Los
comentarios existentes son inmutables; los nuevos reciben autor y fecha del servidor.

## Errores, conflictos y límites

Un error conserva el borrador en memoria. Reintentar utiliza la misma clave de
operación. Un conflicto de revisión no sobrescribe la nube: ofrece descargar el
borrador o descartarlo y recargar. Actualizar descarga el estado actual cuando no
hay cambios pendientes. No hay suscripción Realtime ni actualización automática
de contenido editado en otra pestaña; la revisión evita que se sobrescriba al guardar.

Con cambios pendientes se advierte al cerrar/recargar la pestaña. Antes de enviar
se guarda un borrador por cuenta y operación en el dispositivo; al volver se ofrece
recuperarlo o descartarlo. Si no se puede persistir, se advierte y sigue disponible
la descarga. No hay fusión automática de conflictos. Ver [Recuperación de borradores](cloud-drafts.md).
El registro de operaciones no expira en esta entrega: requiere una política de
mantenimiento antes de uso a gran escala.

La exportación de la cuenta descarga sus tableros, incluidos archivados. La
importación de archivos JSON sigue deshabilitada en el espacio de cuenta.
La copia de tableros del dispositivo está disponible desde Respaldos; consulta
[Importar tableros locales](local-board-import.md).
El espacio invitado mantiene su importación actual. No se borra ni modifica su
clave `viflow.workspace.v1` al entrar, guardar o salir de una cuenta.

## Pruebas

`pnpm test` incluye la ejecución de ambas migraciones en PostgreSQL embebido:
creación/carga, relaciones, comentarios firmados por el servidor, actividad,
archivado de columnas, reintentos idempotentes, rechazo de revisiones obsoletas,
rollback completo ante datos inválidos y aislamiento entre cuentas.
También verifica la decodificación del contrato, que la navegación no genera
escrituras y que no se envían campos de identidad ni auditoría.

Prueba manual remota: crear un tablero de prueba, tarjeta y comentario; esperar
confirmación; recargar la URL y comprobar contenido e historia. Abrir el tablero
en otra pestaña, editarlo y comprobar que un guardado obsoleto muestra conflicto.
Finalmente archivar el tablero de prueba y cerrar sesión para comprobar que se
recupera el espacio local. No usar ni modificar tableros personales para la prueba.
