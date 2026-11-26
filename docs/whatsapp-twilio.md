# WhatsApp con Twilio: recordatorios y chatbot

MemoPsy usa WhatsApp para dos cosas:

- **Recordatorio del turno**, 24 horas antes, con los botones **Confirmo** y **No puedo ir**.
- **Chatbot** que responde lo que escribe el paciente:
  - **1** confirmar, **2** cancelar (pide confirmación), **3** reprogramar dentro de las franjas del psicólogo (con 24 h de anticipación), **4** ayuda en crisis.
  - **BAJA** y **ALTA** para dejar de recibir mensajes o volver a recibirlos.

Si un mensaje puede indicar una crisis, el bot responde siempre con un **texto fijo**: el 911 y el 107, las líneas gratuitas de 24 horas y el enlace a `/crisis`. Además, avisa al psicólogo por la campanita y por email.
- El texto del paciente **no se guarda**. En la auditoría queda solo el evento (`CRISIS_WHATSAPP`).
- La detección es por palabras y frases fijas (`src/lib/whatsapp/crisis.ts`), sin inteligencia artificial.
- Conviene que un profesional de salud mental revise esas listas y los textos.

## 1. Lo que se hace en Twilio (una sola vez)

1. **Pasar la cuenta a paga** (Upgrade) en console.twilio.com y cargar saldo. La cuenta de prueba no permite crear plantillas (error 20003).
2. **Registrar el número de WhatsApp:** Messaging → Senders → WhatsApp senders → *Create new sender*.
   - Puede ser un chip propio, que no tenga WhatsApp instalado y que reciba el código por SMS o llamada.
   - También puede ser un número comprado en Twilio.
   - El proceso vincula una cuenta de WhatsApp Business (WABA) con Meta. Sin verificar el negocio, se pueden tener hasta 2 números.
3. **Configurar el número registrado:**
   - *Webhook URL for incoming messages*: `https://memopsy.onrender.com/api/whatsapp/webhook`, método **POST**.
   - *Fallback URL*: un **TwiML Bin** (Develop → TwiML Bins) con este contenido. Twilio lo usa si MemoPsy no responde, por ejemplo cuando Render está dormido, así la persona siempre recibe las líneas de ayuda:

     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <Response><Message>Recibimos tu mensaje, pero el sistema tarda en responder. Si estás pasando un momento difícil, llamá gratis las 24 h al 0800 999 0091 o al 0800 345 1435. Si estás en peligro, llamá al 911. Si escribías por tu turno, probá de nuevo en un minuto. — MemoPsy</Message></Response>
     ```

## 2. Variables

En `.env.local`, y en las variables de entorno de Render:

```
WHATSAPP_PROVEEDOR=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+54...        # el número registrado
RECORDATORIOS_WHATSAPP=activo
WHATSAPP_CHATBOT=activo
TWILIO_CONTENT_SID=HX...           # después del paso 3
```

- La firma de Twilio se verifica contra `NEXTAUTH_URL` + `/api/whatsapp/webhook`.
- Si Twilio llama a otra dirección (por ejemplo, un túnel para probar en local), hay que poner esa dirección exacta en `TWILIO_WEBHOOK_URL`.

## 3. Plantilla del recordatorio

```
node --env-file=.env.local scripts/crear-plantilla-twilio.mjs
```

- Crea `recordatorio_turno` con sus dos botones y la manda a WhatsApp como mensaje de **utilidad**.
- Cuando WhatsApp la aprueba, el SID (empieza con `HX`) va en `TWILIO_CONTENT_SID`.
- Para consultar el estado: `node --env-file=.env.local scripts/crear-plantilla-twilio.mjs HX...`

## 4. Base de datos

Correr `scripts/migraciones/migracion-whatsapp-chatbot.sql` en la base local y en Aiven. Se puede correr más de una vez sin problema. Agrega:
- la columna `persona.whatsapp_acepta`, con la fecha del consentimiento;
- la tabla `whatsapp_conversacion`, que guarda en qué paso de la charla está cada celular, sin el texto de los mensajes.

## 5. Consentimiento

Solo reciben recordatorios los pacientes que tienen el celular cargado **y** aceptaron recibirlos:
- el paciente lo acepta en **Mi cuenta**;
- la administración lo marca en **Usuarios** cuando el consentimiento se firmó en el consultorio;
- también se puede escribir **ALTA** al número.

Con **BAJA**, o desmarcando la casilla, deja de recibirlos.

## 6. Cosas a tener en cuenta

- **Render Free se duerme** después de 15 minutos sin visitas.
  - Dormido, no corre la tarea de los recordatorios (que se revisa cada 10 minutos) y el primer mensaje puede tardar más de lo que Twilio espera; para eso está la *Fallback URL*.
  - Para usarlo con pacientes reales conviene un plan que no se duerma.
- **Costos aproximados en Argentina:** unos US$0,03 por recordatorio (plantilla de utilidad). Desde el 1/10/2026, Meta también cobra las respuestas dentro de la conversación. A eso se suma el recargo de Twilio por mensaje.
- **Políticas:** desde el 15/01/2026 WhatsApp prohíbe los chatbots de uso general. Este bot cumple una función concreta del consultorio (turnos y derivación en crisis), que es lo que está permitido.

## 7. Prueba local sin WhatsApp

Se puede simular un mensaje de Twilio firmado con el `TWILIO_AUTH_TOKEN` y enviarlo por POST a `http://localhost:3000/api/whatsapp/webhook`. La respuesta llega en TwiML.

## Alternativa: Infobip

Infobip es otro intermediario de la API de WhatsApp de Meta, igual que Twilio. Para mandar desde el número propio de MemoPsy, Meta también exige el negocio verificado. La prueba gratis (14 días, 100 mensajes) usa el remitente de prueba de Infobip y solo entrega a los números verificados en la cuenta.

1. En portal.infobip.com → Guía, copiar la **Clave API** y la **URL base de API** a `INFOBIP_API_KEY` e `INFOBIP_BASE_URL`.
2. Probar el envío sin turno: `node --env-file=.env.local scripts/probar-infobip.mjs 549XXXXXXXXXX`.
3. Para que los recordatorios salgan por Infobip: `WHATSAPP_PROVEEDOR=infobip` y `RECORDATORIOS_WHATSAPP=activo`.
4. Con número propio aprobado: `INFOBIP_WHATSAPP_FROM` y, en `INFOBIP_PLANTILLA`, una plantilla con 4 datos ({{1}} paciente, {{2}} psicólogo, {{3}} día y hora, {{4}} modalidad).

El chatbot (webhook `/api/whatsapp/webhook`) sigue funcionando solo con Twilio: con Infobip se envían los recordatorios, pero las respuestas del paciente todavía no se procesan.
