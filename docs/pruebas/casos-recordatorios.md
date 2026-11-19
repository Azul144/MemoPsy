# Casos de prueba: recordatorios, avisos, enlace de videollamada y asistente de WhatsApp

Tarjeta #11 del tablero. Requerimientos RF 3.2 (avisos de cambios de turno), RF 3.3 (recordatorios) y RF 3.4 (enlace de videollamada), apartado 8.8.1 del TIF.
Datos ficticios de la demo, sobre la instalación local. Turnos de prueba creados el domingo 25/10 para el lunes 26/10, entre la psicóloga Carla Benítez (`psicologa@memopsy.test`) y el paciente Azul Coronel, que es la única cuenta con un email real (el de la autora), para poder ver el email que llega.

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
| CP-05 | Recordatorio en la campana | Azul y Carla abren el sistema (campana) con el turno remoto de CP-01 dentro de las próximas 24 horas | A cada uno le aparece un recordatorio, con la contraparte, la fecha y la modalidad | Azul: "Tenés turno con Carla Benítez el lun 26/10 a las 08:00 (remota)." Carla: "Tenés turno con Azul Coronel el lun 26/10 a las 08:00 (remota)." | ✅ |
| CP-06 | Sin recordatorios repetidos | Azul abre la campana por segunda vez | No se crea otro recordatorio del mismo turno | Siguió habiendo uno solo por persona (2 sin leer antes y después) | ✅ |
| CP-07 | Turnos fuera de las 24 horas | Turnos de CP-02 y CP-03 (lunes a la tarde, a más de 24 horas) | No generan recordatorio todavía | Sin recordatorios para las sesiones 67 y 68 | ✅ |
| CP-08 | Cancelación | Recepción crea un turno (lun 07:00) y Carla lo cancela | Azul recibe el aviso de cancelación; Carla no, porque lo canceló ella; el turno cancelado no genera recordatorio | Azul: "Se canceló el turno con Carla Benítez del lun 26/10 a las 07:00." Ningún aviso para Carla ni recordatorio de la sesión 65 | ✅ |
| CP-09 | Reprogramación por el paciente | Azul reprograma el turno de CP-02 a uno de los horarios libres que ofrece el sistema | El turno pasa a «Reprogramada» y Carla recibe el aviso con el horario anterior y el nuevo | Pasó al mar 27/10 09:00, estado «Reprogramada»; Carla: "El turno con Azul Coronel del lun 26/10 a las 16:00 pasó al mar 27/10 a las 09:00." | ✅ |
| CP-10 | Reprogramar con menos de 24 horas | Azul pide reprogramar el turno de CP-01 (faltan menos de 24 horas) | El sistema lo rechaza | HTTP 409: "Solo se puede reprogramar un turno con al menos 24 horas de anticipación." | ✅ |

## Recordatorio por email (RF 3.3)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-11 | Email 24 horas antes | Turno remoto de CP-01 (lun 08:00); esperar la pasada automática | Le llega a Azul un email con la psicóloga, la fecha, la hora, la modalidad y el enlace de Meet, sin datos clínicos | Enviado a las 12:04 del 25/10; la autora lo recibió con "lun 26/10 a las 08:00 (remota)" y el enlace de Meet (captura) | ✅ |
| CP-12 | Turnos que no deben recibir email | Pasada automática con el turno cancelado de CP-08, los de CP-02 y CP-03 (a más de 24 horas) y turnos de cuentas de demostración (`.test`) dentro de las 24 horas | No se manda email a ninguno | `recordatorio_enviado` quedó solo con la sesión 66 | ✅ |
| CP-13 | Reenvío al cambiar el horario | Recepción mueve el turno de CP-11 de las 08:00 a las 09:00 | Se borra el registro del email anterior, se avisa a las dos partes en la campana y en la pasada siguiente llega un email nuevo con las 09:00 | Avisos de reprogramación a Azul y a Carla; el email nuevo salió a las 12:14 con "lun 26/10 a las 09:00 (remota)" (captura). Gmail lo agrupó con el anterior porque tenían el mismo asunto: se agregó la fecha y la hora al asunto | ✅ |
| CP-14 | Sin emails repetidos | Esperar una pasada más después de CP-13 | No se vuelve a mandar el mismo recordatorio | Después de las pasadas de las 12:24 sigue habiendo un solo envío para la sesión 66 (el de las 12:14) | ✅ |
| CP-15 | WhatsApp apagado | Pasadas de CP-11 y CP-13 con `RECORDATORIOS_WHATSAPP` comentado | No se envía nada por WhatsApp (queda como mejora futura, tarjeta #12) | Ningún registro con canal WHATSAPP para los turnos de prueba | ✅ |

## Falla encontrada

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-16 | Pedidos simultáneos a la campana | Se borran los recordatorios de Carla y se piden sus avisos cuatro veces a la vez | Un solo recordatorio por turno | Antes de la corrección, Carla tenía dos recordatorios iguales del mismo turno (la campana y la página pedían a la vez). Corregido: los pedidos simultáneos del mismo usuario esperan al primero; quedó uno por turno | ✅ |

## Asistente de WhatsApp y consentimiento (RF 3.2, RF 3.3 y RF 4.3)

Ejecutados el 18/11/2026 sobre la instalación local, con `WHATSAPP_CHATBOT=activo`. Como el número de MemoPsy todavía espera la verificación del negocio en Meta, los mensajes se simularon: un script arma cada pedido igual que Twilio, lo firma con el Auth Token (`X-Twilio-Signature`) y lo manda a `/api/whatsapp/webhook`. La paciente de prueba fue Camila Ruiz (celular ficticio 5493700000001), con un turno remoto de prueba con Carla Benítez (sesión 77). Los resultados se comprobaron en `sesion`, `notificacion`, `auditoria` y `whatsapp_conversacion`, y después se borraron los datos de prueba.

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-17 | Botón «Confirmo» del recordatorio | Se responde con el botón CONFIRMAR | El turno queda «Confirmada», se avisa al psicólogo y la respuesta incluye el enlace de videollamada | Turno confirmado, aviso CONFIRMACION a Carla, auditoría CONFIRMAR_WHATSAPP y enlace en la respuesta | ✅ |
| CP-18 | Pedir reprogramar | Se escribe «3» | Se ofrecen hasta 6 horarios libres dentro de las franjas del psicólogo | Se ofrecieron 6 horarios (jue 19/11 y vie 20/11) | ✅ |
| CP-19 | Elegir un horario | Se responde «2» | El turno se mueve a ese horario, queda «Reprogramada» y se avisa al psicólogo | Turno movido al jue 19/11 17:00, aviso REPROGRAMACION y auditoría REPROGRAMAR_WHATSAPP | ✅ |
| CP-20 | Mensaje con riesgo | «ya no aguanto más, me quiero matar» | Respuesta fija con 911, 107, 0800 999 0091, 0800 345 1435 y el enlace a /crisis; aviso urgente al psicólogo; auditoría sin el texto | Respuesta fija, aviso CRISIS «Urgente: posible riesgo» a Carla y auditoría CRISIS_WHATSAPP sin contenido | ✅ |
| CP-21 | Segundo mensaje de crisis | «estoy con un ataque de pánico», antes de 15 minutos | Se responde con la ayuda, sin repetir el aviso al psicólogo | Respuesta de malestar, sin aviso nuevo (un solo aviso en total) | ✅ |
| CP-22 | Pedir cancelar | Se escribe «2» | Se pide confirmar con SI o NO | Pidió confirmación | ✅ |
| CP-23 | Arrepentirse | Se responde «no» | El turno sigue en pie | El turno siguió igual | ✅ |
| CP-24 | Botón «No puedo ir» y confirmar | Botón CANCELAR y después «Sí» | El turno queda cancelado y se avisa a las partes | Turno cancelado, aviso CANCELACION a Carla y auditoría CANCELAR_WHATSAPP | ✅ |
| CP-25 | Darse de baja | Se escribe «BAJA» | Se borra el consentimiento y no se mandan más recordatorios por WhatsApp | `whatsapp_acepta` en NULL y auditoría BAJA_WHATSAPP | ✅ |
| CP-26 | Volver a aceptar | Se escribe «alta» | Se registra la fecha del consentimiento | `whatsapp_acepta` con la fecha y auditoría ALTA_WHATSAPP | ✅ |
| CP-27 | Mensaje libre | Se escribe «hola» | Se muestra el próximo turno y el menú 1 a 4 | Mostró el turno del mié 25/11 y el menú, sin cambiar nada | ✅ |
| CP-28 | Celular desconocido | «hola» desde un número que no es de ningún paciente | Se informa que el número no se reconoce y se ofrece la ayuda en crisis | Respuesta de número no reconocido con el enlace a /crisis | ✅ |
| CP-29 | Crisis desde un celular desconocido | «no quiero vivir» desde ese número | Se responde con la ayuda en crisis, sin decir que se avisó a un psicólogo | Respuesta fija, sin aviso ni auditoría | ✅ |
| CP-30 | Firma falsa | Pedido con una `X-Twilio-Signature` inválida | Se rechaza sin procesar el mensaje | HTTP 403 | ✅ |
| CP-31 | Casilla de consentimiento en «Mi cuenta» | La paciente marca la casilla, guarda dos veces y después la desmarca | Se guarda la fecha, se conserva al volver a guardar y se borra al desmarcar | Fecha guardada, igual en el segundo guardado y NULL al desmarcar | ✅ |

## Observaciones

- Cuando un turno remoto cambia de horario, el enlace de Google Meet se conserva. El enlace sigue sirviendo, porque una sala de Meet no vence, pero el evento del calendario de Google queda con el horario viejo.
- La caída de Google (respaldo con Jitsi Meet) y la falla de Brevo no se probaron en esta tanda, porque necesitan cambiar las credenciales y reiniciar el servidor.
- Después de las pruebas se borraron de la base los turnos de prueba (sesiones 63 a 68) con sus avisos y registros de envío. Los eventos que Google Meet creó en el calendario de la autora para esos turnos quedan en su Google Calendar.
