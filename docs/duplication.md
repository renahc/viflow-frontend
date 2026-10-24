# Duplicar tarjetas y tableros

El menú de tres puntos de una tarjeta ofrece Duplicar y Archivar. El de un tablero
ofrece Renombrar, Duplicar y Archivar. La modal permite cambiar el nombre y elegir
si conservar vencimientos y etiquetas. Por defecto conserva etiquetas y quita fechas.

La tarjeta se copia en su misma columna, justo después del original en orden manual.
Una columna con orden por prioridad mantiene su orden automático. El tablero nuevo
se abre en una pestaña y conserva las columnas, sus colores y orden, y las tarjetas
visibles con sus estados. Las tarjetas archivadas no se incluyen.

Se conservan descripciones y prioridades. Las checklists reciben nuevos identificadores
y todos sus pasos quedan pendientes. Comentarios, historial y marcas de archivado no
se copian. En la nube, la actividad de creación se genera con la identidad actual.

Las copias tienen IDs nuevos. Las etiquetas de un tablero duplicado reciben IDs
nuevos y las asignaciones se remapean; las columnas conservan claves locales dentro
del tablero nuevo para mantener el significado de Hecho. Los UUID de filas remotas
los asigna el servidor. Los originales no se modifican.

Usa el guardado existente, sin migración adicional. Si se copian checklists en una
cuenta, debe estar instalada la migración de checklists anterior.

Pruebas: independencia de objetos, relaciones, exclusión de archivados, reinicio
de pasos y opciones de copia; PostgreSQL verifica que guardar un tablero duplicado
no altera el original.
