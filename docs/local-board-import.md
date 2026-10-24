# Importar tableros locales

## Instalación

Después de la migración de guardado remoto, ejecutar una sola vez en Supabase SQL
Editor `supabase/migrations/202610240001_import_local_boards.sql`.
No copia datos automáticamente. Comprobar con:

```sql
select to_regprocedure('public.viflow_import_local_boards(jsonb,uuid)');
```

## Uso

Con una cuenta verificada, abrir Respaldos → Importar desde este dispositivo.
Seleccionar tableros, revisar el resumen y pulsar «Copiar a mi cuenta».
Los archivados también se pueden seleccionar y siguen archivados en la cuenta.
La operación añade copias independientes sin reemplazar tableros de la cuenta ni
modificar los originales locales. Repetir una copia ya confirmada crea otras copias.

Solo se leen datos guardados del mismo navegador y origen: `localhost` y
`127.0.0.1` tienen almacenamiento separado. No se generan tableros de ejemplo si
no existe contenido guardado. Si el almacenamiento es inválido, se muestra un error
sin escribir sobre él. La importación de archivos JSON a la cuenta queda pendiente.

## Integridad y reintentos

La RPC asigna nuevos UUID a los registros y conserva sus relaciones, etiquetas,
fechas, prioridades y archivados dentro de una sola transacción. Los comentarios
y la actividad conservan nombres y fechas históricas con la marca «Historial
importado», sin atribuirlos a una identidad autenticada. Los comentarios nuevos
continúan recibiendo la identidad y fecha del servidor.

Antes de enviar, se guarda únicamente una clave de operación en sessionStorage,
asociada a la cuenta y al hash del contenido; no se guarda allí el contenido de los
tableros. Una respuesta perdida se puede reintentar desde la misma sesión con la
misma selección sin duplicar la copia. La clave se retira tras una respuesta válida.
Si no se puede persistir la clave, no se envía la petición. Cerrar la sesión del
navegador puede eliminar esta protección de reintento; ante un resultado incierto,
comprobar primero los tableros de la cuenta.

## Validación

Las pruebas con PostgreSQL embebido comprueban migración, copia, procedencia,
relaciones, aislamiento entre cuentas, permisos, reintentos y rollback completo.
Las pruebas del cliente cubren lectura sin escrituras, límites, eliminación de
campos de identidad y recuperación de una respuesta perdida. La revisión visual
remota comprueba el acceso desde Respaldos y el estado sin datos locales; no copia
tableros personales automáticamente.
