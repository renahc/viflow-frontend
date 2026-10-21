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

- Tres columnas iniciales: Por hacer, En progreso y Hecho.
- Creación de columnas personalizadas al extremo derecho del tablero.
- Creación de tarjetas con título y descripción opcional.
- Arrastre entre columnas en escritorio. Selector de estado para teclado y pantallas táctiles.
- Persistencia en `localStorage` bajo la clave `viflow.board.v2` (columnas y tarjetas), con lectura del formato anterior `viflow.board.v1`.
- Cuatro tarjetas de ejemplo cuando todavía no hay un tablero válido guardado.
- Las columnas tienen ancho fijo y se recorren con scroll horizontal en cualquier pantalla.
- Cada columna crece hasta el alto disponible; al superar ese límite, su contenido tiene scroll vertical interno.

Los datos pertenecen a este navegador y origen; todavía no hay backend, cuentas ni sincronización entre dispositivos. Si el almacenamiento falla, se muestra una advertencia y se puede seguir trabajando en memoria. Mover una tarjeta conserva su posición relativa en la lista original; esta versión no incluye reordenamiento dentro de una columna.

## Código

- `src/App.tsx`: estructura visual e interacción del tablero.
- `src/components/CardComposer.tsx`: formulario de creación.
- `src/hooks/useBoard.ts`: estado y guardado del tablero.
- `src/lib/board.ts`: tipos, columnas, ejemplos y validación de datos guardados.
- `src/index.css`: TailwindCSS y estilos visuales.

## Revisión manual

1. Crear una tarjeta en cada columna; comprobar que no se acepten títulos vacíos.
2. Arrastrar tarjetas entre los tres estados y comprobar sus contadores.
3. Cambiar el estado con el selector usando teclado o móvil.
4. Recargar y comprobar que las tarjetas y sus estados se conservan.
5. Crear una columna al extremo derecho y comprobar el scroll horizontal.
6. Crear y mover tarjetas a la columna nueva; recargar y comprobar que se conserva todo.
