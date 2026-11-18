// Carga fotos de perfil de referencia en las cuentas de demostración (@memopsy.test y @demo.memopsy.test).
// Las fotos salen de las imágenes de la landing (public/assets): se recorta la cara, se achica a 256 px
// y se guarda cifrada igual que la sube el sistema (AES-256-GCM con DATOS_ENCRYPTION_KEY).
// Algunas cuentas quedan sin foto a propósito, para mostrar las iniciales.
//   node --env-file=.env.local scripts/cargar-fotos-demo.mjs            carga las fotos
//   node --env-file=.env.local scripts/cargar-fotos-demo.mjs --muestra  solo arma una hoja para revisar los recortes
import { createCipheriv, randomBytes } from "node:crypto"
import mysql from "mysql2/promise"
import sharp from "sharp"

// [archivo, centro x, centro y, lado] en fracciones del ancho (x, lado) y del alto (y) de la imagen
const FOTOS = {
  "psicologa@memopsy.test": ["portada.jpg", 0.58, 0.36, 0.3],
  "lucia.ferreyra@demo.memopsy.test": ["users/1.jpg", 0.5, 0.42, 0.9],
  "diego.martinez@demo.memopsy.test": ["users/2.jpg", 0.5, 0.42, 0.9],
  "natalia.correa@demo.memopsy.test": ["consultorio.jpg", 0.355, 0.36, 0.24],
  "pablo.sanchez@demo.memopsy.test": ["users/8.jpg", 0.5, 0.4, 0.9],
  "recepcion@memopsy.test": ["recepcion1.jpg", 0.26, 0.3, 0.2],
  "admin@memopsy.test": ["consultorio2.jpg", 0.55, 0.32, 0.36],
  "auditor@memopsy.test": ["reunion2.jpg", 0.62, 0.26, 0.3],
  "camila.ruiz@demo.memopsy.test": ["users/7.jpg", 0.5, 0.35, 0.8],
  "valentina.sosa@demo.memopsy.test": ["terapia.jpg", 0.235, 0.36, 0.2],
  "tomas.fernandez@demo.memopsy.test": ["users/6.jpg", 0.5, 0.42, 0.9],
  "hector.ramirez@demo.memopsy.test": ["users/4.jpg", 0.5, 0.4, 0.9],
  "nicolas.rios@demo.memopsy.test": ["users/3.jpg", 0.5, 0.42, 0.9],
}

async function recortar([archivo, cx, cy, lado]) {
  const ruta = `public/assets/${archivo}`
  const { width, height } = await sharp(ruta).metadata()
  const l = Math.min(Math.round(lado * width), width, height)
  const left = Math.max(0, Math.min(width - l, Math.round(cx * width - l / 2)))
  const top = Math.max(0, Math.min(height - l, Math.round(cy * height - l / 2)))
  return sharp(ruta).extract({ left, top, width: l, height: l }).resize(256, 256).jpeg({ quality: 88 }).toBuffer()
}

function cifrarBytes(datos) {
  const clave = Buffer.from(process.env.DATOS_ENCRYPTION_KEY ?? "", "base64")
  if (clave.length !== 32) throw new Error("Falta DATOS_ENCRYPTION_KEY (32 bytes) en el entorno")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", clave, iv)
  const cifrado = Buffer.concat([cipher.update(datos), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), cifrado])
}

const recortes = Object.fromEntries(await Promise.all(Object.entries(FOTOS).map(async ([email, f]) => [email, await recortar(f)])))

if (process.argv.includes("--muestra")) {
  const lista = Object.values(recortes)
  const hoja = await sharp({ create: { width: 7 * 132, height: 2 * 132, channels: 3, background: "#ffffff" } })
    .composite(await Promise.all(lista.map(async (b, i) => ({
      input: await sharp(b).resize(128, 128).toBuffer(), left: (i % 7) * 132, top: Math.floor(i / 7) * 132,
    }))))
    .png()
    .toFile(process.argv[process.argv.indexOf("--muestra") + 1] || "fotos-demo.png")
  console.log("Hoja de muestra generada", hoja.width, hoja.height)
  process.exit(0)
}

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
  ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true, ...(process.env.DB_CA ? { ca: process.env.DB_CA } : {}) } } : {}),
})
let cargadas = 0
for (const [email, foto] of Object.entries(recortes)) {
  const [r] = await conexion.query(
    "UPDATE persona p JOIN usuario u ON u.id_persona = p.id_persona SET p.foto = ?, p.foto_actualizada = NOW() WHERE u.email = ?",
    [cifrarBytes(foto), email],
  )
  if (r.affectedRows) cargadas++
  else console.log("No existe la cuenta", email)
}
await conexion.end()
console.log(`Fotos de perfil cargadas: ${cargadas}`)
