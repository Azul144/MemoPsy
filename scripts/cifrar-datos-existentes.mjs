// RNF Seguridad - Cifra los datos clínicos que se guardaron antes de activar el cifrado.
// Usa la misma clave y el mismo formato que src/lib/auth/cifrado.ts ("iv:etiqueta:cifrado").
// Lo que ya está cifrado se saltea, así que es seguro correrlo más de una vez.
//   node --env-file=.env.local scripts/cifrar-datos-existentes.mjs
import { createCipheriv, randomBytes } from "node:crypto"
import mysql from "mysql2/promise"

const COLUMNAS = [
  ["informe", "contenido"],
  ["informe_seguimiento", "resumen"],
  ["informe_seguimiento", "pautas"],
  ["informe_seguimiento", "avances"],
  ["actividad_seguimiento", "descripcion"],
  ["actividad_seguimiento", "comentario"],
]

const FORMATO_CIFRADO = /^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22}==:[A-Za-z0-9+/]*={0,2}$/

const clave = Buffer.from(process.env.DATOS_ENCRYPTION_KEY ?? "", "base64")
if (clave.length !== 32) {
  console.error("Falta DATOS_ENCRYPTION_KEY (32 bytes en base64) en .env.local")
  process.exit(1)
}

function cifrar(texto) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", clave, iv)
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), cifrado].map((parte) => parte.toString("base64")).join(":")
}

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
})

try {
  await conexion.beginTransaction()
  for (const [tabla, columna] of COLUMNAS) {
    const [filas] = await conexion.query(`SELECT id, \`${columna}\` AS valor FROM \`${tabla}\` WHERE \`${columna}\` IS NOT NULL`)
    let cifradas = 0
    for (const { id, valor } of filas) {
      if (FORMATO_CIFRADO.test(valor)) continue
      await conexion.query(`UPDATE \`${tabla}\` SET \`${columna}\` = ? WHERE id = ?`, [cifrar(valor), id])
      cifradas++
    }
    console.log(`${tabla}.${columna}: ${cifradas} cifradas de ${filas.length}`)
  }
  await conexion.commit()
} catch (error) {
  await conexion.rollback()
  console.error("No se cifró nada, hubo un error:", error.message)
  process.exitCode = 1
} finally {
  await conexion.end()
}
