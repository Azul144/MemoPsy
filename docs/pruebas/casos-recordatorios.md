# Casos de prueba: recordatorios, avisos y enlace de videollamada

Tarjeta #11 del tablero. Requerimientos RF 3.2 (avisos de cambios de turno), RF 3.3 (recordatorios) y RF 3.4 (enlace de videollamada), apartado 8.8.1 del TIF.
Datos ficticios de la demo, sobre la instalación local. Turnos de prueba creados el domingo 25/10 para el lunes 26/10, entre la psicóloga Carla Benítez (`psicologa@memopsy.test`) y el paciente Tomás Acosta, que es la única cuenta con un email real (el de la autora), para poder ver el email que llega.

Los pedidos se hicieron a la API del sistema con la sesión de cada perfil (recepción, psicóloga y paciente), y los resultados se comprobaron en la base (`sesion`, `notificacion` y `recordatorio_enviado`).

Configuración: `RECORDATORIOS_EMAIL=activo`, WhatsApp apagado (`RECORDATORIOS_WHATSAPP` comentado), credenciales de Google Meet cargadas. El servidor busca los turnos de las próximas 24 horas cada 10 minutos.

Estado: ✅ pasa · ❌ falla · ⏳ pendiente

## Enlace de videollamada (RF 3.4)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-01 | Turno remoto sin enlace | Recepción crea un turno remoto (lun 26/10 08:00) con el enlace vacío | El sistema genera un enlace de Google Meet y lo guarda en el turno | Se guardó `https://meet.google.com/pyb-gwvo-wyh` (sesión 66) | ✅ |
| CP-02 | Enlace escrito a mano | Recepción crea un turno remoto (lun 16:00) con un enlace propio | Se respeta el enlace escrito; no se crea una reunión de Google | Quedó el enlace escrito (`https://meet.jit.si/MemoPsy-EnlaceEscritoAMano`, sesión 67) | ✅ |
| CP-03 | Turno presencial | Recepción crea un turno presencial (lun 17:00) | El turno queda sin enlace | `enlace_videollamada` vacío (sesión 68) | ✅ |
| CP-04 | Pasar de presencial a remota | Recepción edita el turno de CP-03 y lo pasa a remota, sin enlace | Se genera el enlace de Google Meet al guardar | Se guardó `https://meet.google.com/xne-kzrn-oei` | ✅ |

## Avisos dentro de la plataforma (RF 3.2 y 3.3)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-05 | Recordatorio en la campana | Tomás y Carla abren el sistema (campana) con el turno remoto de CP-01 dentro de las próximas 24 horas | A cada uno le aparece un recordatorio, con la contraparte, la fecha y la modalidad | Tomás: "Tenés turno con Carla Benítez el lun 26/10 a las 08:00 (remota)." Carla: "Tenés turno con Tomás Acosta el lun 26/10 a las 08:00 (remota)." | ✅ |
| CP-06 | Sin recordatorios repetidos | Tomás abre la campana por segunda vez | No se crea otro recordatorio del mismo turno | Siguió habiendo uno solo por persona (2 sin leer antes y después) | ✅ |
| CP-07 | Turnos fuera de las 24 horas | Turnos de CP-02 y CP-03 (lunes a la tarde, a más de 24 horas) | No generan recordatorio todavía | Sin recordatorios para las sesiones 67 y 68 | ✅ |
| CP-08 | Cancelación | Recepción crea un turno (lun 07:00) y Carla lo cancela | Tomás recibe el aviso de cancelación; Carla no, porque lo canceló ella; el turno cancelado no genera recordatorio | Tomás: "Se canceló el turno con Carla Benítez del lun 26/10 a las 07:00." Ningún aviso para Carla ni recordatorio de la sesión 65 | ✅ |
| CP-09 | Reprogramación por el paciente | Tomás reprograma el turno de CP-02 a uno de los horarios libres que ofrece el sistema | El turno pasa a «Reprogramada» y Carla recibe el aviso con el horario anterior y el nuevo | Pasó al mar 27/10 09:00, estado «Reprogramada»; Carla: "El turno con Tomás Acosta del lun 26/10 a las 16:00 pasó al mar 27/10 a las 09:00." | ✅ |
| CP-10 | Reprogramar con menos de 24 horas | Tomás pide reprogramar el turno de CP-01 (faltan menos de 24 horas) | El sistema lo rechaza | HTTP 409: "Solo se puede reprogramar un turno con al menos 24 horas de anticipación." | ✅ |

## Recordatorio por email (RF 3.3)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-11 | Email 24 horas antes | Turno remoto de CP-01 (lun 08:00); esperar la pasada automática | Le llega a Tomás un email con la psicóloga, la fecha, la hora, la modalidad y el enlace de Meet, sin datos clínicos | Enviado a las 12:04 del 25/10; la autora lo recibió con "lun 26/10 a las 08:00 (remota)" y el enlace de Meet (captura) | ✅ |
| CP-12 | Turnos que no deben recibir email | Pasada automática con el turno cancelado de CP-08, los de CP-02 y CP-03 (a más de 24 horas) y turnos de cuentas de demostración (`.test`) dentro de las 24 horas | No se manda email a ninguno | `recordatorio_enviado` quedó solo con la sesión 66 | ✅ |
| CP-13 | Reenvío al cambiar el horario | Recepción mueve el turno de CP-11 de las 08:00 a las 09:00 | Se borra el registro del email anterior, se avisa a las dos partes en la campana y en la pasada siguiente llega un email nuevo con las 09:00 | Avisos de reprogramación a Tomás y a Carla; el email nuevo salió a las 12:14 con "lun 26/10 a las 09:00 (remota)" (captura). Gmail lo agrupó con el anterior porque tenían el mismo asunto: se agregó la fecha y la hora al asunto | ✅ |
| CP-14 | Sin emails repetidos | Esperar una pasada más después de CP-13 | No se vuelve a mandar el mismo recordatorio | Después de las pasadas de las 12:24 sigue habiendo un solo envío para la sesión 66 (el de las 12:14) | ✅ |
| CP-15 | WhatsApp apagado | Pasadas de CP-11 y CP-13 con `RECORDATORIOS_WHATSAPP` comentado | No se envía nada por WhatsApp (queda como mejora futura, tarjeta #12) | Ningún registro con canal WHATSAPP para los turnos de prueba | ✅ |

## Falla encontrada

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-16 | Pedidos simultáneos a la campana | Se borran los recordatorios de Carla y se piden sus avisos cuatro veces a la vez | Un solo recordatorio por turno | Antes de la corrección, Carla tenía dos recordatorios iguales del mismo turno (la campana y la página pedían a la vez). Corregido: los pedidos simultáneos del mismo usuario esperan al primero; quedó uno por turno | ✅ |

## Observaciones

- Cuando un turno remoto cambia de horario, el enlace de Google Meet se conserva. El enlace sigue sirviendo, porque una sala de Meet no vence, pero el evento del calendario de Google queda con el horario viejo.
- La caída de Google (respaldo con Jitsi Meet) y la falla de Brevo no se probaron en esta tanda, porque necesitan cambiar las credenciales y reiniciar el servidor.
- Después de las pruebas se borraron de la base los turnos de prueba (sesiones 63 a 68) con sus avisos y registros de envío. Los eventos que Google Meet creó en el calendario de la autora para esos turnos quedan en su Google Calendar.
