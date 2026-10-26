# Animaciones de interfaz

Se utiliza Motion para React (`motion`), con componentes ligeros de
`motion/react-m`. MotionProvider centraliza la duración (180 ms) y una curva suave.
Los movimientos de posición de tarjetas duran 220 ms.

LazyMotion carga `domMax` mediante importación dinámica porque el tablero necesita
animaciones de layout. Vite separa el runtime inicial de Motion de sus funciones
avanzadas, manteniendo chunks distintos según sus puntos de entrada. En esta
compilación son aproximadamente 19,4 KB gzip de runtime y 32,4 KB gzip de funciones
cargadas de forma diferida; no son métricas de velocidad ni rendimiento en equipos.

Cobertura:
- Entrada de menús de perfil, tablero, columna, tarjeta, etiquetas y filtros.
- Entrada de modales nativos de detalle, duplicación, confirmación, perfil,
  archivados y respaldos. Se conservan showModal, foco, Escape y handlers existentes.
- Entrada de vistas de tablero y vencimientos, pestañas y creación de columnas.
- Reordenamiento de tarjetas y transición entre columnas, con LayoutGroup.
- Entrada del aviso de archivado con Deshacer.

El arrastre continúa siendo HTML nativo. La animación vive en un contenedor externo
para no interceptar onDragStart con los gestos de Motion. Durante el arrastre no
se anima la posición de las tarjetas. Los contenedores de scroll tienen layoutScroll.
No se anima la salida de diálogos: se cierran inmediatamente para mantener su foco
nativo y no dejar controles salientes activos.

MotionConfig usa reducedMotion="user" y duración cero si el usuario solicita
movimiento reducido. Las tarjetas desactivan layout y layoutId en ese caso.
Los presets están en src/components/motion/presets.ts. Evitar animaciones infinitas,
delays por cada tarjeta y efectos que midan el DOM en cada frame desde React.

Validación: build y lint; suite existente de 104 pruebas. Revisión en tablero aislado
con datos en memoria: reordenamiento por flechas, apertura de menú, modal y Escape.
No se modifican tableros de la cuenta para esta revisión.
