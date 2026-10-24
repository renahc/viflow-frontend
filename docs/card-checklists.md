# Checklists de tarjetas

Cada tarjeta puede contener hasta 100 pasos de 200 caracteres, con texto editable,
casilla de completado y eliminación individual. El detalle mantiene un borrador:
los pasos se guardan con «Guardar cambios»; Cancelar los descarta. La checklist no
cambia automáticamente la columna ni el estado de la tarjeta. El tablero muestra
pasos completados/total y una barra de progreso que abre el detalle.

El almacenamiento local admite las tarjetas anteriores sin checklist. Exportación,
restauración de respaldos, archivado e importación a la cuenta conservan los pasos.

## Supabase

Ejecutar una sola vez `supabase/migrations/202610240002_card_checklists.sql`, después
de la migración de importación local. Añade una columna JSON validada, actualiza
las RPC de carga y guardado y mantiene sus permisos y revisión transaccional.
No agrega pasos a las tarjetas existentes. El cliente comprueba la capacidad antes
de enviar pasos para evitar que un servidor anterior los descarte silenciosamente.
Después de ejecutarla, recargar la aplicación. No volver a ejecutar migraciones
anteriores.

Las pruebas comprueban límites, referencias únicas, respaldos, detección de cambios,
guardado y carga en PostgreSQL, importación y rollback de checklists inválidas.
