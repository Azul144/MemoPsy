// Carga turnos de demostración FICTICIOS para la psicóloga Carla Benítez, para que la agenda
// del psicólogo se vea llena: varios turnos por día en las dos franjas (mañana de 8 a 11 y
// tarde-noche de 18 a 21), desde dos semanas atrás hasta tres semanas adelante.
//  - Suma cuatro pacientes ficticios (sin cuenta) a los que la psicóloga ya tenía.
//  - No les da turnos a pacientes con celular o con un email real (por ejemplo, Azul): así
//    los recordatorios automáticos nunca le escriben a una persona de verdad.
//  - Los turnos pasados quedan Finalizados (algunos cancelados); los futuros, Confirmados o Pendientes.
//  - No pisa turnos que ya estén cargados en el mismo horario.
//  - Respeta la regla del consultorio: cada paciente, una sola sesión por día y como máximo 2 por
//    semana. Si en un horario no hay ningún paciente libre, ese horario queda vacío.
//  - Es seguro correrlo más de una vez: si ya están los pacientes de esta carga, no hace nada.
//   node --env-file=.env.local scripts/cargar-turnos-demo.mjs
//   node --env-file=.env.render scripts/cargar-turnos-demo.mjs carla.benitez@demo.memopsy.test   (Render)
import mysql from "mysql2/promise"

const EMAIL = process.argv[2] ?? "psicologa@memopsy.test"
const NUEVOS = [
  { nombre: "Martín", apellido: "Acosta", dni: "37444123", nacimiento: "1993-04-10", obra: "IASEP" },
  { nombre: "Lucía", apellido: "Benítez", dni: "43222987", nacimiento: "2001-09-02", obra: "OSDE" },
  { nombre: "Ramiro", apellido: "Ojeda", dni: "33555210", nacimiento: "1988-12-21", obra: "Particular" },
  { nombre: "Sofía", apellido: "Giménez", dni: "40888456", nacimiento: "1997-07-30", obra: "Swiss Medical" },
]

const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
})
const uno = async (sql, v) => (await c.query(sql, v))[0][0]
const id = async (sql, v) => (await c.query(sql, v))[0].insertId

const psico = await uno(
  "SELECT ps.id_psicologo AS id FROM usuario u JOIN psicologo ps ON ps.id_persona = u.id_persona WHERE u.email = ?",
  [EMAIL],
)
if (!psico) {
  console.error(`No existe la cuenta ${EMAIL} con perfil de psicólogo.`)
  process.exit(1)
}
if (await uno("SELECT 1 AS si FROM persona WHERE dni = ?", [NUEVOS[0].dni])) {
  console.log("Los turnos de demostración ya están cargados.")
  process.exit(0)
}

const estado = async (n) => (await uno("SELECT id_estado AS id FROM estado WHERE nombre = ?", [n])).id
const modalidad = async (n) => (await uno("SELECT id_modalidad AS id FROM modalidad WHERE nombre = ?", [n])).id
const obra = async (n) => (await uno("SELECT id_obra_social AS id FROM obra_social WHERE nombre = ?", [n]))?.id ?? null
const E = { Finalizada: await estado("Finalizada"), Cancelada: await estado("Cancelada"), Confirmada: await estado("Confirmada"), Pendiente: await estado("Pendiente") }
const M = { Presencial: await modalidad("Presencial"), Remota: await modalidad("Remota") }
const efectivo = (await uno("SELECT id_medio_de_pago AS id FROM medio_de_pago WHERE descripcion = 'Efectivo'"))?.id ?? null

// Pacientes que ya tenía (solo los ficticios: sin celular y sin un email real) + los nuevos
const actuales = (await c.query(
  `SELECT DISTINCT pa.id_paciente AS id
     FROM paciente_tiene_sesion pts
     JOIN sesion s ON s.id_sesion = pts.id_sesion
     JOIN paciente pa ON pa.id_paciente = pts.id_paciente
     JOIN persona pe ON pe.id_persona = pa.id_persona
     LEFT JOIN usuario u ON u.id_persona = pe.id_persona
    WHERE s.id_psicologo = ? AND pe.telefono IS NULL AND (u.email IS NULL OR u.email LIKE '%.test')`,
  [psico.id],
))[0].map((f) => f.id)
const nuevos = []
for (const p of NUEVOS) {
  const personaId = await id("INSERT INTO persona (nombre, apellido, dni, fecha_nacimiento) VALUES (?, ?, ?, ?)", [p.nombre, p.apellido, p.dni, p.nacimiento])
  nuevos.push(await id("INSERT INTO paciente (id_persona, id_obra_social) VALUES (?, ?)", [personaId, await obra(p.obra)]))
}
const pacientes = [...actuales, ...nuevos]

// Regla del consultorio: una sesión por día y hasta 2 por semana (lunes a domingo) por paciente
const ZONA = "America/Argentina/Buenos_Aires"
const diaTxt = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d)
const lunesDe = (t) => {
  const [a, m, d] = t.split("-").map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  return new Date(f.getTime() - ((f.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10)
}
const agenda = new Map(pacientes.map((p) => [p, { dias: new Set(), semanas: new Map() }]))
const anotar = (p, d) => {
  const a = agenda.get(p)
  a.dias.add(diaTxt(d))
  a.semanas.set(lunesDe(diaTxt(d)), (a.semanas.get(lunesDe(diaTxt(d))) ?? 0) + 1)
}
const libre = (p, d) => !agenda.get(p).dias.has(diaTxt(d)) && (agenda.get(p).semanas.get(lunesDe(diaTxt(d))) ?? 0) < 2
// Lo que ya tenían cargado (sin cancelados)
for (const f of (await c.query(
  `SELECT pts.id_paciente AS p, s.fecha_hora_inicio AS inicio FROM paciente_tiene_sesion pts
     JOIN sesion s ON s.id_sesion = pts.id_sesion JOIN estado e ON e.id_estado = s.id_estado
    WHERE e.nombre <> 'Cancelada' AND pts.id_paciente IN (?)`, [pacientes.length ? pacientes : [0]],
))[0]) if (agenda.has(f.p)) anotar(f.p, new Date(f.inicio))

// Generador al azar con semilla fija: cada corrida arma la misma agenda
let semilla = 20261126
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)

const dos = (n) => String(n).padStart(2, "0")
const formato = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:00`
const HORAS = [8, 9, 10, 18, 19, 20] // turnos de una hora dentro de las dos franjas

const ocupado = async (inicio) =>
  Boolean(await uno("SELECT 1 AS si FROM sesion WHERE id_psicologo = ? AND fecha_hora_inicio = ?", [psico.id, formato(inicio)]))

let cargados = 0
const hoy = new Date()
hoy.setHours(0, 0, 0, 0)
for (let dias = -14; dias <= 21; dias++) {
  const dia = new Date(hoy)
  dia.setDate(dia.getDate() + dias)
  if (dia.getDay() === 0 || dia.getDay() === 6) continue
  // Entre 2 y 3 turnos a la mañana y entre 2 y 3 a la tarde-noche
  const manana = HORAS.slice(0, 3).filter(() => azar() < 0.8)
  const tarde = HORAS.slice(3).filter(() => azar() < 0.8)
  for (const hora of [...manana, ...tarde]) {
    const inicio = new Date(dia)
    inicio.setHours(hora, 0, 0, 0)
    if (await ocupado(inicio)) continue
    const disponibles = pacientes.filter((p) => libre(p, inicio))
    if (disponibles.length === 0) continue
    const fin = new Date(inicio.getTime() + 50 * 60000)
    const pasado = inicio.getTime() < Date.now()
    const nombreEstado = pasado ? (azar() < 0.1 ? "Cancelada" : "Finalizada") : azar() < 0.7 ? "Confirmada" : "Pendiente"
    const remota = azar() < 0.3
    const pagado = nombreEstado === "Finalizada" && azar() < 0.8
    const sesionId = await id(
      "INSERT INTO sesion (id_psicologo, fecha_hora_inicio, fecha_hora_fin, id_modalidad, id_estado, enlace_videollamada, estado_pago, id_medio_de_pago, monto, fecha_pago) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        psico.id, formato(inicio), formato(fin), remota ? M.Remota : M.Presencial, E[nombreEstado],
        remota ? `https://meet.jit.si/memopsy-demo-${sesionIdAzar()}` : null,
        pagado ? "Pagado" : "Pendiente", pagado ? efectivo : null, pagado ? 30000 : null, pagado ? formato(fin) : null,
      ],
    )
    const paciente = disponibles[Math.floor(azar() * disponibles.length)]
    anotar(paciente, inicio)
    await c.query("INSERT INTO paciente_tiene_sesion (id_sesion, id_paciente) VALUES (?, ?)", [sesionId, paciente])
    cargados++
  }
}
function sesionIdAzar() {
  return Math.floor(azar() * 1e8).toString(36)
}

console.log(`Listo: ${cargados} turnos para ${EMAIL} entre ${pacientes.length} pacientes (${nuevos.length} nuevos).`)
await c.end()
