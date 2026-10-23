// scripts/conectar-google-meet.mjs
// Conecta MemoPsy con la cuenta de Google del consultorio para crear reuniones de Google Meet (RF 3.4).
// Se corre una sola vez (o cuando Google corte la conexión): node scripts/conectar-google-meet.mjs
// Antes hay que cargar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local (cliente OAuth de tipo
// "App de escritorio" en Google Cloud). El script abre el navegador para autorizar el permiso de
// Calendar y guarda el GOOGLE_REFRESH_TOKEN en .env.local.
import { createServer } from "node:http"
import { readFileSync, writeFileSync } from "node:fs"
import { exec } from "node:child_process"

const ARCHIVO_ENV = ".env.local"
const PUERTO = 53682
const REDIRECCION = `http://localhost:${PUERTO}`
const PERMISO = "https://www.googleapis.com/auth/calendar.events"

const env = readFileSync(ARCHIVO_ENV, "utf8")
const valor = (nombre) => env.match(new RegExp(`^${nombre}=(.*)$`, "m"))?.[1]?.trim()
const clientId = valor("GOOGLE_CLIENT_ID")
const clientSecret = valor("GOOGLE_CLIENT_SECRET")
if (!clientId || !clientSecret) {
  console.error(`Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en ${ARCHIVO_ENV}.`)
  process.exit(1)
}

const urlAutorizacion =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECCION,
    response_type: "code",
    scope: PERMISO,
    access_type: "offline",
    prompt: "consent",
  })

function guardarToken(token) {
  const actual = readFileSync(ARCHIVO_ENV, "utf8")
  const linea = `GOOGLE_REFRESH_TOKEN=${token}`
  const nuevo = /^#?\s*GOOGLE_REFRESH_TOKEN=.*$/m.test(actual)
    ? actual.replace(/^#?\s*GOOGLE_REFRESH_TOKEN=.*$/m, linea)
    : `${actual.trimEnd()}\n${linea}\n`
  writeFileSync(ARCHIVO_ENV, nuevo)
}

const servidor = createServer(async (pedido, respuesta) => {
  const url = new URL(pedido.url, REDIRECCION)
  const codigo = url.searchParams.get("code")
  if (!codigo) {
    respuesta.end("No llegó la autorización de Google. Cerrá esta pestaña y volvé a correr el script.")
    return
  }
  const intercambio = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECCION,
      grant_type: "authorization_code",
    }),
  })
  const datos = await intercambio.json()
  respuesta.setHeader("Content-Type", "text/plain; charset=utf-8")
  if (!datos.refresh_token) {
    console.error("Google no devolvió el token:", datos.error_description || datos.error || datos)
    respuesta.end("No se pudo conectar. Mirá el mensaje en la terminal.")
  } else {
    guardarToken(datos.refresh_token)
    console.log(`Listo: MemoPsy quedó conectado a Google Meet. Se guardó GOOGLE_REFRESH_TOKEN en ${ARCHIVO_ENV}.`)
    console.log("Reiniciá el servidor (npm run dev) para que tome el cambio.")
    respuesta.end("¡Listo! MemoPsy quedó conectado a Google Meet. Ya podés cerrar esta pestaña.")
  }
  servidor.close()
})

servidor.listen(PUERTO, () => {
  console.log("Se abre el navegador para autorizar a MemoPsy en tu cuenta de Google...")
  console.log(`Si no se abre, copiá este enlace en el navegador:\n${urlAutorizacion}\n`)
  exec(`start "" "${urlAutorizacion}"`)
})
