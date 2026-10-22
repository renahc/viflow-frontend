# viflow frontend

Tablero Kanban construido con React, TypeScript, Vite y TailwindCSS.

## Desarrollo

```sh
pnpm install
pnpm dev
```

## Verificación

```sh
pnpm build
pnpm lint
pnpm test
```

## Primera versión

- Creación de tableros independientes desde el menú lateral, con selección persistida y lista vertical.
- Pestañas superiores para los tableros abiertos, sin duplicados y con scroll horizontal. Cerrar una pestaña no elimina el tablero. Las pestañas abiertas y la selección se conservan al recargar.
- Menú de tres puntos por tablero para renombrar o eliminar con confirmación. Al eliminar un tablero se eliminan sus columnas y tarjetas; se puede dejar el espacio de trabajo vacío.
- Tres columnas iniciales: Por hacer, En progreso y Hecho.
- Creación de columnas personalizadas al extremo derecho del tablero, con elección del color del punto entre los mismos seis tonos fijos de las etiquetas. El color se conserva al recargar; las columnas anteriores mantienen su aspecto.
- Eliminación de tarjetas y columnas con confirmación. Eliminar una columna elimina también sus tarjetas; se puede dejar el tablero vacío.
- Creación de tarjetas con título y descripción opcional.
- Detalle de tarjeta al pulsar su título o contenido: edición de título y descripción, columna actual y etiquetas visibles. Guardar aplica los cambios; Cancelar, Escape o cerrar descartan el borrador.
- Arrastre entre columnas en escritorio. Selector de estado para teclado y pantallas táctiles.
- Persistencia del espacio de trabajo en `viflow.workspace.v1`, con migración del tablero guardado en `viflow.board.v2` o `viflow.board.v1`. Los formatos anteriores se conservan.
- El primer tablero muestra cuatro tarjetas de ejemplo si no hay datos previos; los tableros nuevos empiezan sin tarjetas.
- Las columnas tienen ancho fijo y se recorren con scroll horizontal en cualquier pantalla.
- Cada columna crece hasta el alto disponible; al superar ese límite, su contenido tiene scroll vertical interno.

Los datos pertenecen a este navegador y origen; la autenticación ya usa Supabase, pero todavía no hay sincronización de tableros entre dispositivos. Si el almacenamiento falla, se muestra una advertencia y se puede seguir trabajando en memoria. Las tarjetas se pueden reordenar arrastrándolas antes o después de otra tarjeta, o usando los botones Subir/Bajar. El orden se conserva en localStorage; los movimientos entre columnas también respetan la posición de destino.

## Navegación

React Router controla la navegación SPA:

- `/`: espacio de trabajo y acceso a los tableros.
- `/boards/:boardId`: tablero activo, seleccionado por la URL.
- Las rutas desconocidas o los tableros ausentes muestran una pantalla de recuperación.

La lista lateral y las pestañas usan enlaces. Atrás/Adelante, abrir un enlace en otra pestaña y recargar una URL directa funcionan sin depender del tablero que quedó seleccionado en localStorage. Las pestañas abiertas continúan guardándose; cerrar una pestaña no elimina el tablero. Al cerrar o eliminar el tablero activo se reemplaza la URL por la siguiente pestaña disponible o `/`.

Los tableros siguen siendo locales a este navegador y origen: compartir una URL no comparte sus datos.

`vercel.json` incluye la reescritura de rutas SPA hacia `index.html`, excluyendo `/api/`. El frontend debe desplegarse con esta carpeta como raíz y `dist` como directorio de salida. Esta configuración todavía debe comprobarse en un despliegue real.

## Comentarios y actividad

El detalle de tarjeta permite publicar comentarios de hasta 2000 caracteres, con autor del perfil local, fecha y saltos de línea. Se guardan inmediatamente, independientemente del borrador de título y descripción. La tarjeta muestra su cantidad de comentarios y permite abrir el detalle desde ese indicador.

El historial registra a partir de esta versión: creación de tarjetas, movimientos entre columnas, reordenamiento, cambios de título o descripción y asignación/eliminación de etiquetas. Los filtros Todo, Comentarios y Actividad permiten revisar cada tipo de entrada. No se inventa actividad anterior ni se generan eventos al cancelar o guardar sin cambios.

Los registros conservan el nombre del autor y el contexto del cambio tal como eran al realizarlo. Todo pertenece a este navegador: todavía no hay colaboración entre cuentas. Los tableros antiguos, sin comentarios ni actividad, se siguen cargando sin migración destructiva.

## Etiquetas

Cada tablero tiene sus propias etiquetas reutilizables. El selector se abre como un dropdown junto al badge, con buscador (sin distinguir tildes), lista de etiquetas y un botón «Crear etiqueta». La creación ocurre en una segunda vista del mismo dropdown, con vista previa sobre el título, paleta fija y botón para volver a la lista. Desde «Agregar etiqueta» se puede crear una etiqueta con nombre (hasta 32 caracteres), elegir uno de seis colores fijos y asignarla a la tarjeta. Los checkboxes permiten asignar o quitar etiquetas existentes. La papelera al final de cada fila elimina la etiqueta del tablero y de todas las tarjetas donde estaba asignada. Una tarjeta admite varias etiquetas; los nombres duplicados se rechazan dentro del tablero.

La paleta vive en `src/lib/labels.ts`: morado, rosa, azul, petróleo, ámbar y gris. No se admiten colores arbitrarios. El mismo dropdown también se puede abrir desde el detalle de tarjeta. Las etiquetas se guardan inmediatamente al seleccionarlas; Guardar/Cancelar en el detalle afecta al borrador de título y descripción. Escape cierra primero el dropdown y deja el detalle abierto.

Las etiquetas y sus asignaciones se guardan junto al espacio de trabajo; los datos anteriores sin etiquetas siguen siendo válidos.

## Perfil local

El menú de tres puntos del perfil permite abrir Configuración y guardar nombre y foto en `viflow.profile.v1`. La imagen se guarda en este navegador; admite PNG, JPG y WebP de hasta 1 MB. Cerrar sesión está deshabilitado hasta incorporar autenticación.

## Código

- `src/App.tsx`: conecta `useBoard` con la pantalla; mantiene los datos por encima del reinicio de la interfaz al cambiar de ruta.
- `src/components/workspace/WorkspaceScreen.tsx`: estructura del espacio de trabajo, pestañas y pantallas vacías o de error.
- `src/components/workspace/WorkspaceSidebar.tsx`: marca, navegación lateral y perfil.
- `src/components/board/KanbanBoard.tsx`: vista del tablero y coordinación del formulario de columna, etiquetas y confirmaciones.
- `src/components/board/KanbanColumn.tsx`: encabezado, lista de tarjetas y formulario de tarjeta.
- `src/components/board/TaskCard.tsx`: presentación y controles de una tarjeta; apertura del detalle sin interferir con etiquetas o arrastre.
- `src/components/board/CardDetails.tsx`: modal de detalle y borrador de edición.
- `src/components/board/CardDiscussion.tsx`: formulario de comentarios y timeline filtrable.
- `src/lib/cardActivity.ts`: comentarios, eventos, autor local y validación de registros, con pruebas en `tests/cardActivity.test.ts`.
- `src/lib/updateCard.ts`: validación y actualización del contenido, con pruebas en `tests/updateCard.test.ts`.
- `src/hooks/useCardDrag.ts`: arrastre, indicador de destino y posición final al soltar.
- `src/components/CardComposer.tsx`: formulario de creación.
- `src/hooks/useBoard.ts`: estado del espacio de trabajo, operaciones sobre el tablero de la URL y sincronización de pestañas.
- `src/main.tsx`: BrowserRouter y rutas.
- `src/lib/routes.ts`: construcción de URLs de tableros.
- `src/lib/workspace.ts`: formato del espacio de trabajo y migración de datos anteriores.
- `src/components/BoardNavigation.tsx`: lista lateral y formulario de nuevo tablero.
- `src/components/BoardTabs.tsx`: pestañas abiertas, selección y cierre.
- `src/lib/board.ts`: tipos, columnas, ejemplos y validación de datos guardados.
- `src/lib/moveCard.ts`: movimiento y orden de tarjetas, con pruebas en `tests/moveCard.test.ts`.
- `src/lib/labels.ts`: paleta y operaciones de etiquetas, con pruebas en `tests/labels.test.ts`.
- `src/components/CardLabels.tsx` y `LabelPicker.tsx`: badges y selector de etiquetas.
- `src/index.css`: TailwindCSS y estilos visuales.

## Revisión manual

1. Crear una tarjeta en cada columna; comprobar que no se acepten títulos vacíos.
2. Arrastrar tarjetas entre los tres estados y comprobar sus contadores.
3. Cambiar el estado con el selector usando teclado o móvil.
4. Recargar y comprobar que las tarjetas y sus estados se conservan.
5. Crear una columna al extremo derecho y comprobar el scroll horizontal.
6. Crear y mover tarjetas a la columna nueva; recargar y comprobar que se conserva todo.

7. Crear otro tablero, agregarle tarjetas y alternar entre ambos; comprobar su independencia y recargar para verificar la selección guardada.

8. Abrir dos tableros, comprobar sus URLs y navegar con Atrás/Adelante. Recargar una URL directa, cerrar la pestaña activa y probar una ruta inexistente.

## Organización del estado de interfaz

`useBoard` conserva el espacio de trabajo y su persistencia. La pantalla se identifica por la ruta, de modo que al navegar se reinician formularios, dropdowns y confirmaciones sin descartar datos. El tablero coordina una sola creación de tarjeta a la vez y mantiene juntas la tarjeta seleccionada para etiquetas y su anclaje. Los componentes de columna y tarjeta reciben datos y callbacks; no leen localStorage ni deciden la navegación.

## Archivado y recuperación

Las tarjetas y tableros se archivan conservando sus datos en localStorage. El acceso **Archivados** del menú lateral permite restaurarlos; el aviso **Deshacer** recupera el último elemento archivado mientras siga abierta la sesión. Restaurar un tablero lo devuelve al menú lateral, sin abrirlo automáticamente. Las tarjetas conservan su orden manual, etiquetas, comentarios, actividad, fecha y prioridad.

Al eliminar una columna, sus tarjetas se archivan y pasan a una columna existente; si era la última, se crea **Recuperadas** como destino. No se recuperan elementos eliminados definitivamente en versiones anteriores.

Para revisar: archivar una tarjeta, recargar y restaurarla desde Archivados; archivar el tablero activo, verificar el cambio de ruta y recuperarlo con Deshacer; comprobar que editar otra tarjeta antes de restaurar no pierde cambios.

## Preparación para el modo híbrido

La lectura y escritura del espacio local están detrás de `WorkspaceRepository`
y `useWorkspaceStorage`; las operaciones de `useBoard` ya no acceden directamente
a localStorage. La clave existente y la migración de formatos anteriores se
mantienen. El perfil local sigue separado del espacio de trabajo.

En **Respaldos**, desde el menú lateral, se puede exportar un JSON e importar un
archivo de hasta 10 MB. Antes de importar se valida todo y se muestra un resumen.
Los tableros se agregan como copias sin reemplazar los existentes, incluyendo los
archivados. Importar el mismo archivo otra vez produce otras copias. Un fallo al
guardar impide aplicar la importación; el usuario conserva los datos anteriores.
El archivo incluye comentarios y actividad, pero no el nombre/foto del perfil.

El [modelo de datos y permisos](docs/data-model-and-access.md) documenta entidades,
propiedad privada, migración local/nube y requisitos pendientes del registro por
correo. No hay autenticación, envío de códigos ni sincronización implementados.

Revisión: exportar, importar y abrir una copia; recargar y verificar tarjetas,
etiquetas, prioridades, comentarios y archivados. Intentar cargar un JSON roto o
una versión no admitida y comprobar que el espacio actual no cambia.

## Vista previa del registro

La ruta `/auth/preview`, accesible desde **Crear cuenta · Vista previa** en el menú
lateral, presenta el diseño de registro y verificación de correo. Es una
simulación explícita: no ejecuta solicitudes de registro, no crea usuarios, no envía correos
ni guarda credenciales. Los campos se mantienen solo en memoria y la contraseña
se limpia al cambiar de pantalla.

Para revisar, introducir un correo y una contraseña de ejemplo, continuar y usar
`123456` como código de demostración. Cualquier otro código muestra el error de
verificación; `999999` muestra vencimiento. Reenviar simula el envío y aplica una
espera visual de 30 segundos. **Revisar estados del diseño** permite inspeccionar
registro/verificación cargando, errores, vencimiento, reenvío y confirmación.
Los estados de carga seleccionados manualmente se mantienen hasta elegir otro
estado para facilitar la revisión. Recargar reinicia el recorrido.

El mínimo de contraseña, la longitud del código y la espera del reenvío son
valores de la demostración; deberán alinearse con el proveedor cuando se conecte
la autenticación. No se implementan todavía login, recuperación de contraseña,
sesiones ni importación de tableros a una cuenta.

## Cliente de Supabase (preparación)

Instalar dependencias con `pnpm install`, copiar `.env.example` a `.env.local` y
completar la URL del proyecto y la clave **publishable** de Connect → React → Vite.
Reiniciar Vite después de cambiar variables. Para Vercel, configurar esas mismas
variables en el entorno correspondiente antes de compilar.

`src/services/supabaseConfig.ts` valida la configuración sin mostrar sus valores.
`src/services/supabaseClient.ts` ofrece `getSupabaseClient()`, una única instancia
creada bajo demanda. El modo invitado sigue funcionando sin configurar Supabase. Con configuración
válida, `AuthProvider` carga el SDK por separado y consulta la sesión del usuario.
Las operaciones de registro se describen en la sección siguiente; los tableros
todavía no se consultan ni guardan en Supabase. La sesión futura tendrá persistencia y renovación del
SDK, con verificación explícita de códigos; no se procesan tokens desde la URL.

`.env.local` queda excluido de Git. Las variables `VITE_` se incluyen en el código
que recibe el navegador: usar solo la clave publishable, nunca claves secretas o
`service_role`. Las futuras tablas necesitarán permisos propios; la clave pública
no sustituye los controles de acceso.

## Registro y verificación reales

`/auth/register` usa `signUp`, `verifyOtp` con tipo `email` y `resend` con tipo
`signup`. El acceso **Crear cuenta** del lateral abre este flujo. La demostración
sigue en `/auth/preview`, separada del flujo real: `123456` no tiene ningún trato
especial en el formulario conectado.

La confirmación exige una sesión y un correo verificado devueltos por Supabase.
Los errores se traducen sin mostrar respuestas internas. El reenvío respeta una
espera visual de 60 segundos; los límites reales son responsabilidad de Supabase.
Una respuesta de registro puede ocultar que una cuenta ya existe; la pantalla
no afirma que el correo haya sido entregado por recibir una respuesta exitosa.

Solo correo pendiente y momento del próximo reenvío se guardan en sessionStorage
para retomar la verificación al recargar. Contraseña y código no se persisten. El
SDK gestiona la sesión autenticada por separado; el proveedor escucha cambios y
el acceso lateral refleja **Tu cuenta**. Se puede cerrar sesión desde esa página
o el menú del perfil, sin borrar tableros ni el perfil local.

La cuenta ya permite iniciar sesión por contraseña; la recuperación está disponible por código y la
sincronización de tableros sigue pendiente. Tras salir se puede continuar como
invitado o volver a iniciar sesión. Véase [configuración y prueba de correo](docs/supabase-auth-setup.md).

## Inicio de sesión

`/auth/login` permite entrar con correo y contraseña usando `signInWithPassword`.
El acceso lateral de invitado abre esta pantalla y desde allí se puede crear una
cuenta. El registro también enlaza a Iniciar sesión. Una sesión verificada vuelve
al espacio de trabajo; `AuthProvider` conserva su estado al recargar mediante el
SDK. Los errores de credenciales no distinguen cuenta inexistente de contraseña
incorrecta. La contraseña se limpia al enviar y no se copia a almacenamiento.

Si Supabase devuelve `email_not_confirmed`, **Verificar mi correo** abre la
verificación existente con el correo introducido. El usuario puede introducir
un código válido o pedir uno nuevo; no se ejecuta otro registro ni se manda un
correo automáticamente. El traspaso se consume una vez y conserva solo el correo
pendiente, nunca la contraseña.

Para probar el inicio de sesión, cerrar
sesión, entrar con la cuenta ya verificada y recargar; comprobar el nombre/correo
de la cuenta y que los tableros locales permanezcan intactos. Probar una contraseña
incorrecta y un registro pendiente. Las pruebas automatizadas usan un servicio
simulado, sin autenticar cuentas reales ni enviar correos.

## Recuperación de contraseña

Desde `/auth/login`, **¿Olvidaste tu contraseña?** abre `/auth/recover`: solicitud
de código, verificación y nueva contraseña con confirmación. Configurar antes la
plantilla **Reset password** usando `supabase/templates/recovery.html`, según la
[guía de Supabase](docs/supabase-auth-setup.md#recuperación-de-contraseña-por-código).

La respuesta a la solicitud no revela si el correo tiene cuenta. El reenvío tiene
espera visual y límites de Supabase. El cambio requiere verificar un OTP de tipo
`recovery` y comprobar el usuario en el servidor; una sesión normal no habilita
el paso por sí sola. La contraseña se limpia al enviar y nunca se persiste.
Recargar tras verificar exige otra verificación. Tras actualizar, la sesión
permanece activa; cerrar sesión permite probar la contraseña nueva en login.
Los tableros siguen siendo locales.

## Base de datos privada de tableros — primera entrega

La migración `supabase/migrations/202610220002_private_boards.sql` prepara siete tablas
normalizadas, relaciones, RLS, permisos por columna y actividad del servidor.
Cada cuenta verificada solo puede acceder a sus tableros; el cliente no puede
falsificar propietarios/autores ni borrar definitivamente tableros o tarjetas.
La migración se prueba con PostgreSQL embebido (PGlite) al ejecutar `pnpm test`.

Debe aplicarse una vez desde SQL Editor de Supabase. Después, ejecutar las consultas
no destructivas de `supabase/checks/private_boards.sql`. Instrucciones y contrato en
[modelo de datos y acceso](docs/data-model-and-access.md).

Esta entrega no cambia el almacenamiento de la interfaz: los tableros siguen siendo
locales. La conexión asíncrona, las operaciones transaccionales con control de
revisiones y la importación de copias serán las próximas entregas.

## Guardado de tableros de cuenta en Supabase

Los tableros de una cuenta verificada se cargan y guardan mediante RPC transaccionales,
con estados de carga/guardado/error, reintentos idempotentes y control de revisiones.
El modo invitado conserva localStorage. Los dos espacios no se mezclan y la importación
a la cuenta queda para la siguiente entrega.

Ejecutar una vez `supabase/migrations/202610220003_cloud_workspace.sql` después del
esquema privado. [Contrato, preparación y límites](docs/cloud-workspace.md).
Esta sección reemplaza las notas anteriores que describen los tableros de cuenta
como exclusivamente locales. No hay Realtime, fusión automática ni modo offline de cuenta.
