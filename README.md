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

Los datos pertenecen a este navegador y origen; todavía no hay backend, cuentas ni sincronización entre dispositivos. Si el almacenamiento falla, se muestra una advertencia y se puede seguir trabajando en memoria. Las tarjetas se pueden reordenar arrastrándolas antes o después de otra tarjeta, o usando los botones Subir/Bajar. El orden se conserva en localStorage; los movimientos entre columnas también respetan la posición de destino.

## Navegación

React Router controla la navegación SPA:

- `/`: espacio de trabajo y acceso a los tableros.
- `/boards/:boardId`: tablero activo, seleccionado por la URL.
- Las rutas desconocidas o los tableros ausentes muestran una pantalla de recuperación.

La lista lateral y las pestañas usan enlaces. Atrás/Adelante, abrir un enlace en otra pestaña y recargar una URL directa funcionan sin depender del tablero que quedó seleccionado en localStorage. Las pestañas abiertas continúan guardándose; cerrar una pestaña no elimina el tablero. Al cerrar o eliminar el tablero activo se reemplaza la URL por la siguiente pestaña disponible o `/`.

Los tableros siguen siendo locales a este navegador y origen: compartir una URL no comparte sus datos.

`vercel.json` incluye la reescritura de rutas SPA hacia `index.html`, excluyendo `/api/`. El frontend debe desplegarse con esta carpeta como raíz y `dist` como directorio de salida. Esta configuración todavía debe comprobarse en un despliegue real.

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
