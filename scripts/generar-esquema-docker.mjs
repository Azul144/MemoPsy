// Genera los scripts con los que el contenedor de MySQL arma la base la primera vez que arranca:
//   docker/mysql/01-esquema.sql    estructura de todas las tablas
//   docker/mysql/02-catalogos.sql  datos de los catálogos (estados, modalidades, obras sociales,
//                                  perfiles y permisos). No copia personas, usuarios, turnos ni notas.
// Se corre contra la base de desarrollo cada vez que cambia el modelo de datos:
//   node --env-file=.env.local scripts/generar-esquema-docker.mjs
import { mkdirSync, writeFileSync } from "node:fs"
import mysql from "mysql2/promise"

const CATALOGOS = ["accion", "estado", "medio_de_pago", "modalidad", "modulo", "obra_social", "perfil", "permiso", "perfil_tiene_permiso"]

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
})

const ENCABEZADO = "-- Generado por scripts/generar-esquema-docker.mjs. No editar a mano.\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n"
const PIE = "\nSET FOREIGN_KEY_CHECKS = 1;\n"

const [tablas] = await conexion.query("SELECT TABLE_NAME AS nombre FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")

let esquema = ENCABEZADO
for (const { nombre } of tablas) {
  const [[fila]] = await conexion.query(`SHOW CREATE TABLE \`${nombre}\``)
  // Sin el contador de AUTO_INCREMENT de desarrollo: la base nueva arranca de 1
  esquema += `${fila["Create Table"].replace(/ AUTO_INCREMENT=\d+/, "")};\n\n`
}

let catalogos = ENCABEZADO
for (const tabla of CATALOGOS) {
  const [filas] = await conexion.query(`SELECT * FROM \`${tabla}\``)
  if (filas.length === 0) continue
  const columnas = Object.keys(filas[0]).map((c) => `\`${c}\``).join(", ")
  const valores = filas.map((f) => `(${Object.values(f).map((v) => conexion.escape(v)).join(", ")})`).join(",\n")
  catalogos += `INSERT INTO \`${tabla}\` (${columnas}) VALUES\n${valores};\n\n`
}

await conexion.end()

mkdirSync("docker/mysql", { recursive: true })
writeFileSync("docker/mysql/01-esquema.sql", esquema + PIE)
writeFileSync("docker/mysql/02-catalogos.sql", catalogos + PIE)
console.log(`${tablas.length} tablas y ${CATALOGOS.length} catálogos exportados a docker/mysql/`)
