// Crea el primer usuario Administrador en una base nueva (por ejemplo, la del contenedor de Docker).
// La contraseña no queda guardada en ningún archivo: se pasa al correr el script.
//   docker compose exec app node scripts/crear-admin.mjs <email> <contraseña> <nombre> <apellido> <dni>
import bcrypt from "bcrypt"
import mysql from "mysql2/promise"

const [email, password, nombre, apellido, dni] = process.argv.slice(2)
if (!email || !password || !nombre || !apellido || !dni) {
  console.error("Uso: node scripts/crear-admin.mjs <email> <contraseña> <nombre> <apellido> <dni>")
  process.exit(1)
}

// Misma política de contraseñas que el sistema (src/lib/validaciones/password.ts, RNF02)
const politica = [/.{10,}/, /[A-ZÁÉÍÓÚÑ]/, /[a-záéíóúñ]/, /\d/, /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/]
const parteDelEmail = email.split("@")[0].toLowerCase()
const contieneEmail = parteDelEmail.length >= 3 && password.toLowerCase().includes(parteDelEmail)
if (!politica.every((regla) => regla.test(password)) || contieneEmail) {
  console.error("La contraseña necesita 10 caracteres o más, mayúscula, minúscula, número y símbolo, y no puede contener el correo.")
  process.exit(1)
}

const conexion = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
})

try {
  const [[perfil]] = await conexion.query("SELECT id_perfil AS id FROM perfil WHERE nombre = 'Administrador'")
  if (!perfil) throw new Error("No existe el perfil Administrador: falta cargar docker/mysql/02-catalogos.sql")

  await conexion.beginTransaction()
  const [persona] = await conexion.query("INSERT INTO persona (nombre, apellido, dni, fecha_nacimiento) VALUES (?, ?, ?, CURDATE())", [nombre, apellido, dni])
  const [usuario] = await conexion.query(
    "INSERT INTO usuario (email, password, activo, ultimo_acceso, id_persona) VALUES (?, ?, 1, NOW(), ?)",
    [email, await bcrypt.hash(password, 12), persona.insertId],
  )
  await conexion.query("INSERT INTO usuario_tiene_perfil (id_usuario, id_perfil) VALUES (?, ?)", [usuario.insertId, perfil.id])
  await conexion.commit()
  console.log(`Administrador ${email} creado.`)
} catch (error) {
  await conexion.rollback()
  console.error("No se creó el administrador:", error.message)
  process.exitCode = 1
} finally {
  await conexion.end()
}
