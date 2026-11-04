// Crea las tablas y los catálogos en una base vacía que no arma Docker (por ejemplo, una base en la nube).
// Usa los mismos archivos que el contenedor de MySQL. Si la base ya tiene tablas, no toca nada.
//   node --env-file=.env.render scripts/cargar-esquema.mjs
import { readFileSync } from "node:fs"
import mysql from "mysql2/promise"

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
  multipleStatements: true,
})

try {
  const [[{ tablas }]] = await conexion.query("SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema = DATABASE()")
  if (tablas > 0) throw new Error(`la base ya tiene ${tablas} tablas`)

  for (const archivo of ["01-esquema.sql", "02-catalogos.sql"]) {
    await conexion.query(readFileSync(new URL(`../docker/mysql/${archivo}`, import.meta.url), "utf8"))
    console.log(`${archivo} cargado.`)
  }
} catch (error) {
  console.error("No se cargó el esquema:", error.message)
  process.exitCode = 1
} finally {
  await conexion.end()
}
