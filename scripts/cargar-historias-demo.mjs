// Agrega las historias clínicas de demostración (datos FICTICIOS) a una base que ya tiene la demo cargada.
// No toca las historias que ya existan. Antes, correr scripts/migracion-historia-clinica.sql.
//   node --env-file=.env.local scripts/cargar-historias-demo.mjs
//   docker compose exec app node scripts/cargar-historias-demo.mjs
import { createCipheriv, randomBytes } from "node:crypto"
import mysql from "mysql2/promise"
import { insertarHistoriasDemo } from "./historias-demo.mjs"

const clave = Buffer.from(process.env.DATOS_ENCRYPTION_KEY ?? "", "base64")
if (clave.length !== 32) {
  console.error("Falta DATOS_ENCRYPTION_KEY")
  process.exit(1)
}
// Mismo formato que src/lib/auth/cifrado.ts
function cifrar(texto) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", clave, iv)
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), cifrado].map((p) => p.toString("base64")).join(":")
}

const c = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
})
try {
  const cargadas = await insertarHistoriasDemo(c, cifrar)
  console.log(`Historias clínicas de demostración cargadas: ${cargadas}`)
} catch (error) {
  console.error("No se cargaron las historias:", error.message)
  process.exitCode = 1
} finally {
  await c.end()
}
