# Modelo de datos y acceso para viflow

## Estado de esta entrega

Implementados el esquema PostgreSQL, los permisos de acceso y las pruebas de base
de datos en `supabase/migrations/202610220002_private_boards.sql` y
`tests/cloudDatabase.test.ts`. La autenticación y los perfiles ya usan Supabase.

Actualización: la siguiente migración `202610220003_cloud_workspace.sql` conecta
la interfaz de cuenta con este esquema. Ver [guardado en la nube](cloud-workspace.md).
El modo invitado sigue en localStorage; no se importan sus datos automáticamente.
Las concesiones de escritura directa descritas abajo corresponden al esquema base;
la migración de nube las sustituye por RPC transaccionales.

## Aplicar en Supabase

1. Abrir **SQL Editor → New query** en el proyecto correcto.
2. Copiar el contenido completo de `supabase/migrations/202610220002_private_boards.sql`.
3. Ejecutarlo una sola vez con **Run**. La transacción revierte todo si ocurre un error.
4. Ejecutar `supabase/checks/private_boards.sql`: deben aparecer siete tablas con
   RLS activo, sin acceso anónimo ni escritura de actividad por `authenticated`.

La migración está pensada para una instalación nueva de estas tablas. Si ya existe
alguna con el mismo nombre, detenerse y revisar el esquema; no borrar tablas para
forzar su ejecución. Los reintentos después de una ejecución exitosa no son necesarios.
No cambiar los esquemas expuestos de la Data API: `viflow_private` debe permanecer
sin exponer. Tampoco se necesita una clave privilegiada en Vite.

## Tablas implementadas

| Tabla | Contenido y relaciones |
| --- | --- |
| `boards` | Propietario, título, posición, archivado, revisión y fechas |
| `board_columns` | Tablero, título, descripción, color, orden, modo manual/prioridad y archivado |
| `cards` | Tablero y columna, contenido, prioridad, vencimiento, posición, archivado, revisión y fechas |
| `board_labels` | Nombre único por tablero, sin distinguir mayúsculas ni espacios exteriores, y color fijo |
| `card_labels` | Asociación única entre tarjeta y etiqueta del mismo tablero |
| `card_comments` | Autor autenticado y nombre histórico, contenido, procedencia y fecha del servidor |
| `card_activity` | Actor autenticado y nombre histórico, tipo de cambio, detalles y fecha del servidor |

Los IDs remotos son UUID generados por PostgreSQL. Las relaciones compuestas
`(board_id, id)` impiden asociar una tarjeta a una columna o etiqueta de otro tablero,
aunque ambos tableros sean de la misma cuenta. Una asociación de etiqueta no se duplica.
Las claves foráneas y restricciones no dependen de comprobaciones de React.

La paleta coincide con `lib/labels.ts`: purple, rose, blue, teal, amber y slate.
Las prioridades son none, low, medium, high y urgent. El vencimiento es `date`, sin
conversión UTC. Las posiciones son enteros no negativos; los empates se resuelven
por ID. La ordenación visual por prioridad no debe modificar el orden manual.

Los tamaños del esquema son: títulos de tablero/tarjeta hasta 160 caracteres,
columna hasta 100, descripciones hasta 1000, etiquetas hasta 32 y comentarios hasta
2000. El importador futuro deberá mostrar errores si datos locales antiguos
superan estos límites; no truncarlos silenciosamente.

## Permisos

Las siete tablas tienen RLS y permisos explícitos. Se revocan primero los permisos
predeterminados de Supabase para evitar que una concesión amplia eluda los límites
por columna. `anon` no tiene acceso. Una sesión sin correo confirmado tampoco.
La confirmación se consulta en `auth.users`, nunca en metadatos editables del usuario.

Las políticas de hijos resuelven el propietario del tablero. Solo la cuenta dueña
puede leerlo y realizar las operaciones concedidas. No hay acceso compartido ni público.
Las funciones auxiliares de seguridad usan `search_path` vacío y nombres completos;
solo las comprobaciones de acceso pueden ejecutarse por el rol autenticado.

| Operación | Contrato |
| --- | --- |
| Crear tablero | `owner_id` procede de `auth.uid()`; el cliente no puede suministrarlo |
| Editar contenido | Solo columnas autorizadas y filas del propietario |
| Cambiar propietario, ID, fechas o revisión | Prohibido al cliente |
| Crear comentario | Solo board_id, card_id y body; autor, nombre, procedencia y fecha los fija el servidor |
| Registrar actividad | Solo triggers del servidor; no se admite INSERT/UPDATE/DELETE desde el cliente |
| Editar/borrar comentarios anteriores | No concedido en esta versión |
| Archivar/restaurar tablero, columna o tarjeta | Cambiar archived_at; no destruye descendientes |
| Eliminar definitivamente tablero, columna o tarjeta | No concedido; el flujo público utiliza archivado |
| Borrar etiqueta/asignación | Permitido en el propio tablero; se conserva su nombre en la actividad |

Los triggers de tarjetas registran creación, cambios de columna/posición, título,
descripción, prioridad, fecha y archivado/restauración. Un guardado que cambia
varios campos produce un evento con todos esos cambios en `details`; el adaptador
futuro traducirá los campos a los mensajes de la interfaz. Una actualización sin
cambios de contenido no crea actividad. Las etiquetas generan eventos al asignarse,
quitarse y borrarse; el borrado por cascada no duplica el evento.

`source = local_import` queda reservado a la futura importación privilegiada y
transaccional: el cliente no puede escribirlo, ni atribuir historia local a un
usuario autenticado. Esa importación aún no existe. Los nombres históricos se
conservan aunque el perfil cambie y no se usan para autorizar acciones.

## Revisiones y futura conexión

Tableros y tarjetas incrementan sus revisiones en PostgreSQL; toda escritura de
un hijo incrementa también la revisión del tablero. Una operación puede incrementarla
más de una vez por los eventos asociados: es un token monotónico, no un contador
de acciones de usuario. Las fechas de actualización también son del servidor.

La siguiente entrega debe utilizar revisiones esperadas, comprobar filas devueltas
y tratar cero filas como conflicto o pérdida de acceso. Para guardar varias filas
como una sola edición se necesitan RPC transaccionales que bloqueen/comprueben la
revisión del tablero. **Las revisiones por sí solas no activan sincronización ni
resuelven conflictos.** No hacer reemplazos completos sin comprobar revisiones.

El repositorio local conserva su contrato síncrono. La capa remota será asíncrona,
con estados de carga, guardado, fallo y reintento. Las preferencias de pestañas y
selección permanecen separadas del contenido remoto.

La importación futura asignará IDs nuevos y remapeará las relaciones en una sola
transacción, con clave de operación para reintentos. No se deben importar IDs
locales como `default` o `todo` como si fueran UUID globales. Al iniciar sesión no
se borrarán ni subirán tableros locales automáticamente; el usuario elegirá copias.
Al cerrar sesión se retirará de memoria el contenido de la cuenta, sin copiarlo al
espacio de invitado. Las cachés se separarán por usuario.

## Pruebas

`pnpm test` ejecuta la migración completa en PostgreSQL embebido con PGlite y una
superficie mínima simulada de Supabase Auth. Usa usuarios sintéticos y ninguna
credencial real. Comprueba permisos SQL y RLS, no solo búsquedas de texto:

- Propietario, cuenta ajena, invitado y cuenta no verificada con metadatos falsos.
- Lectura y aislamiento de todas las tablas hijas tras cambiar de cuenta.
- Edición, archivado/restauración, IDs/fechas/revisiones del servidor.
- Autor y actividad no falsificables; historia inmutable.
- Referencias entre tableros, duplicados, paleta, prioridades y fechas inválidas.
- Revisiones obsoletas y conservación de hijos al archivar.
- Historia de etiquetas conservada sin duplicación de eventos al borrarlas.

Esto valida PostgreSQL y la migración; no comprueba todavía la configuración remota
de Supabase/PostgREST ni un guardado desde la interfaz. La prueba remota de Data API
con dos cuentas se realizará al conectar el repositorio asíncrono.

## Respaldos locales

Formato `viflow`, versión 1, límite de 10 MB. Incluye archivados, comentarios,
actividad, paleta, orden y vencimientos. Excluye perfil, avatar y sesión.
El importador local valida el archivo completo, incorpora copias con IDs de tablero
nuevos y no reemplaza datos existentes. Un fallo de cuota conserva la copia guardada.
Los respaldos contienen el contenido de los tableros y no están cifrados.
