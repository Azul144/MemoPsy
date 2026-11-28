// scripts/cargar-pactos-demo.mjs
// RF 3.1 - Le pone a cada paciente de la demo su horario pactado con su psicólogo (uno por semana,
// repartidos en distintos días y horas, sin pisarse con otros pacientes, dejando horarios libres) y borra sus turnos FUTUROS sin pagar, para que el
// servidor los vuelva a crear desde el pacto (lo hace solo al arrancar y después cada hora).
// Las sesiones pasadas, las notas, los seguimientos y los pagos no se tocan.
// Antes de cambiar nada guarda un respaldo en JSON de lo que va a borrar.
//
// Azul Coronel (la paciente de referencia) queda con Carla Benítez los lunes a las 8:00, presencial.
//
// Uso:
//   node --env-file=.env.local  scripts/cargar-pactos-demo.mjs <respaldo.json>
//   node --env-file=.env.render scripts/cargar-pactos-demo.mjs <respaldo.json>
import { writeFileSync } from "node:fs"
import mysql from "mysql2/promise"

const respaldo = process.argv[2]
if (!respaldo) {
  console.error("Uso: node --env-file=<.env> scripts/cargar-pactos-demo.mjs <respaldo.json>")
  process.exit(1)
}

const c = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "psicologia_db",
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
  timezone: "-03:00",
})
await c.query("SET time_zone = '-03:00'")

const DURACION = 50
const POR_PACIENTE = 1 // igual que PACTOS_POR_PACIENTE en src/lib/sesiones/pacto.ts
const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

const [[{ presencial }]] = await c.query("SELECT id_modalidad AS presencial FROM modalidad WHERE nombre = 'Presencial'")
const [[{ remota }]] = await c.query("SELECT id_modalidad AS remota FROM modalidad WHERE nombre = 'Remota'")

// Psicólogos y sus horas posibles por día (cada hora en punto en que entra una sesión de 50 minutos)
const [psicologos] = await c.query(
  "SELECT ps.id_psicologo AS id, pe.nombre, pe.apellido FROM psicologo ps JOIN persona pe ON pe.id_persona = ps.id_persona",
)
const [franjas] = await c.query("SELECT id_psicologo AS id, dia_semana AS dia, TIME_FORMAT(hora_inicio, '%H:%i') AS desde, TIME_FORMAT(hora_fin, '%H:%i') AS hasta FROM horario_disponible")
const libres = new Map() // psicologoId -> Map(dia -> [horas])
for (const p of psicologos) libres.set(p.id, new Map())
for (const f of franjas) {
  const dias = libres.get(f.id)
  if (!dias) continue
  const horas = dias.get(f.dia) ?? []
  for (let m = aMin(f.desde); m + DURACION <= aMin(f.hasta); m += 60) horas.push(aHora(m))
  dias.set(f.dia, horas.sort())
}

// Cada paciente queda con el psicólogo con el que tuvo más turnos
const [relaciones] = await c.query(
  `SELECT pts.id_paciente AS paciente, s.id_psicologo AS psicologo, COUNT(*) AS n,
          CONCAT(pe.nombre, ' ', pe.apellido) AS nombre, u.email
     FROM paciente_tiene_sesion pts
     JOIN sesion s ON s.id_sesion = pts.id_sesion
     JOIN paciente pa ON pa.id_paciente = pts.id_paciente
     JOIN persona pe ON pe.id_persona = pa.id_persona
     LEFT JOIN usuario u ON u.id_persona = pe.id_persona
    GROUP BY pts.id_paciente, s.id_psicologo, pe.nombre, pe.apellido, u.email
    ORDER BY pts.id_paciente, n DESC`,
)
const pacientes = []
for (const r of relaciones) if (!pacientes.some((p) => p.paciente === r.paciente)) pacientes.push(r)

const esAzul = (p) => p.email === "coronelazul144@gmail.com"
const carla = psicologos.find((p) => p.nombre === "Carla" && p.apellido === "Benítez")

// Azul primero, para que tenga su horario fijo
pacientes.sort((a, b) => Number(esAzul(b)) - Number(esAzul(a)))

const tomar = (psicologoId, dia, hora) => {
  const horas = libres.get(psicologoId)?.get(dia) ?? []
  const i = horas.indexOf(hora)
  if (i < 0) return false
  horas.splice(i, 1)
  return true
}

// Pares de días distintos, en distinto orden para repartir la semana
const PARES = [[1, 3], [2, 4], [3, 5], [1, 4], [2, 5], [4, 1], [5, 2], [3, 1], [5, 3], [4, 2]]
const pactos = []
let indice = 0
for (const p of pacientes) {
  if (esAzul(p) && carla) {
    p.psicologo = carla.id
    if (tomar(carla.id, 1, "08:00")) pactos.push({ ...p, dia: 1, hora: "08:00", modalidad: presencial })
    continue
  }
  const dias = libres.get(p.psicologo)
  let puestos = 0
  for (let intento = 0; intento < PARES.length && puestos < POR_PACIENTE; intento++) {
    const par = PARES[(indice + intento) % PARES.length]
    const usados = pactos.filter((x) => x.paciente === p.paciente).map((x) => x.dia)
    for (const dia of par) {
      if (puestos >= POR_PACIENTE || usados.includes(dia)) continue
      const horas = dias?.get(dia) ?? []
      if (horas.length === 0) continue
      // Alterna mañana y tarde cuando el psicólogo atiende en las dos
      const hora = horas[(indice + puestos) % horas.length]
      if (tomar(p.psicologo, dia, hora)) {
        pactos.push({ ...p, dia, hora, modalidad: presencial })
        usados.push(dia)
        puestos++
      }
    }
  }
  indice++
}

// Turnos futuros sin pagar de estos pacientes: se borran (el servidor los vuelve a crear desde el pacto)
const ids = pacientes.map((p) => p.paciente)
const [futuras] = ids.length
  ? await c.query(
      `SELECT s.* FROM sesion s JOIN estado e ON e.id_estado = s.id_estado
        WHERE s.fecha_hora_inicio > NOW() AND e.nombre IN ('Pendiente', 'Confirmada', 'Reprogramada')
          AND s.estado_pago <> 'Pagado'
          AND s.id_sesion IN (SELECT id_sesion FROM paciente_tiene_sesion WHERE id_paciente IN (?))`,
      [ids],
    )
  : [[]]
const sesionIds = futuras.map((s) => s.id_sesion)
const [relFuturas] = sesionIds.length ? await c.query("SELECT * FROM paciente_tiene_sesion WHERE id_sesion IN (?)", [sesionIds]) : [[]]
const [notifFuturas] = sesionIds.length ? await c.query("SELECT * FROM notificacion WHERE id_sesion IN (?)", [sesionIds]) : [[]]
const [recFuturos] = sesionIds.length ? await c.query("SELECT * FROM recordatorio_enviado WHERE id_sesion IN (?)", [sesionIds]) : [[]]
const [pactosPrevios] = await c.query("SELECT * FROM horario_pactado")
writeFileSync(
  respaldo,
  JSON.stringify({ fecha: new Date().toISOString(), sesion: futuras, paciente_tiene_sesion: relFuturas, notificacion: notifFuturas, recordatorio_enviado: recFuturos, horario_pactado: pactosPrevios }, null, 2),
)
console.log(`Respaldo: ${respaldo} (${futuras.length} turnos futuros)`)

await c.beginTransaction()
try {
  if (sesionIds.length) {
    await c.query("DELETE FROM recordatorio_enviado WHERE id_sesion IN (?)", [sesionIds])
    await c.query("DELETE FROM notificacion WHERE id_sesion IN (?)", [sesionIds])
    await c.query("UPDATE whatsapp_conversacion SET id_sesion = NULL WHERE id_sesion IN (?)", [sesionIds]).catch(() => {})
    await c.query("DELETE FROM paciente_tiene_sesion WHERE id_sesion IN (?)", [sesionIds])
    await c.query("DELETE FROM sesion WHERE id_sesion IN (?)", [sesionIds])
  }
  await c.query("UPDATE horario_pactado SET activo = 0 WHERE id_paciente IN (?)", [ids.length ? ids : [0]])
  for (const p of pactos) {
    await c.query(
      "INSERT INTO horario_pactado (id_psicologo, id_paciente, dia_semana, hora_inicio, id_modalidad, activo) VALUES (?, ?, ?, ?, ?, 1)",
      [p.psicologo, p.paciente, p.dia, `${p.hora}:00`, p.modalidad],
    )
  }
  await c.commit()
} catch (e) {
  await c.rollback()
  throw e
}

const DIAS = ["", "lun", "mar", "mié", "jue", "vie"]
const resumen = new Map()
for (const p of pactos) {
  const ps = psicologos.find((x) => x.id === p.psicologo)
  const clave = `${ps.nombre} ${ps.apellido} → ${p.nombre}`
  resumen.set(clave, [...(resumen.get(clave) ?? []), `${DIAS[p.dia]} ${p.hora}${p.modalidad === remota ? " (remota)" : ""}`])
}
for (const [clave, horarios] of [...resumen].sort()) console.log(`${clave}: ${horarios.join(", ")}`)
const sinDos = pacientes.filter((p) => pactos.filter((x) => x.paciente === p.paciente).length < POR_PACIENTE)
console.log(`${pactos.length} horarios pactados para ${pacientes.length} pacientes; borrados ${sesionIds.length} turnos futuros.`)
if (sinDos.length) console.log(`Con menos de ${POR_PACIENTE} por falta de lugar: ${sinDos.map((p) => p.nombre).join(", ")}`)
await c.end()
