# Conexión y recuperación de borradores

Antes de enviar una modificación a Supabase se guarda su petición exacta y la vista
pendiente en localStorage. Cada cuenta y operación tienen una clave independiente:
`viflow.cloud-draft.v1:CUENTA:OPERACIÓN`. No contiene contraseñas ni tokens, pero sí
contenido de tableros; permanece en el navegador al salir para recuperarlo después.
La interfaz solo consulta borradores de la cuenta verificada activa.

## Flujo

- Una pérdida de conexión muestra el estado pendiente y si la copia local se guardó.
- Al volver a abrir con esa cuenta, aparece la lista de borradores con fecha y nombre.
- Recuperar muestra el contenido pendiente y abre su tablero. Reintentar reutiliza
  la clave de operación y las revisiones originales: una respuesta perdida no duplica
  comentarios y un cambio remoto posterior no se sobrescribe automáticamente.
- Una respuesta válida de guardado retira únicamente el borrador de esa operación.
- Descartar pide confirmación. Un borrador en memoria se retira después de cargar
  correctamente la nube, de modo que un fallo de recarga no lo borra antes de tiempo.
- Varias pestañas pueden conservar borradores distintos sin reemplazarse entre sí.

Si el navegador bloquea el almacenamiento o se llena la cuota, el aviso indica que
los cambios están solo en esta pestaña. Se puede descargar un JSON antes de salir.
Los registros inválidos se conservan sin reenviarlos ni borrarlos automáticamente.

## Límites

Es recuperación del guardado enviado, no edición sin conexión completa. Después de
un fallo las ediciones se pausan hasta reintentar o resolver el conflicto. No hay
Service Worker que permita cargar la aplicación por primera vez sin internet, ni
caché de cuenta completa para iniciar una sesión offline. Las ediciones sin pulsar
Guardar en una modal no se convierten en borrador remoto. La importación local
mantiene su mecanismo de reintentos separado.

Los borradores pertenecen al navegador y origen donde se crearon. Borrar los datos
del sitio o usar otra dirección/dispositivo no los recupera. No hay fusión automática
ni sustitución de revisiones al recuperar. No requiere migraciones de Supabase.

## Validación

Pruebas de almacenamiento: reinicio de instancia, petición/revisión/operación exactas,
aislamiento de cuentas y pestañas, retirada individual, datos inválidos, cuota y
almacenamiento bloqueado. PostgreSQL verifica el replay de una operación recuperada
sin duplicar comentarios y conserva el rechazo de revisiones obsoletas.

La revisión de interfaz usa un servidor y cuenta simulados: envío fallido, apertura
de otra instancia, recuperación, reintento exitoso y retirada del borrador. No modifica
tableros personales. Los archivos temporales del escenario se retiran tras la prueba.
