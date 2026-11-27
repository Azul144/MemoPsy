// Ordena los turnos de la demo según la regla del consultorio: un paciente tiene una sola sesión
// por día y como máximo 2 por semana (de lunes a domingo). Las canceladas no cuentan.
//  - Recorre los turnos en orden de fecha. Si un paciente ya tiene sesión ese día, o ya tiene 2
//    esa semana, el turno pasa a otro paciente ficticio del mismo psicólogo que esté libre.
//  - Si ningún paciente puede tomarlo, se suma un paciente ficticio nuevo (sin cuenta) de la lista
//    EXTRA para que la agenda no quede vacía; si ya se usaron todos, el turno se borra.
//  - Nunca toca a pacientes reales (con celular o con un email que no sea .test, como Azul):
//    si alguno no cumple la regla, solo lo informa.
//  - Antes de cambiar nada guarda una copia de las filas que toca en el archivo indicado.
//   node --env-file=.env.local scripts/ordenar-turnos-demo.mjs <respaldo.json> [--aplicar]
// Sin --aplicar solo muestra lo que haría.
import { writeFileSync } from "node:fs"
import mysql from "mysql2/promise"

const [, , respaldo, flag] = process.argv
const aplicar = flag === "--aplicar"
if (!respaldo) {
  console.error("Uso: node scripts/ordenar-turnos-demo.mjs <respaldo.json> [--aplicar]")
  process.exit(1)
}

const c = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : undefined,
})
const q = async (sql, v) => (await c.query(sql, v))[0]

const ZONA = "America/Argentina/Buenos_Aires"
const dia = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d)
function lunes(diaTxt) {
  const [a, m, d] = diaTxt.split("-").map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  return new Date(f.getTime() - ((f.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10)
}

// Pacientes: ficticios = sin celular y sin cuenta, o con cuenta .test
const pacientes = await q(
  `SELECT pa.id_paciente AS id, CONCAT(pe.nombre, ' ', pe.apellido) AS nombre,
          (pe.telefono IS NULL AND (u.email IS NULL OR u.email LIKE '%.test')) AS ficticio
     FROM paciente pa JOIN persona pe ON pe.id_persona = pa.id_persona
     LEFT JOIN usuario u ON u.id_persona = pe.id_persona`,
)
const datos = new Map(pacientes.map((p) => [p.id, p]))

const vinculos = await q(
  `SELECT s.id_sesion AS sesion, s.id_psicologo AS psicologo, s.fecha_hora_inicio AS inicio, pts.id_paciente AS paciente,
          (SELECT COUNT(*) FROM paciente_tiene_sesion x WHERE x.id_sesion = s.id_sesion) AS cantidad
     FROM sesion s
     JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
     LEFT JOIN estado e ON e.id_estado = s.id_estado
    WHERE e.nombre IS NULL OR e.nombre <> 'Cancelada'
    ORDER BY s.fecha_hora_inicio, s.id_sesion`,
)

// Pacientes de cada psicólogo (los candidatos para tomar un turno que sobra)
const delPsicologo = new Map()
for (const v of vinculos) {
  if (!datos.get(v.paciente)?.ficticio) continue
  if (!delPsicologo.has(v.psicologo)) delPsicologo.set(v.psicologo, new Set())
  delPsicologo.get(v.psicologo).add(v.paciente)
}

// Pacientes ficticios que se pueden sumar si hacen falta (sin cuenta, particulares)
const EXTRA = [
  ["Bruno", "Cabrera", "38111401", "1994-02-11"], ["Milagros", "Vera", "42222502", "2000-06-23"],
  ["Facundo", "Ledesma", "36333603", "1991-09-05"], ["Rocío", "Medina", "40444704", "1997-12-14"],
  ["Gonzalo", "Ríos", "34555805", "1989-04-30"], ["Carolina", "Aguirre", "39666906", "1996-08-19"],
  ["Tomás", "Benítez", "43777007", "2001-01-27"], ["Julieta", "Romero", "37888108", "1993-10-08"],
  ["Matías", "Gauna", "41999209", "1998-03-16"], ["Florencia", "Sosa", "35000310", "1990-07-02"],
]
const existentesDni = new Set((await q("SELECT dni FROM persona WHERE dni IN (?)", [EXTRA.map((e) => e[2])])).map((r) => r.dni))
const extraLibres = EXTRA.filter((e) => !existentesDni.has(e[2]))
const nuevos = [] // { idTemporal, datos, psicologo }
let siguienteTemporal = -1

// Lo que ya tiene cada paciente, a medida que se recorre
const ocupado = new Map() // paciente -> { dias: Set, semanas: Map<lunes, n> }
const de = (p) => {
  if (!ocupado.has(p)) ocupado.set(p, { dias: new Set(), semanas: new Map() })
  return ocupado.get(p)
}
const libre = (p, d) => !de(p).dias.has(d) && (de(p).semanas.get(lunes(d)) ?? 0) < 2
const tomar = (p, d) => {
  de(p).dias.add(d)
  de(p).semanas.set(lunes(d), (de(p).semanas.get(lunes(d)) ?? 0) + 1)
}

const mover = [] // { sesion, de, a }
const borrar = new Set()
const reales = []
for (const v of vinculos) {
  const d = dia(new Date(v.inicio))
  if (libre(v.paciente, d)) {
    tomar(v.paciente, d)
    continue
  }
  if (!datos.get(v.paciente)?.ficticio) {
    reales.push(`${datos.get(v.paciente)?.nombre}: sesión ${v.sesion} del ${d}`)
    tomar(v.paciente, d)
    continue
  }
  const candidatos = [...(delPsicologo.get(v.psicologo) ?? [])].filter((p) => p !== v.paciente && libre(p, d))
  // El que menos sesiones tiene esa semana, para repartir parejo
  candidatos.sort((a, b) => (de(a).semanas.get(lunes(d)) ?? 0) - (de(b).semanas.get(lunes(d)) ?? 0))
  if (!candidatos[0] && v.cantidad === 1 && extraLibres.length) {
    const nuevo = { idTemporal: siguienteTemporal--, datos: extraLibres.shift(), psicologo: v.psicologo }
    nuevos.push(nuevo)
    datos.set(nuevo.idTemporal, { id: nuevo.idTemporal, nombre: `${nuevo.datos[0]} ${nuevo.datos[1]}`, ficticio: 1 })
    delPsicologo.get(v.psicologo).add(nuevo.idTemporal)
    candidatos.push(nuevo.idTemporal)
  }
  if (candidatos[0] && v.cantidad === 1) {
    mover.push({ sesion: v.sesion, de: v.paciente, a: candidatos[0] })
    tomar(candidatos[0], d)
  } else if (v.cantidad === 1) {
    borrar.add(v.sesion)
  } else {
    // Turno grupal (pareja, familia): se saca solo a este paciente
    mover.push({ sesion: v.sesion, de: v.paciente, a: null })
  }
}

console.log(`Turnos revisados: ${new Set(vinculos.map((v) => v.sesion)).size}`)
console.log(`Pacientes ficticios nuevos: ${nuevos.map((n) => `${n.datos[0]} ${n.datos[1]}`).join(", ") || "ninguno"}`)
console.log(`Pasan a otro paciente: ${mover.filter((m) => m.a).length} · Se borran: ${borrar.size} · Se saca un paciente de un turno grupal: ${mover.filter((m) => !m.a).length}`)
if (reales.length) console.log(`Pacientes reales que no cumplen la regla (no se tocan):\n  ${reales.join("\n  ")}`)

if (!aplicar) {
  console.log("Sin cambios (agregá --aplicar para hacerlos).")
  await c.end()
  process.exit(0)
}

// Copia de lo que se toca, antes de cambiar nada
const ids = [...borrar, ...mover.map((m) => m.sesion)]
const copia = ids.length
  ? {
      sesion: await q("SELECT * FROM sesion WHERE id_sesion IN (?)", [ids]),
      paciente_tiene_sesion: await q("SELECT * FROM paciente_tiene_sesion WHERE id_sesion IN (?)", [ids]),
      notificacion: await q("SELECT * FROM notificacion WHERE id_sesion IN (?)", [ids]),
      recordatorio_enviado: await q("SELECT * FROM recordatorio_enviado WHERE id_sesion IN (?)", [ids]),
    }
  : {}
writeFileSync(respaldo, JSON.stringify({ fecha: new Date().toISOString(), mover, borrar: [...borrar], copia }, null, 2))

await c.beginTransaction()
try {
  // Primero los pacientes nuevos: se reemplaza el id temporal por el real
  const particular = (await q("SELECT id_obra_social AS id FROM obra_social WHERE nombre = 'Particular'"))[0]?.id ?? null
  const real = new Map()
  for (const n of nuevos) {
    const persona = await q("INSERT INTO persona (nombre, apellido, dni, fecha_nacimiento) VALUES (?, ?, ?, ?)", n.datos)
    const paciente = await q("INSERT INTO paciente (id_persona, id_obra_social) VALUES (?, ?)", [persona.insertId, particular])
    real.set(n.idTemporal, paciente.insertId)
  }
  for (const m of mover) if (real.has(m.a)) m.a = real.get(m.a)
  for (const m of mover) {
    if (m.a) await q("UPDATE paciente_tiene_sesion SET id_paciente = ? WHERE id_sesion = ? AND id_paciente = ?", [m.a, m.sesion, m.de])
    else await q("DELETE FROM paciente_tiene_sesion WHERE id_sesion = ? AND id_paciente = ?", [m.sesion, m.de])
  }
  if (borrar.size) {
    const lista = [...borrar]
    await q("DELETE FROM recordatorio_enviado WHERE id_sesion IN (?)", [lista])
    await q("DELETE FROM notificacion WHERE id_sesion IN (?)", [lista])
    await q("DELETE FROM paciente_tiene_sesion WHERE id_sesion IN (?)", [lista])
    await q("DELETE FROM sesion WHERE id_sesion IN (?)", [lista])
  }
  await c.commit()
  console.log(`Listo. Copia de lo tocado en ${respaldo}`)
} catch (e) {
  await c.rollback()
  console.error("No se cambió nada:", e.message)
  process.exitCode = 1
}
await c.end()
