// Carga datos de demostración FICTICIOS: cinco psicólogos de distintas especialidades, sus
// pacientes (adultos, adolescentes, un niño y una pareja), turnos pasados y futuros con pagos,
// notas clínicas, informes de seguimiento con actividades, avisos y registros de auditoría.
// Sirve para mostrar el sistema y sacar capturas sin datos reales.
//  - Si ya existe la cuenta psicologa@memopsy.test, se usa como la psicóloga clínica y se le
//    asignan los pacientes que ya estaban cargados (así las cuentas de prueba también ven datos).
//  - Si ya hay una recepcionista o un auditor, no se crea otro.
// Las cuentas nuevas usan el dominio demo.memopsy.test (.test no existe: nunca reciben emails).
// Las contraseñas se generan al azar y se guardan en el archivo indicado (no se suben a git).
//   node --env-file=.env.local scripts/cargar-demo.mjs <archivo-de-credenciales>
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
const uno = async (sql, valores) => (await c.query(sql, valores))[0][0]
const perfilId = async (nombre) => (await uno("SELECT id FROM perfil WHERE nombre = ?", [nombre])).id
const estadoId = async (nombre) => (await uno("SELECT id FROM estado WHERE nombre = ?", [nombre])).id
const modalidadId = async (nombre) => (await uno("SELECT id FROM modalidad WHERE nombre = ?", [nombre])).id
const obraSocialId = async (nombre) => (await uno("SELECT id FROM obra_social WHERE nombre = ?", [nombre])).id
const medioId = async (descripcion) => (await uno("SELECT id FROM medio_de_pago WHERE descripcion = ?", [descripcion])).id

const credenciales = []
async function crearPersona(nombre, apellido, dni, nacimiento) {
  return id("INSERT INTO persona (nombre, apellido, dni, fecha_nacimiento) VALUES (?, ?, ?, ?)", [nombre, apellido, dni, nacimiento])
}
async function crearCuenta(personaId, email, perfil) {
  const password = contrasena()
  const usuarioId = await id("INSERT INTO usuario (persona_id, email, password, activo, ultimo_acceso) VALUES (?, ?, ?, 1, NOW())", [personaId, email, await bcrypt.hash(password, 12)])
  await c.query("INSERT INTO usuario_tiene_perfil (usuario_id, perfil_id) VALUES (?, ?)", [usuarioId, await perfilId(perfil)])
  credenciales.push(`${perfil.padEnd(14)} ${email} / ${password}`)
  return usuarioId
}
async function existeCuentaConPerfil(perfil) {
  return Boolean(await uno("SELECT 1 FROM usuario u JOIN usuario_tiene_perfil up ON up.usuario_id = u.id JOIN perfil p ON p.id = up.perfil_id WHERE p.nombre = ? AND u.activo = 1 LIMIT 1", [perfil]))
}

const [[existe]] = await c.query("SELECT COUNT(*) AS n FROM usuario WHERE email LIKE '%@demo.memopsy.test'")
if (existe.n > 0) {
  console.error("Los datos de demostración ya están cargados.")
  process.exit(1)
}

// ---------------------------------------------------------------- Datos
const PSICOLOGOS = [
  { clave: "clinica", nombre: "Carla", apellido: "Benítez", dni: "29444111", nacimiento: "1984-05-20", email: "carla.benitez@demo.memopsy.test",
    especialidad: "Psicología clínica", licencia: "MP 1234", existente: "psicologa@memopsy.test",
    franjas: [["09:00", "12:00"], ["16:00", "19:00"]] },
  { clave: "infanto", nombre: "Lucía", apellido: "Ferreyra", dni: "31222333", nacimiento: "1988-02-11", email: "lucia.ferreyra@demo.memopsy.test",
    especialidad: "Psicología infanto-juvenil", licencia: "MP 2045", franjas: [["14:00", "19:00"]] },
  { clave: "neuro", nombre: "Diego", apellido: "Martínez", dni: "27555666", nacimiento: "1979-09-30", email: "diego.martinez@demo.memopsy.test",
    especialidad: "Neuropsicología", licencia: "MP 1987", franjas: [["08:00", "13:00"]] },
  { clave: "pareja", nombre: "Natalia", apellido: "Correa", dni: "32777888", nacimiento: "1987-12-03", email: "natalia.correa@demo.memopsy.test",
    especialidad: "Terapia de pareja y familia", licencia: "MP 2210", franjas: [["17:00", "21:00"]] },
  { clave: "tcc", nombre: "Pablo", apellido: "Sánchez", dni: "30888999", nacimiento: "1983-07-14", email: "pablo.sanchez@demo.memopsy.test",
    especialidad: "Terapia cognitivo-conductual", licencia: "MP 1876", franjas: [["10:00", "13:00"], ["15:00", "18:00"]] },
]

// cuenta: false = sin usuario (por ejemplo, un niño: los turnos los maneja la recepción con la familia)
const PACIENTES = [
  { clave: "camila", psicologo: "clinica", nombre: "Camila", apellido: "Ruiz", dni: "40123456", nacimiento: "1997-06-15", obra: "IASEP" },
  { clave: "valentina", psicologo: "clinica", nombre: "Valentina", apellido: "Sosa", dni: "42555888", nacimiento: "2000-03-28", obra: "OSDE" },
  { clave: "julieta", psicologo: "infanto", nombre: "Julieta", apellido: "Paredes", dni: "48111222", nacimiento: "2010-08-09", obra: "Swiss Medical" },
  { clave: "mateo", psicologo: "infanto", nombre: "Mateo", apellido: "Gómez", dni: "53444555", nacimiento: "2017-04-22", obra: "IASEP", cuenta: false },
  { clave: "rosa", psicologo: "neuro", nombre: "Rosa", apellido: "Villalba", dni: "11222333", nacimiento: "1957-01-17", obra: "PAMI" },
  { clave: "hector", psicologo: "neuro", nombre: "Héctor", apellido: "Ramírez", dni: "16777888", nacimiento: "1970-10-05", obra: "OSECAC" },
  { clave: "ezequiel", psicologo: "pareja", nombre: "Ezequiel", apellido: "Núñez", dni: "35111444", nacimiento: "1990-02-25", obra: "Particular" },
  { clave: "florencia", psicologo: "pareja", nombre: "Florencia", apellido: "Duarte", dni: "36222555", nacimiento: "1991-11-12", obra: "Particular" },
  { clave: "tomas", psicologo: "tcc", nombre: "Tomás", apellido: "Fernández", dni: "38987654", nacimiento: "1994-11-02", obra: "Galeno" },
  { clave: "agustina", psicologo: "tcc", nombre: "Agustina", apellido: "Morales", dni: "41333777", nacimiento: "1998-05-19", obra: "Sancor Salud" },
  { clave: "nicolas", psicologo: "tcc", nombre: "Nicolás", apellido: "Ríos", dni: "39666111", nacimiento: "1995-09-08", obra: "OSPE" },
]

// [paciente(s), días desde hoy, hora, estado, modalidad, pago?]
// pago: [medio, monto] para los turnos ya cobrados
const TURNOS = [
  // Psicología clínica
  [["camila"], -21, 10, "Finalizada", "Presencial", ["Obra social", 18000]],
  [["camila"], -14, 10, "Finalizada", "Presencial", ["Obra social", 18000]],
  [["camila"], -7, 10, "Finalizada", "Presencial", ["Obra social", 18000]],
  [["valentina"], -12, 11, "Finalizada", "Remota", ["QR del psicólogo", 22000]],
  [["valentina"], -5, 11, "Finalizada", "Remota", ["QR del psicólogo", 22000]],
  [["valentina"], -1, 17, "Cancelada", "Remota"],
  [["camila"], 3, 10, "Confirmada", "Presencial"],
  [["valentina"], 4, 11, "Pendiente", "Remota"],
  // Infanto-juvenil
  [["julieta"], -15, 15, "Finalizada", "Presencial", ["Obra social", 20000]],
  [["julieta"], -8, 15, "Finalizada", "Presencial", ["Obra social", 20000]],
  [["mateo"], -9, 16, "Finalizada", "Presencial", ["Obra social", 20000]],
  [["mateo"], -2, 16, "Finalizada", "Presencial"],
  [["julieta"], 2, 15, "Confirmada", "Presencial"],
  [["mateo"], 5, 16, "Pendiente", "Presencial"],
  // Neuropsicología
  [["rosa"], -20, 9, "Finalizada", "Presencial", ["Obra social", 25000]],
  [["rosa"], -13, 9, "Finalizada", "Presencial", ["Obra social", 25000]],
  [["hector"], -10, 11, "Finalizada", "Presencial", ["Efectivo", 25000]],
  [["hector"], -3, 11, "Cancelada", "Presencial"],
  [["rosa"], 6, 9, "Confirmada", "Presencial"],
  [["hector"], 7, 11, "Reprogramada", "Presencial"],
  // Pareja y familia: los dos pacientes en el mismo turno
  [["ezequiel", "florencia"], -16, 19, "Finalizada", "Presencial", ["Efectivo", 30000]],
  [["ezequiel", "florencia"], -9, 19, "Finalizada", "Remota", ["QR del psicólogo", 30000]],
  [["ezequiel", "florencia"], -2, 19, "Finalizada", "Presencial"],
  [["ezequiel", "florencia"], 5, 19, "Pendiente", "Remota"],
  // Cognitivo-conductual
  [["tomas"], -17, 15, "Finalizada", "Presencial", ["Obra social", 21000]],
  [["tomas"], -10, 15, "Finalizada", "Presencial", ["Obra social", 21000]],
  [["agustina"], -11, 10, "Finalizada", "Remota", ["QR del psicólogo", 21000]],
  [["agustina"], -4, 10, "Finalizada", "Remota", ["QR del psicólogo", 21000]],
  [["nicolas"], -6, 16, "Finalizada", "Presencial", ["Efectivo", 21000]],
  [["tomas"], 3, 15, "Confirmada", "Presencial"],
  [["agustina"], 4, 10, "Pendiente", "Remota"],
  [["nicolas"], 8, 16, "Pendiente", "Presencial"],
]

// [paciente, título, contenido, etiquetas, días desde hoy]
const NOTAS = [
  ["camila", "Primera entrevista - Camila Ruiz",
    "S: Consulta por ansiedad ligada al trabajo. Refiere dificultad para dormir y preocupación constante por los plazos.\nO: Se presenta puntual, colaboradora, con discurso coherente. Se la observa inquieta al hablar de su jefe.\nA: Cuadro compatible con ansiedad reactiva a estrés laboral. Sin indicadores de riesgo.\nP: Psicoeducación sobre ansiedad. Registro semanal de situaciones que la disparan.",
    "ansiedad, primera entrevista", -21],
  ["camila", "Sesión 3 - Camila Ruiz",
    "S: Trae el registro completo. Identifica que la ansiedad aparece sobre todo los domingos a la noche.\nO: Más tranquila que en la primera entrevista. Se ríe al contar una situación del trabajo.\nA: Buena adherencia. Comienza a reconocer pensamientos anticipatorios.\nP: Técnica de respiración 4-7-8. Pautas de higiene del sueño. Continuar con el registro.",
    "ansiedad, seguimiento, sueño", -7, "seguimiento"],
  ["valentina", "Sesión remota - Valentina Sosa",
    "S: Estudiante universitaria. Consulta por bloqueo ante los exámenes finales.\nO: Sesión por videollamada sin inconvenientes de conexión. Se muestra autoexigente.\nA: Ansiedad de evaluación con perfeccionismo.\nP: Planificación de estudio por bloques y ensayo de examen oral.",
    "ansiedad, estudios", -12],
  ["julieta", "Primera entrevista - Julieta Paredes",
    "S: Concurre con su madre. Refieren cambios de humor y aislamiento desde el cambio de escuela.\nO: Al principio responde con monosílabos; se suelta cuando habla de dibujo.\nA: Dificultades de adaptación escolar. Sin indicadores de riesgo.\nP: Entrevista con la madre por separado. Trabajar vínculos con compañeros a través del dibujo.",
    "adolescencia, adaptación escolar", -15],
  ["mateo", "Sesión de juego - Mateo Gómez",
    "S: La madre comenta rabietas frecuentes a la hora de hacer la tarea.\nO: Juego reglado: tolera perder al segundo intento. Buena atención sostenida durante 20 minutos.\nA: Baja tolerancia a la frustración esperable para la edad, en mejora.\nP: Pautas a la familia: rutina fija para la tarea y elogio del esfuerzo.",
    "infancia, juego, familia", -9, "seguimiento"],
  ["rosa", "Evaluación neuropsicológica - Rosa Villalba",
    "S: Derivada por su médico de cabecera por olvidos recientes. Ella los minimiza; su hija los nota más.\nO: Orientada en tiempo y espacio. Rinde bien en atención; dificultad leve en recuerdo diferido.\nA: Perfil compatible con deterioro cognitivo leve. Se sugiere completar estudios.\nP: Informe para el médico derivante. Estimulación cognitiva semanal.",
    "evaluación, memoria", -20],
  ["hector", "Rehabilitación cognitiva - Héctor Ramírez",
    "S: Seis meses después de un ACV leve. Refiere cansancio y dificultad para concentrarse en el trabajo.\nO: Lentitud en tareas de velocidad de procesamiento. Buena comprensión de consignas.\nA: Secuelas atencionales leves con buen pronóstico.\nP: Ejercicios de atención en casa y uso de agenda para organizar la semana.",
    "rehabilitación, atención", -10],
  ["ezequiel", "Primera sesión de pareja - Núñez / Duarte",
    "S: Consultan por discusiones frecuentes desde el nacimiento de su hija. Ambos coinciden en querer mejorar la comunicación.\nO: Se interrumpen al hablar, pero escuchan cuando se les pide.\nA: Crisis vital por cambios de roles en la familia.\nP: Acordar un momento semanal para hablar sin pantallas. Ejercicio de escucha activa.",
    "pareja, comunicación", -16],
  ["tomas", "Primera entrevista - Tomás Fernández",
    "S: Consulta tras una separación reciente. Refiere tristeza, desgano y aislamiento de sus amigos.\nO: Afecto aplanado, habla en voz baja. Mantiene sus rutinas laborales.\nA: Duelo por ruptura de pareja. Se descarta riesgo actual.\nP: Activación conductual: retomar una actividad social por semana.",
    "duelo, primera entrevista", -17],
  ["agustina", "Sesión 2 - Agustina Morales",
    "S: Refiere miedo a hablar en público en la facultad. Evita las exposiciones orales.\nO: Describe con detalle pensamientos catastróficos antes de exponer.\nA: Ansiedad social circunscripta a situaciones de evaluación.\nP: Reestructuración cognitiva y jerarquía de exposición gradual.",
    "ansiedad social, exposición", -4, "seguimiento"],
  ["nicolas", "Primera entrevista - Nicolás Ríos",
    "S: Consulta por insomnio de conciliación desde hace tres meses.\nO: Lleva un registro de sueño por iniciativa propia. Consumo alto de café por la tarde.\nA: Insomnio asociado a malos hábitos de sueño y preocupaciones laborales.\nP: Higiene del sueño, restricción de cafeína después de las 16 y diario de preocupaciones.",
    "insomnio, hábitos", -6],
]

// Informes de seguimiento compartidos con el paciente (por la nota marcada con "seguimiento")
const SEGUIMIENTOS = {
  camila: {
    resumen: "Hoy hablamos de cómo te sentiste en el trabajo esta semana y de los momentos en que apareció la ansiedad. Practicamos juntas una técnica de respiración para usar cuando sientas que te desbordás.",
    pautas: "Evitá el celular la última hora antes de dormir. Si te despertás con ansiedad, usá la respiración antes de levantarte. No hace falta que hagas todo perfecto: lo importante es intentarlo.",
    avances: "Pudiste identificar en qué situaciones aparece la ansiedad, y eso es un gran paso.",
    actividades: [
      ["Practicar la respiración 4-7-8 antes de dormir, al menos 4 noches.", "HECHA", "La hice 5 noches. Me cuesta menos dormirme."],
      ["Anotar cuándo aparece la ansiedad, qué estabas haciendo y qué pensaste.", null, null],
      ["Salir a caminar 20 minutos dos veces en la semana.", "NO_PUDE", "Llovió casi toda la semana."],
    ],
  },
  mateo: {
    resumen: "Mateo jugó a juegos con reglas y aprendió a esperar su turno. Cuando perdió, se enojó un ratito y después quiso volver a jugar.",
    pautas: "Hacer la tarea siempre a la misma hora y en el mismo lugar. Felicitarlo por el esfuerzo, no solo por el resultado.",
    avances: "Cada vez tolera mejor perder en los juegos.",
    actividades: [
      ["Jugar en familia a un juego de mesa una vez en la semana.", "HECHA", "Jugamos al UNO el sábado y no se enojó."],
      ["Armar juntos un cartel con la rutina de la tarde.", null, null],
    ],
  },
  agustina: {
    resumen: "Trabajamos los pensamientos que aparecen antes de exponer y armamos una lista de situaciones, de la más fácil a la más difícil.",
    pautas: "Antes de una exposición, anotá el pensamiento que aparece y buscá una alternativa más realista.",
    avances: "Pudiste reconocer que tus predicciones suelen ser peores que lo que finalmente pasa.",
    actividades: [
      ["Hacer una pregunta en voz alta en una clase.", "HECHA", "Pregunté en Estadística, me temblaba la voz pero salió bien."],
      ["Grabarte explicando un tema durante 3 minutos.", null, null],
    ],
  },
}

// ---------------------------------------------------------------- Carga
try {
  await c.beginTransaction()

  // --- Personal (solo si no hay)
  if (!(await existeCuentaConPerfil("Recepcionista"))) {
    await crearCuenta(await crearPersona("Marta", "Giménez", "28444555", "1980-09-03"), "recepcion@demo.memopsy.test", "Recepcionista")
  }
  if (!(await existeCuentaConPerfil("Auditor"))) {
    await crearCuenta(await crearPersona("Jorge", "Acosta", "25666777", "1976-01-20"), "auditor@demo.memopsy.test", "Auditor")
  }
  const recepcion = await uno("SELECT u.id FROM usuario u JOIN usuario_tiene_perfil up ON up.usuario_id = u.id JOIN perfil p ON p.id = up.perfil_id WHERE p.nombre = 'Recepcionista' AND u.activo = 1 ORDER BY u.id LIMIT 1")

  // --- Psicólogos
  const psicologos = {}
  for (const p of PSICOLOGOS) {
    const existente = p.existente && (await uno(
      "SELECT u.id AS usuarioId, ps.id AS psicologoId FROM usuario u JOIN psicologo ps ON ps.persona_id = u.persona_id WHERE u.email = ?", [p.existente]))
    if (existente) {
      await c.query("UPDATE psicologo SET especialidad = ? WHERE id = ?", [p.especialidad, existente.psicologoId])
      psicologos[p.clave] = { ...existente, nombre: (await uno("SELECT CONCAT(pe.nombre, ' ', pe.apellido) AS n FROM usuario u JOIN persona pe ON pe.id = u.persona_id WHERE u.id = ?", [existente.usuarioId])).n }
    } else {
      const personaId = await crearPersona(p.nombre, p.apellido, p.dni, p.nacimiento)
      const usuarioId = await crearCuenta(personaId, p.email, "Psicólogo")
      const psicologoId = await id("INSERT INTO psicologo (persona_id, especialidad, numero_licencia) VALUES (?, ?, ?)", [personaId, p.especialidad, p.licencia])
      psicologos[p.clave] = { usuarioId, psicologoId, nombre: `${p.nombre} ${p.apellido}` }
    }
    // Franjas en las que acepta reprogramaciones (lunes a viernes)
    for (let dia = 1; dia <= 5; dia++) {
      for (const [desde, hasta] of p.franjas) {
        await c.query("INSERT INTO horario_disponible (psicologo_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)", [psicologos[p.clave].psicologoId, dia, desde, hasta])
      }
    }
  }

  // --- Pacientes
  const pacientes = {}
  for (const p of PACIENTES) {
    const personaId = await crearPersona(p.nombre, p.apellido, p.dni, p.nacimiento)
    const usuarioId = p.cuenta === false ? null : await crearCuenta(personaId, `${p.nombre}.${p.apellido}@demo.memopsy.test`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), "Paciente")
    const pacienteId = await id("INSERT INTO paciente (persona_id, obra_social_id) VALUES (?, ?)", [personaId, await obraSocialId(p.obra)])
    pacientes[p.clave] = { pacienteId, usuarioId, psicologo: p.psicologo, nombre: `${p.nombre} ${p.apellido}` }
  }
  // Los pacientes que ya estaban cargados (por ejemplo, el de la cuenta de prueba) pasan a la psicóloga clínica
  const previos = (await c.query(
    "SELECT pa.id AS pacienteId, u.id AS usuarioId, CONCAT(pe.nombre, ' ', pe.apellido) AS nombre FROM paciente pa JOIN persona pe ON pe.id = pa.persona_id LEFT JOIN usuario u ON u.persona_id = pe.id WHERE pa.id NOT IN (?)",
    [Object.values(pacientes).map((p) => p.pacienteId)]))[0]
  previos.forEach((p, i) => (pacientes[`previo${i}`] = { ...p, psicologo: "clinica" }))

  // --- Turnos
  const modalidades = { Presencial: await modalidadId("Presencial"), Remota: await modalidadId("Remota") }
  const medios = {}
  for (const m of ["Efectivo", "QR del psicólogo", "Obra social"]) medios[m] = await medioId(m)
  const enlaceMeet = () => `https://meet.google.com/${randomBytes(2).toString("hex").slice(0, 3)}-${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex").slice(0, 3)}`
  const sesiones = []
  async function turno(clavesPacientes, inicio, estado, modalidad, pago) {
    const psicologo = psicologos[pacientes[clavesPacientes[0]].psicologo]
    const sesionId = await id(
      "INSERT INTO sesion (psicologo_id, fecha_hora_inicio, fecha_hora_fin, modalidad_id, estado_id, enlace_videollamada, estado_pago, medio_de_pago_id, monto, fecha_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [psicologo.psicologoId, formato(inicio), formato(masMinutos(inicio, 50)), modalidades[modalidad], await estadoId(estado),
        modalidad === "Remota" ? enlaceMeet() : null,
        pago ? "Pagado" : "Pendiente", pago ? medios[pago[0]] : null, pago ? pago[1] : null, pago ? formato(inicio) : null],
    )
    for (const clave of clavesPacientes) {
      await c.query("INSERT INTO paciente_tiene_sesion (sesion_id, paciente_id) VALUES (?, ?)", [sesionId, pacientes[clave].pacienteId])
    }
    sesiones.push({ sesionId, clavesPacientes, inicio, estado })
    return sesionId
  }
  for (const [claves, dias, hora, estado, modalidad, pago] of TURNOS) {
    await turno(claves, diaHabil(dias, hora), estado, modalidad, pago)
  }
  // Pacientes que ya estaban cargados: uno pasado y uno para mañana (sirve para probar el recordatorio por email)
  for (const [i, clave] of Object.keys(pacientes).filter((k) => k.startsWith("previo")).entries()) {
    await turno([clave], diaHabil(-8, 12 + i), "Finalizada", "Presencial", ["Efectivo", 18000])
    await turno([clave], diaHabil(1, 12 + i), "Confirmada", "Presencial")
  }

  // --- Notas clínicas (contenido cifrado, como lo guarda el sistema)
  const notas = {}
  for (const [clave, titulo, contenido, etiquetas, dias, conSeguimiento] of NOTAS) {
    const paciente = pacientes[clave]
    const informeId = await id("INSERT INTO informe (psicologo_id, titulo, contenido, etiquetas, fecha_creacion, es_privado) VALUES (?, ?, ?, ?, ?, 1)",
      [psicologos[paciente.psicologo].psicologoId, titulo, cifrar(contenido), etiquetas, formato(diaHabil(dias, 20))])
    // La nota de pareja queda asociada a los dos
    const asociados = clave === "ezequiel" ? ["ezequiel", "florencia"] : [clave]
    for (const a of asociados) {
      await c.query("INSERT INTO paciente_tiene_informe (informe_id, paciente_id) VALUES (?, ?)", [informeId, pacientes[a].pacienteId])
    }
    if (conSeguimiento) notas[clave] = informeId
  }

  // --- Informes de seguimiento con actividades
  for (const [clave, s] of Object.entries(SEGUIMIENTOS)) {
    const seguimientoId = await id("INSERT INTO informe_seguimiento (informe_id, resumen, pautas, avances) VALUES (?, ?, ?, ?)",
      [notas[clave], cifrar(s.resumen), cifrar(s.pautas), cifrar(s.avances)])
    for (const [orden, [descripcion, respuesta, comentario]] of s.actividades.entries()) {
      await c.query("INSERT INTO actividad_seguimiento (seguimiento_id, descripcion, orden, respuesta, comentario, fecha_respuesta) VALUES (?, ?, ?, ?, ?, ?)",
        [seguimientoId, cifrar(descripcion), orden, respuesta, comentario ? cifrar(comentario) : null, respuesta ? formato(diaHabil(-1, 21)) : null])
    }
  }

  // --- Avisos en la campanita (solo fecha, hora y con quién: nunca contenido clínico)
  const aviso = (usuarioId, sesionId, tipo, titulo, mensaje) => usuarioId &&
    c.query("INSERT INTO notificacion (usuario_id, sesion_id, tipo, titulo, mensaje) VALUES (?, ?, ?, ?, ?)", [usuarioId, sesionId, tipo, titulo, mensaje])
  const reprogramado = sesiones.find((s) => s.estado === "Reprogramada")
  await aviso(psicologos.neuro.usuarioId, reprogramado.sesionId, "REPROGRAMACION", "Turno reprogramado", "Héctor Ramírez movió su turno a un horario de tus franjas disponibles.")
  await aviso(recepcion?.id, reprogramado.sesionId, "REPROGRAMACION", "Turno reprogramado", "Héctor Ramírez reprogramó su turno con Diego Martínez.")
  const cancelado = sesiones.find((s) => s.estado === "Cancelada")
  await aviso(psicologos.clinica.usuarioId, cancelado.sesionId, "CANCELACION", "Turno cancelado", "Valentina Sosa canceló su turno de ayer.")
  await aviso(psicologos.clinica.usuarioId, null, "RESPUESTA_ACTIVIDAD", "Respuesta a una actividad", 'Camila Ruiz marcó "Practicar la respiración 4-7-8..." como hecha y dejó un comentario.')
  await aviso(psicologos.tcc.usuarioId, null, "RESPUESTA_ACTIVIDAD", "Respuesta a una actividad", 'Agustina Morales marcó "Hacer una pregunta en voz alta..." como hecha.')
  for (const clave of ["camila", "agustina"]) {
    await aviso(pacientes[clave].usuarioId, null, "SEGUIMIENTO", "Nuevo informe de seguimiento", `${psicologos[pacientes[clave].psicologo].nombre} compartió con vos el informe de tu última sesión.`)
  }

  // --- Algunos registros de auditoría de los últimos días (sin contenido clínico)
  const auditoria = []
  for (const [clave, p] of Object.entries(psicologos)) {
    const email = (await uno("SELECT email FROM usuario WHERE id = ?", [p.usuarioId])).email
    auditoria.push([diaHabil(-3, 9), p.usuarioId, email, "LOGIN_OK", "Autenticación", String(p.usuarioId), null])
    auditoria.push([diaHabil(-3, 9, 5), p.usuarioId, email, "VER", "Informes", null, "Consulta de una nota clínica"])
    auditoria.push([diaHabil(-3, 9, 30), p.usuarioId, email, "CREAR", "Informes", null, "Alta de nota clínica"])
    if (clave === "clinica") auditoria.push([diaHabil(-3, 9, 20), p.usuarioId, email, "ESTRUCTURAR_IA", "Informes", null, "Propuesta de nota generada con IA"])
  }
  auditoria.push([diaHabil(-2, 8, 15), null, "desconocido@demo.memopsy.test", "LOGIN_FALLIDO", "Autenticación", null, "Contraseña incorrecta"])
  auditoria.push([diaHabil(-2, 10), pacientes.tomas.usuarioId, "tomas.fernandez@demo.memopsy.test", "ACCESO_DENEGADO", "Informes", null, "Intento sin permiso: crear en Informes"])
  for (const [fecha, usuarioId, email, accion, modulo, entidadId, detalle] of auditoria) {
    await c.query("INSERT INTO auditoria (fecha, usuario_id, email, accion, modulo, entidad_id, detalle, ip) VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1')",
      [formato(fecha), usuarioId, email, accion, modulo, entidadId, detalle])
  }

  // Primero las credenciales: si no se pueden guardar, no se confirma nada
  writeFileSync(salida, `Cuentas de demostración (datos ficticios)\n${credenciales.join("\n")}\n`)
  await c.commit()
  console.log(`Datos de demostración cargados: ${Object.keys(psicologos).length} psicólogos, ${Object.keys(pacientes).length} pacientes, ${sesiones.length} turnos, ${NOTAS.length} notas. ${credenciales.length} cuentas nuevas; credenciales en ${salida}`)
} catch (error) {
  await c.rollback()
  console.error("No se cargó nada:", error.message)
  process.exitCode = 1
} finally {
  await c.end()
}
