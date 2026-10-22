// Carga datos de demostración FICTICIOS en una base vacía (por ejemplo, la de Docker):
// una psicóloga, una recepcionista, un auditor, tres pacientes, turnos, notas clínicas e
// informe de seguimiento. Sirve para mostrar el sistema y sacar capturas sin datos reales.
// Las contraseñas se generan al azar y se guardan en el archivo indicado (no se suben a git).
//   docker compose exec app node scripts/cargar-demo.mjs /tmp/credenciales-demo.txt
import { createCipheriv, randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"
import bcrypt from "bcrypt"
import mysql from "mysql2/promise"

const salida = process.argv[2]
if (!salida) {
  console.error("Uso: node scripts/cargar-demo.mjs <archivo-de-credenciales>")
  process.exit(1)
}

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

// Contraseña al azar que cumple la política (mayúscula, minúscula, número y símbolo)
const contrasena = () => `Demo-${randomBytes(6).toString("base64url")}#7a`

// Fechas en hora local del consultorio (el contenedor corre con TZ de Argentina)
const dos = (n) => String(n).padStart(2, "0")
const formato = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:00`
// Día hábil a "dias" de hoy (si cae sábado o domingo, se corre al lunes / viernes)
function diaHabil(dias, hora, minutos = 0) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  if (d.getDay() === 6) d.setDate(d.getDate() + (dias >= 0 ? 2 : -1))
  if (d.getDay() === 0) d.setDate(d.getDate() + (dias >= 0 ? 1 : -2))
  d.setHours(hora, minutos, 0, 0)
  return d
}
const masMinutos = (d, m) => new Date(d.getTime() + m * 60000)

const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
})

const id = async (sql, valores) => (await c.query(sql, valores))[0].insertId
const perfilId = async (nombre) => (await c.query("SELECT id FROM perfil WHERE nombre = ?", [nombre]))[0][0].id
const estadoId = async (nombre) => (await c.query("SELECT id FROM estado WHERE nombre = ?", [nombre]))[0][0].id
const modalidadId = async (nombre) => (await c.query("SELECT id FROM modalidad WHERE nombre = ?", [nombre]))[0][0].id
const obraSocialId = async (nombre) => (await c.query("SELECT id FROM obra_social WHERE nombre = ?", [nombre]))[0][0].id

const credenciales = []
async function crearCuenta(nombre, apellido, dni, nacimiento, email, perfil) {
  const personaId = await id("INSERT INTO persona (nombre, apellido, dni, fecha_nacimiento) VALUES (?, ?, ?, ?)", [nombre, apellido, dni, nacimiento])
  const password = contrasena()
  const usuarioId = await id("INSERT INTO usuario (persona_id, email, password, activo, ultimo_acceso) VALUES (?, ?, ?, 1, NOW())", [personaId, email, await bcrypt.hash(password, 12)])
  await c.query("INSERT INTO usuario_tiene_perfil (usuario_id, perfil_id) VALUES (?, ?)", [usuarioId, await perfilId(perfil)])
  credenciales.push(`${perfil}: ${email} / ${password}`)
  return { personaId, usuarioId }
}

const [[existe]] = await c.query("SELECT COUNT(*) AS n FROM usuario WHERE email LIKE '%@demo.memopsy.test'")
if (existe.n > 0) {
  console.error("Los datos de demostración ya están cargados.")
  process.exit(1)
}

try {
  await c.beginTransaction()

  // --- Cuentas
  const psicologa = await crearCuenta("Laura", "Benítez", "30111222", "1985-04-12", "laura.benitez@demo.memopsy.test", "Psicólogo")
  const psicologoId = await id("INSERT INTO psicologo (persona_id, especialidad, numero_licencia) VALUES (?, ?, ?)", [psicologa.personaId, "Psicología clínica", "MP 1234"])
  const recepcion = await crearCuenta("Marta", "Giménez", "28444555", "1980-09-03", "recepcion@demo.memopsy.test", "Recepcionista")
  await crearCuenta("Jorge", "Acosta", "25666777", "1976-01-20", "auditor@demo.memopsy.test", "Auditor")

  const pacientes = []
  for (const [nombre, apellido, dni, nacimiento, email, obra] of [
    ["Camila", "Ruiz", "40123456", "1997-06-15", "camila.ruiz@demo.memopsy.test", "IASEP"],
    ["Tomás", "Fernández", "38987654", "1994-11-02", "tomas.fernandez@demo.memopsy.test", "Particular"],
    ["Valentina", "Sosa", "42555888", "2000-03-28", "valentina.sosa@demo.memopsy.test", "OSDE"],
  ]) {
    const cuenta = await crearCuenta(nombre, apellido, dni, nacimiento, email, "Paciente")
    const pacienteId = await id("INSERT INTO paciente (persona_id, obra_social_id) VALUES (?, ?)", [cuenta.personaId, await obraSocialId(obra)])
    pacientes.push({ ...cuenta, pacienteId, nombre: `${nombre} ${apellido}` })
  }
  const [camila, tomas, valentina] = pacientes

  // --- Franjas en las que la psicóloga acepta reprogramaciones (lunes a viernes)
  for (let dia = 1; dia <= 5; dia++) {
    await c.query("INSERT INTO horario_disponible (psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, '09:00', '12:00'), (?, ?, '16:00', '19:00')", [psicologoId, dia, psicologoId, dia])
  }

  // --- Turnos
  const presencial = await modalidadId("Presencial")
  const remota = await modalidadId("Remota")
  async function turno(paciente, inicio, minutos, estado, modalidad, pago = {}) {
    const sesionId = await id(
      "INSERT INTO sesion (psicologo_id, fecha_hora_inicio, fecha_hora_fin, modalidad_id, estado_id, enlace_videollamada, estado_pago, medio_de_pago_id, monto, fecha_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [psicologoId, formato(inicio), formato(masMinutos(inicio, minutos)), modalidad, await estadoId(estado),
        modalidad === remota ? "https://meet.google.com/abc-defg-hij" : null,
        pago.estado ?? "Pendiente", pago.medio ?? null, pago.monto ?? null, pago.estado === "Pagado" ? formato(inicio) : null],
    )
    await c.query("INSERT INTO paciente_tiene_sesion (sesion_id, paciente_id) VALUES (?, ?)", [sesionId, paciente.pacienteId])
    return sesionId
  }
  const pagado = (medio, monto) => ({ estado: "Pagado", medio, monto })
  await turno(camila, diaHabil(-14, 10), 50, "Finalizada", presencial, pagado(3, 18000))
  await turno(tomas, diaHabil(-13, 17), 50, "Finalizada", presencial, pagado(1, 20000))
  await turno(camila, diaHabil(-7, 10), 50, "Finalizada", presencial, pagado(3, 18000))
  await turno(valentina, diaHabil(-6, 11), 50, "Finalizada", remota, pagado(2, 20000))
  await turno(tomas, diaHabil(-1, 17), 50, "Cancelada", presencial)
  await turno(camila, diaHabil(0, 16), 50, "Confirmada", presencial)
  await turno(valentina, diaHabil(1, 11), 50, "Confirmada", remota)
  const turnoReprogramado = await turno(tomas, diaHabil(2, 18), 50, "Reprogramada", presencial)
  await turno(camila, diaHabil(7, 10), 50, "Pendiente", presencial)
  await turno(valentina, diaHabil(8, 11), 50, "Pendiente", remota)

  // --- Notas clínicas (contenido cifrado, como lo guarda el sistema)
  async function nota(paciente, titulo, contenido, etiquetas, fecha) {
    const informeId = await id("INSERT INTO informe (psicologo_id, titulo, contenido, etiquetas, fecha_creacion, es_privado) VALUES (?, ?, ?, ?, ?, 1)", [psicologoId, titulo, cifrar(contenido), etiquetas, formato(fecha)])
    await c.query("INSERT INTO paciente_tiene_informe (informe_id, paciente_id) VALUES (?, ?)", [informeId, paciente.pacienteId])
    return informeId
  }
  await nota(camila, "Primera entrevista - Camila Ruiz",
    "S: Consulta por ansiedad ligada al trabajo. Refiere dificultad para dormir y preocupación constante por los plazos.\nO: Se presenta puntual, colaboradora, con discurso coherente. Se la observa inquieta al hablar de su jefe.\nA: Cuadro compatible con ansiedad reactiva a estrés laboral. Sin indicadores de riesgo.\nP: Psicoeducación sobre ansiedad. Registro semanal de situaciones que la disparan.",
    "ansiedad, primera entrevista", diaHabil(-14, 11))
  const notaSeguimiento = await nota(camila, "Sesión 2 - Camila Ruiz",
    "S: Trae el registro completo. Identifica que la ansiedad aparece sobre todo los domingos a la noche.\nO: Más tranquila que en la primera entrevista. Se ríe al contar una situación del trabajo.\nA: Buena adherencia. Comienza a reconocer pensamientos anticipatorios.\nP: Técnica de respiración 4-7-8. Pautas de higiene del sueño. Continuar con el registro.",
    "ansiedad, seguimiento, sueño", diaHabil(-7, 11))
  await nota(tomas, "Primera entrevista - Tomás Fernández",
    "S: Consulta tras una separación reciente. Refiere tristeza, desgano y aislamiento de sus amigos.\nO: Afecto aplanado, habla en voz baja. Mantiene sus rutinas laborales.\nA: Duelo por ruptura de pareja. Se descarta riesgo actual.\nP: Activación conductual: retomar una actividad social por semana.",
    "duelo, primera entrevista", diaHabil(-13, 18))
  await nota(valentina, "Sesión remota - Valentina Sosa",
    "S: Estudiante universitaria. Consulta por bloqueo ante los exámenes finales.\nO: Sesión por videollamada sin inconvenientes de conexión. Se muestra autoexigente.\nA: Ansiedad de evaluación con perfeccionismo.\nP: Planificación de estudio por bloques y ensayo de examen oral.",
    "ansiedad, estudios", diaHabil(-6, 12))

  // --- Informe de seguimiento compartido con Camila, con una actividad respondida
  const seguimientoId = await id("INSERT INTO informe_seguimiento (informe_id, resumen, pautas, avances) VALUES (?, ?, ?, ?)", [notaSeguimiento,
    cifrar("Hoy hablamos de cómo te sentiste en el trabajo esta semana y de los momentos en que apareció la ansiedad. Practicamos juntas una técnica de respiración para usar cuando sientas que te desbordás."),
    cifrar("Evitá el celular la última hora antes de dormir. Si te despertás con ansiedad, usá la respiración antes de levantarte. No hace falta que hagas todo perfecto: lo importante es intentarlo."),
    cifrar("Pudiste identificar en qué situaciones aparece la ansiedad, y eso es un gran paso. Se nota tu compromiso con el proceso.")])
  const actividades = [
    ["Practicar la respiración 4-7-8 antes de dormir, al menos 4 noches.", "HECHA", "La hice 5 noches. Me cuesta menos dormirme."],
    ["Anotar cuándo aparece la ansiedad, qué estabas haciendo y qué pensaste.", null, null],
    ["Salir a caminar 20 minutos dos veces en la semana.", "NO_PUDE", "Llovió casi toda la semana."],
  ]
  for (const [orden, [descripcion, respuesta, comentario]] of actividades.entries()) {
    await c.query("INSERT INTO actividad_seguimiento (seguimiento_id, descripcion, orden, respuesta, comentario, fecha_respuesta) VALUES (?, ?, ?, ?, ?, ?)",
      [seguimientoId, cifrar(descripcion), orden, respuesta, comentario ? cifrar(comentario) : null, respuesta ? formato(diaHabil(-3, 21)) : null])
  }

  // --- Avisos en la campanita
  const aviso = (usuarioId, sesionId, tipo, titulo, mensaje) =>
    c.query("INSERT INTO notificacion (usuario_id, sesion_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)", [usuarioId, sesionId, tipo, titulo, mensaje])
  await aviso(psicologa.usuarioId, turnoReprogramado, "REPROGRAMACION", "Turno reprogramado", "Tomás Fernández movió su turno a un horario de tus franjas disponibles.")
  await aviso(psicologa.usuarioId, null, "RESPUESTA_ACTIVIDAD", "Respuesta a una actividad", 'Camila Ruiz marcó "Practicar la respiración 4-7-8..." como hecha y dejó un comentario.')
  await aviso(recepcion.usuarioId, turnoReprogramado, "REPROGRAMACION", "Turno reprogramado", "Tomás Fernández reprogramó su turno con Laura Benítez.")
  await aviso(camila.usuarioId, null, "SEGUIMIENTO", "Nuevo informe de seguimiento", "Laura Benítez compartió con vos el informe de tu última sesión.")

  // Primero las credenciales: si no se pueden guardar, no se confirma nada
  writeFileSync(salida, `Cuentas de demostración (datos ficticios)\n${credenciales.join("\n")}\n`)
  await c.commit()
  console.log(`Datos de demostración cargados: ${credenciales.length} cuentas. Credenciales en ${salida}`)
} catch (error) {
  await c.rollback()
  console.error("No se cargó nada:", error.message)
  process.exitCode = 1
} finally {
  await c.end()
}
