# Modelo de datos y acceso para viflow

Estado: diseño para la siguiente etapa. Este cambio no crea un backend, cuentas,
correos ni permisos remotos. El modo actual sigue siendo local y sin registro.

## Límites actuales

- `lib/board.ts`, `lib/workspace.ts` y las operaciones de `lib/` describen datos y
  transformaciones, sin acceder al almacenamiento.
- `storage/workspaceRepository.ts` define lectura/escritura de una instantánea local.
- `storage/localWorkspaceRepository.ts` implementa localStorage y lee formatos
  anteriores sin borrarlos. Mantiene la clave `viflow.workspace.v1`.
- `hooks/useWorkspaceStorage.ts` conserva el estado y comunica fallos de persistencia.
  Las ediciones normales continúan en memoria ante un error. Una importación solo
  cambia el estado después de guardarse correctamente.
- `useBoard.ts` coordina operaciones del tablero y navegación; ya no conoce
  localStorage, JSON ni las claves del almacenamiento.

El contrato local es síncrono. No se debe implementar un backend HTTP como si lo
fuera: la siguiente etapa agregará un servicio asíncrono para carga, sesión,
peticiones pendientes y errores. La sincronización entre dispositivos requiere
además revisiones/conflictos; no está implementada ni se presupone aquí.

## Entidades propuestas para la nube

| Entidad | Campos y relaciones principales |
| --- | --- |
| Usuario | ID del proveedor de identidad, correo verificado, fecha de creación |
| Perfil | `user_id`, nombre visible, referencia opcional a avatar |
| Tablero | `id`, `owner_id`, título, `archived_at`, revisión, fechas de creación/actualización |
| Columna | `id`, `board_id`, título, descripción, color de la paleta, orden, modo manual/prioridad |
| Tarjeta | `id`, `board_id`, `column_id`, título, descripción, prioridad, vencimiento, orden manual, `archived_at`, revisión |
| Etiqueta | `id`, `board_id`, nombre, color de la paleta |
| Etiqueta de tarjeta | `board_id`, `card_id`, `label_id`; combinación única |
| Comentario | `id`, `card_id`, autor autenticado o procedencia local, nombre histórico, texto, creación |
| Actividad | `id`, `card_id`, tipo, actor autenticado o procedencia local, nombre histórico, mensaje, creación |
| Preferencias de navegación | usuario/dispositivo, tableros abiertos y selección; separadas del contenido |
| Importación | usuario, clave de operación, estado y mapa de IDs; permite reintentos sin duplicar datos |

En el almacenamiento local, los arrays representan el orden manual. En la nube se
necesitan posiciones explícitas para columnas y tarjetas. La ordenación visual
por prioridad no modifica esas posiciones. El vencimiento es una fecha de
calendario (`YYYY-MM-DD`), no un instante UTC. Archivado y actividad usan instantes.

Los IDs locales actuales pueden ser valores como `todo` y `default`, y pueden
repetirse entre tableros. La importación al backend debe asignar IDs propios y
remapear todas las relaciones en una transacción; no asumir UUID globales.

## Integridad y permisos

Primera versión de cuentas: tableros privados de un único propietario. No hay
invitaciones, roles de equipo ni acceso público implícito.

| Acción | Comprobación obligatoria del backend |
| --- | --- |
| Listar/leer/crear tablero | Sesión válida; propietario tomado de la sesión, nunca del JSON del cliente |
| Editar/archivar/restaurar tablero | `board.owner_id` coincide con el usuario autenticado |
| Operar columnas, tarjetas o etiquetas | Resolver el tablero y comprobar su propietario |
| Mover tarjeta/asignar etiqueta | Tarjeta, columna y etiqueta pertenecen al mismo tablero autorizado |
| Comentar/registrar actividad | Permiso del tablero; actor y fecha generados por el servidor |
| Importar/exportar | Solo datos autorizados; validar estructura y relaciones; importar de forma atómica |

Aplicar las comprobaciones en cada endpoint y en las políticas de la base de datos
si el proveedor permite acceso directo. Ocultar botones o comprobar IDs en React
no concede permisos. No enviar claves privilegiadas al frontend.

El cliente no podrá modificar directamente el correo verificado, el propietario,
el actor autenticado de un comentario ni eventos del servidor. Los nombres y
fechas de comentarios importados son historia local no verificada; se conservan
como tal, sin atribuirlos automáticamente a una identidad autenticada.

Las claves foráneas y restricciones deben impedir referencias entre tableros,
etiquetas duplicadas en una tarjeta y posiciones/operaciones inconsistentes.
Archivar no destruye los hijos del tablero. Restaurar comprueba los mismos
permisos que editar. Al borrar una columna se conservan sus tarjetas archivadas
en un destino válido, como en el modo local.

## Modo híbrido y migración

1. Sin sesión: espacio local independiente, con respaldos descargables.
2. Al iniciar sesión: cargar el espacio remoto y ofrecer **Agregar mis tableros
   de este dispositivo a mi cuenta**, con resumen previo.
3. Importar copias autorizadas en una transacción, con IDs nuevos y clave de
   operación para reintentos. No sobrescribir tableros remotos ni borrar los
   locales antes de confirmar el guardado remoto.
4. Al cerrar sesión: retirar los datos de la cuenta de la memoria y cualquier
   caché privada. Volver al espacio de invitado; no copiar contenido de la cuenta
   al espacio de invitado automáticamente.
5. Separar cachés por usuario. Cambiar de cuenta no debe mostrar los datos de la
   anterior. El perfil local actual no es una identidad autenticada.

La primera versión remota puede guardar al confirmar operaciones y mostrar
cargando/error/reintento. El trabajo sin conexión sobre datos de cuenta y la
resolución de cambios simultáneos se diseñarán por separado; no usar la última
instantánea completa para pisar cambios remotos sin comprobar su revisión.

## Registro por correo: requisitos para diseñar después

La siguiente etapa se tomará por separado. Antes de implementarla hay que decidir
si se usará correo + contraseña verificada o acceso sin contraseña mediante
códigos. No elegir un proveedor ni construir pantallas de login en este cambio.

El flujo deberá contemplar solicitud del código, ingreso, reenvío, vencimiento,
límite de intentos, errores y recuperación. Los códigos deben ser de un solo uso,
con caducidad y límites de solicitudes/intentos aplicados en el servidor. No
almacenar ni comprobar códigos en localStorage ni mostrarlos en logs. Los secretos
de envío de correo quedan en el servidor. Una cuenta no verificada no recibe
acceso a tableros privados. Definir también sesiones, cierre de sesión y la
separación entre cambiar el nombre visible y cambiar/verificar el correo.

## Respaldos implementados

Formato `viflow`, versión `1`, fecha de exportación y espacio completo. Incluye
archivados, comentarios, actividad, paleta, orden y vencimientos. Excluye perfil,
avatar y cualquier futura sesión/credencial. Se seleccionan campos conocidos;
campos extra no se consideran identidad ni autorización.

El importador admite hasta 10 MB, valida el archivo completo y sus referencias,
y muestra un resumen antes de incorporar copias. No reemplaza datos existentes.
Los IDs de tablero son nuevos; los IDs internos conservan su alcance dentro de
cada copia. Reimportar el archivo crea más copias: el usuario lo ve antes de
confirmar. Un fallo de cuota deja intactos el estado anterior y su copia guardada.
Los respaldos no son cifrados; el archivo contiene el contenido de los tableros.
