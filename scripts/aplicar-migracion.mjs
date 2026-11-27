// scripts/aplicar-migracion.mjs
// Ejecuta un archivo .sql de scripts/migraciones contra la base indicada por las variables de entorno.
// Uso:
//   node --env-file=.env.local scripts/aplicar-migracion.mjs scripts/migraciones/migracion-horario-pactado.sql
//   node --env-file=.env.render scripts/aplicar-migracion.mjs scripts/migraciones/migracion-horario-pactado.sql
// Las migraciones del proyecto son idempotentes: se pueden correr más de una vez.
import { readFileSync } from "node:fs"
import mysql from "mysql2/promise"

const archivo = process.argv[2]
if (!archivo) {
  console.error("Uso: node --env-file=<archivo .env> scripts/aplicar-migracion.mjs <migracion.sql>")
  process.exit(1)
}

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
  // Aiven pide TLS con su certificado (DB_SSL_CA en base64, igual que src/lib/database.ts)
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
  multipleStatements: true,
})

try {
  await conexion.query(readFileSync(archivo, "utf8"))
  const [tablas] = await conexion.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()")
  console.log(`Migración aplicada en ${process.env.DB_HOST || "localhost"}/${process.env.DB_DATABASE || "psicologia_db"}: ${tablas[0].n} tablas.`)
} finally {
  await conexion.end()
}
