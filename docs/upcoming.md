# Próximos vencimientos

La entrada Vencimientos del menú lateral abre `/upcoming` en modo local o de cuenta.
Reúne tarjetas de todos los tableros visibles: vencidas, hoy y el resto de la semana
hasta el domingo inclusive. No incluye fechas posteriores al domingo, tarjetas sin
fecha, tarjetas de Hecho ni tableros/tarjetas archivados. La semana usa días locales,
sin convertir vencimientos de calendario a UTC; la vista se actualiza cada minuto.

Las tarjetas se ordenan por fecha conservando el orden original cuando coinciden.
Cada resultado muestra tablero, columna, vencimiento y prioridad. Al pulsarlo abre
el tablero con el detalle de esa tarjeta (`?card=ID`). Cerrar el detalle retira ese
parámetro sin añadir una entrada al historial. Volver permite regresar a la agenda.

Es una vista derivada: no modifica contenido ni requiere migraciones de Supabase.
Pruebas cubren agrupaciones, múltiples tableros, fin de semana, cambios de mes y año,
exclusión de archivados/completadas y preservación del contenido original.
