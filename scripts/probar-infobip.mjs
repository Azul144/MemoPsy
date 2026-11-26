// Manda un WhatsApp de prueba por Infobip, sin necesitar un turno, y muestra lo que respondió Infobip:
//   node --env-file=.env.local scripts/probar-infobip.mjs 5493704123456
// El número va con código de país y sin "+". En la prueba gratis solo llega a los números
// verificados en la cuenta de Infobip y, sin plantilla, solo si ese celular le escribió antes
// al remitente en las últimas 24 horas.

const clave = process.env.INFOBIP_API_KEY
const base = (process.env.INFOBIP_BASE_URL || "").trim().replace(/\/+$/, "")
const para = (process.argv[2] || "").replace(/\D/g, "")
if (!clave || !base) {
  console.error("Faltan INFOBIP_API_KEY e INFOBIP_BASE_URL en .env.local (usá --env-file=.env.local).")
  process.exit(1)
}
if (!para) {
  console.error("Falta el número: node --env-file=.env.local scripts/probar-infobip.mjs 5493704123456")
  process.exit(1)
}

const url = (/^https?:\/\//i.test(base) ? base : `https://${base}`) + "/whatsapp/1/message/text"
const from = (process.env.INFOBIP_WHATSAPP_FROM || "447860088970").replace(/\D/g, "")

const respuesta = await fetch(url, {
  method: "POST",
  headers: { Authorization: `App ${clave}`, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({
    from,
    to: para,
    content: { text: "Hola 👋 Este es un mensaje de prueba de MemoPsy por Infobip.\n— MemoPsy" },
  }),
})

console.log(`Estado HTTP: ${respuesta.status}`)
console.log(JSON.stringify(await respuesta.json().catch(() => null), null, 2))
