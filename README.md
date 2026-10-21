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
```

## Primera versión

- Creación de tableros independientes desde el menú lateral, con selección persistida y lista vertical.
- Tres columnas iniciales: Por hacer, En progreso y Hecho.
- Creación de columnas personalizadas al extremo derecho del tablero.
- Eliminación de tarjetas y columnas con confirmación. Eliminar una columna elimina también sus tarjetas; se puede dejar el tablero vacío.
- Creación de tarjetas con título y descripción opcional.
- Arrastre entre columnas en escritorio. Selector de estado para teclado y pantallas táctiles.
- Persistencia del espacio de trabajo en `viflow.workspace.v1`, con migración del tablero guardado en `viflow.board.v2` o `viflow.board.v1`. Los formatos anteriores se conservan.
- El primer tablero muestra cuatro tarjetas de ejemplo si no hay datos previos; los tableros nuevos empiezan sin tarjetas.
- Las columnas tienen ancho fijo y se recorren con scroll horizontal en cualquier pantalla.
- Cada columna crece hasta el alto disponible; al superar ese límite, su contenido tiene scroll vertical interno.

Los datos pertenecen a este navegador y origen; todavía no hay backend, cuentas ni sincronización entre dispositivos. Si el almacenamiento falla, se muestra una advertencia y se puede seguir trabajando en memoria. Mover una tarjeta conserva su posición relativa en la lista original; esta versión no incluye reordenamiento dentro de una columna.

## Perfil local

El menú de tres puntos del perfil permite abrir Configuración y guardar nombre y foto en `viflow.profile.v1`. La imagen se guarda en este navegador; admite PNG, JPG y WebP de hasta 1 MB. Cerrar sesión está deshabilitado hasta incorporar autenticación.

## Código

- `src/App.tsx`: estructura visual e interacción del tablero.
- `src/components/CardComposer.tsx`: formulario de creación.
- `src/hooks/useBoard.ts`: selección, creación y guardado de tableros; operaciones sobre el tablero activo.
- `src/lib/workspace.ts`: formato del espacio de trabajo y migración de datos anteriores.
- `src/components/BoardNavigation.tsx`: lista lateral y formulario de nuevo tablero.
- `src/lib/board.ts`: tipos, columnas, ejemplos y validación de datos guardados.
- `src/index.css`: TailwindCSS y estilos visuales.

## Revisión manual

1. Crear una tarjeta en cada columna; comprobar que no se acepten títulos vacíos.
2. Arrastrar tarjetas entre los tres estados y comprobar sus contadores.
3. Cambiar el estado con el selector usando teclado o móvil.
4. Recargar y comprobar que las tarjetas y sus estados se conservan.
5. Crear una columna al extremo derecho y comprobar el scroll horizontal.
6. Crear y mover tarjetas a la columna nueva; recargar y comprobar que se conserva todo.

7. Crear otro tablero, agregarle tarjetas y alternar entre ambos; comprobar su independencia y recargar para verificar la selección guardada.
