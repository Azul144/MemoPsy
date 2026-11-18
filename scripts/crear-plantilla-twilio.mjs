// Crea en Twilio la plantilla "recordatorio_turno" (con los botones Confirmo / No puedo ir) y la
// manda a WhatsApp para que la apruebe como mensaje de UTILIDAD. Se corre una sola vez, con la
// cuenta paga de Twilio ya configurada:
//   node --env-file=.env.local scripts/crear-plantilla-twilio.mjs          (crea y pide la aprobación)
//   node --env-file=.env.local scripts/crear-plantilla-twilio.mjs HX...    (consulta el estado)
// Cuando WhatsApp la aprueba (suele tardar de minutos a un par de días), el SID que empieza con HX
// va en TWILIO_CONTENT_SID.
//
// Datos de la plantilla (los completa src/lib/whatsapp/twilio.ts):
//   {{1}} nombre del paciente · {{2}} psicólogo · {{3}} día y hora · {{4}} modalidad
// Solo datos del turno: nunca contenido clínico.

const cuenta = process.env.TWILIO_ACCOUNT_SID
const token = process.env.TWILIO_AUTH_TOKEN
if (!cuenta || !token) {
  console.error("Faltan TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN (usá --env-file=.env.local).")
  process.exit(1)
}
const autorizacion = "Basic " + Buffer.from(`${cuenta}:${token}`).toString("base64")

async function llamar(url, cuerpo) {
  const r = await fetch(url, {
    method: cuerpo ? "POST" : "GET",
    headers: { Authorization: autorizacion, ...(cuerpo && { "Content-Type": "application/json" }) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const datos = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error(`Twilio respondió ${r.status}:`, datos.message ?? datos)
    process.exit(1)
  }
  return datos
}

const sidExistente = process.argv[2]
if (sidExistente) {
  const estado = await llamar(`https://content.twilio.com/v1/Content/${sidExistente}/ApprovalRequests`)
  console.log("Estado en WhatsApp:", estado.whatsapp?.status ?? estado)
  if (estado.whatsapp?.rejection_reason) console.log("Motivo del rechazo:", estado.whatsapp.rejection_reason)
  process.exit(0)
}

const plantilla = await llamar("https://content.twilio.com/v1/Content", {
  friendly_name: "recordatorio_turno",
  language: process.env.WHATSAPP_IDIOMA || "es",
  variables: { 1: "Camila", 2: "Carla Benítez", 3: "mié 25/11 a las 10:00", 4: "presencial" },
  types: {
    "twilio/quick-reply": {
      body:
        "Hola {{1}}, te recordamos tu turno con {{2}} el {{3}} ({{4}}). ¿Vas a poder asistir? " +
        "Si no querés recibir más recordatorios, escribí BAJA.",
      actions: [
        { title: "Confirmo", id: "CONFIRMAR" },
        { title: "No puedo ir", id: "CANCELAR" },
      ],
    },
  },
})
console.log("Plantilla creada:", plantilla.sid)

const aprobacion = await llamar(`https://content.twilio.com/v1/Content/${plantilla.sid}/ApprovalRequests/whatsapp`, {
  name: "recordatorio_turno",
  category: "UTILITY",
})
console.log("Pedido de aprobación enviado. Estado:", aprobacion.status ?? aprobacion)
console.log(`\nCuando esté aprobada, poné en las variables: TWILIO_CONTENT_SID=${plantilla.sid}`)
console.log(`Para consultar el estado: node --env-file=.env.local scripts/crear-plantilla-twilio.mjs ${plantilla.sid}`)
