// src/lib/sesiones/pacto.ts
// RF 3.1 - Horario pactado: el psicólogo y el paciente acuerdan 1 o 2 horarios fijos por semana
// (día y hora, en días distintos). MemoPsy crea solos los turnos de las próximas semanas y los
// renueva en cada pasada del servidor. Si un turno se cancela o se reprograma, no se vuelve a crear,
// porque en la sesión queda de qué horario pactado salió y para qué fecha.
import type { DataSource, EntityManager } from "typeorm"
import { In } from "typeorm"
import {
  EstadoEntity,
  HorarioDisponibleEntity,
  HorarioPactadoEntity,
  PacienteTieneSesionEntity,
  SesionEntity,
} from "@/entities"
import { DIAS_ATENCION, validarEnAtencion } from "./turnos-atencion"
import { MAXIMO_SESIONES_POR_SEMANA, validarSesionesDelPaciente } from "@/lib/validaciones/sesiones-del-paciente"
import { buscarSesionSuperpuesta } from "@/lib/validaciones/superposicion-sesiones"
import { enlaceParaSesion } from "@/lib/videollamada"

export const DURACION_SESION_MIN = 50
export const SEMANAS_A_GENERAR = 4
const DESFASE_ARGENTINA = "-03:00"

export interface HorarioPacto {
  diaSemana: number // 1 = lunes ... 5 = viernes
  horaInicio: string // "HH:mm"
  modalidadId: number
}

const hhmm = (h: string) => h.slice(0, 5)
const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
export const horaFinPacto = (horaInicio: string) => aHora(aMin(horaInicio) + DURACION_SESION_MIN)
export const nombreDia = (n: number) => DIAS_ATENCION.find((d) => d.numero === n)?.nombre ?? ""

// "lunes 08:00 y jueves 18:00"
export function resumenPacto(horarios: Pick<HorarioPacto, "diaSemana" | "horaInicio">[]): string {
  const partes = [...horarios]
    .sort((a, b) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio))
    .map((h) => `${nombreDia(h.diaSemana)} ${hhmm(h.horaInicio)}`)
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0] ?? ""
}

// Revisa el pacto antes de guardarlo. Devuelve el motivo si no se puede, o null.
export async function validarPacto(
  db: DataSource | EntityManager,
  psicologoId: number,
  pacienteId: number,
  horarios: HorarioPacto[],
): Promise<string | null> {
  if (horarios.length === 0) return null // sin horario pactado: se puede dejar vacío
  if (horarios.length > MAXIMO_SESIONES_POR_SEMANA) {
    return `Se pueden pactar hasta ${MAXIMO_SESIONES_POR_SEMANA} horarios por semana.`
  }
  const dias = horarios.map((h) => h.diaSemana)
  if (new Set(dias).size !== dias.length) return "Los horarios pactados tienen que ser en días distintos."
  for (const h of horarios) {
    if (!(h.diaSemana >= 1 && h.diaSemana <= 5)) return "Elegí un día de lunes a viernes."
    if (!/^\d{2}:\d{2}$/.test(h.horaInicio)) return "Elegí la hora del horario pactado."
  }

  // Dentro de los días y turnos en que atiende el psicólogo
  const franjas = await db.getRepository(HorarioDisponibleEntity).find({ where: { psicologoId } })
  for (const h of horarios) {
    const motivo = validarEnAtencion(franjas, h.diaSemana, h.horaInicio, horaFinPacto(h.horaInicio))
    if (motivo) return `${nombreDia(h.diaSemana)} ${h.horaInicio}: ${motivo}`
  }

  // Sin pisarse con el horario pactado de otro paciente del mismo psicólogo
  const otros = await db.getRepository(HorarioPactadoEntity).find({ where: { psicologoId, activo: true } })
  for (const h of horarios) {
    const choque = otros.find(
      (o) =>
        o.pacienteId !== pacienteId &&
        o.diaSemana === h.diaSemana &&
        aMin(o.horaInicio) < aMin(h.horaInicio) + DURACION_SESION_MIN &&
        aMin(h.horaInicio) < aMin(o.horaInicio) + DURACION_SESION_MIN,
    )
    if (choque) return `El ${nombreDia(h.diaSemana)} a las ${hhmm(choque.horaInicio)} ya está pactado con otro paciente.`
  }
  return null
}

// Guarda el pacto (reemplaza el anterior) y crea los turnos de las próximas semanas.
// Los turnos futuros que salieron de un horario que ya no está pactado se borran si todavía
// no pasaron ni se pagaron.
export async function guardarPacto(
  db: DataSource,
  psicologoId: number,
  pacienteId: number,
  horarios: HorarioPacto[],
): Promise<{ creados: number }> {
  await db.transaction(async (m) => {
    const repo = m.getRepository(HorarioPactadoEntity)
    const actuales = await repo.find({ where: { psicologoId, pacienteId, activo: true } })
    const igual = (a: HorarioPactadoEntity, b: HorarioPacto) =>
      a.diaSemana === b.diaSemana && hhmm(a.horaInicio) === b.horaInicio && Number(a.modalidadId) === Number(b.modalidadId)

    const quedan = actuales.filter((a) => horarios.some((h) => igual(a, h)))
    const salen = actuales.filter((a) => !quedan.includes(a))
    const entran = horarios.filter((h) => !quedan.some((a) => igual(a, h)))

    if (salen.length > 0) {
      const ids = salen.map((s) => Number(s.id))
      await repo.update({ id: In(ids.map(String)) }, { activo: false })
      // Turnos futuros sin pagar de esos horarios: se borran con sus avisos
      const futuros: { id: number }[] = await m.query(
        `SELECT s.id_sesion AS id FROM sesion s JOIN estado e ON e.id_estado = s.id_estado
          WHERE s.id_horario_pactado IN (?) AND s.fecha_hora_inicio > NOW()
            AND e.nombre IN ('Pendiente', 'Confirmada') AND s.estado_pago <> 'Pagado'`,
        [ids],
      )
      await borrarSesiones(m, futuros.map((f) => f.id))
    }
    for (const h of entran) {
      await repo.insert({ psicologoId, pacienteId, diaSemana: h.diaSemana, horaInicio: `${h.horaInicio}:00`, modalidadId: h.modalidadId, activo: true })
    }
  })
  return generarTurnosPactados(db, { pacienteId })
}

// Borra sesiones y lo que cuelga de ellas (pacientes, avisos y recordatorios enviados)
export async function borrarSesiones(m: EntityManager, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  await m.query("DELETE FROM recordatorio_enviado WHERE id_sesion IN (?)", [ids])
  await m.query("DELETE FROM notificacion WHERE id_sesion IN (?)", [ids])
  await m.query("DELETE FROM paciente_tiene_sesion WHERE id_sesion IN (?)", [ids])
  await m.query("DELETE FROM sesion WHERE id_sesion IN (?)", [ids])
}

// "2026-11-30" del día de hoy + n en la hora del consultorio
function diaMas(n: number): { fecha: string; diaSemana: number } {
  const ahoraAR = new Date(Date.now() - 3 * 60 * 60 * 1000 + n * 24 * 60 * 60 * 1000)
  const fecha = ahoraAR.toISOString().slice(0, 10)
  const diaSemana = ((ahoraAR.getUTCDay() + 6) % 7) + 1 // 1 = lunes ... 7 = domingo
  return { fecha, diaSemana }
}

let generando = false

// Crea los turnos que faltan de los horarios pactados activos, para las próximas semanas.
// Se puede llamar todas las veces que haga falta: no repite turnos.
export async function generarTurnosPactados(
  db: DataSource,
  filtro: { pacienteId?: number; psicologoId?: number } = {},
): Promise<{ creados: number; error?: string }> {
  // La pasada general (sin filtro) no se superpone consigo misma; las de un paciente o psicólogo sí
  // pueden correr a la vez: la clave única (horario pactado + fecha) evita los turnos repetidos
  const general = !filtro.pacienteId && !filtro.psicologoId
  if (general && generando) return { creados: 0 }
  if (general) generando = true
  let creados = 0
  let error: string | undefined
  try {
    const pactos = await db.getRepository(HorarioPactadoEntity).find({
      where: { activo: true, ...(filtro.pacienteId ? { pacienteId: filtro.pacienteId } : {}), ...(filtro.psicologoId ? { psicologoId: filtro.psicologoId } : {}) },
    })
    if (pactos.length === 0) return { creados }

    const pendiente = await db.getRepository(EstadoEntity).findOne({ where: { nombre: "Pendiente" } })
    if (!pendiente) return { creados }

    // Fechas ya generadas de cada pacto (aunque después se hayan cancelado o reprogramado)
    const desde = diaMas(0).fecha
    const hechas: { pacto: number; fecha: string }[] = await db.query(
      `SELECT id_horario_pactado AS pacto, DATE_FORMAT(fecha_pactada, '%Y-%m-%d') AS fecha FROM sesion
        WHERE id_horario_pactado IN (?) AND fecha_pactada >= ?`,
      [pactos.map((p) => Number(p.id)), desde],
    )
    const yaHecha = new Set(hechas.map((h) => `${h.pacto}|${h.fecha}`))

    for (let n = 0; n < SEMANAS_A_GENERAR * 7; n++) {
      const { fecha, diaSemana } = diaMas(n)
      for (const p of pactos.filter((x) => x.diaSemana === diaSemana)) {
        if (yaHecha.has(`${p.id}|${fecha}`)) continue
        const inicio = new Date(`${fecha}T${hhmm(p.horaInicio)}:00${DESFASE_ARGENTINA}`)
        if (inicio.getTime() <= Date.now()) continue
        const fin = new Date(inicio.getTime() + DURACION_SESION_MIN * 60 * 1000)

        // Si ese día ya hay algo en el horario del psicólogo o el paciente ya tiene sus sesiones de la
        // semana (por un turno cargado a mano), ese turno no se crea: manda lo que ya está en la agenda
        if (await buscarSesionSuperpuesta(db, p.psicologoId, inicio, fin)) continue
        if (await validarSesionesDelPaciente(db, [p.pacienteId], inicio)) continue

        const enlace = await enlaceParaSesion({ manager: db.manager, modalidadId: p.modalidadId, enlaceEscrito: null, inicio, fin })
        try {
          const sesion = await db.getRepository(SesionEntity).save(
            db.getRepository(SesionEntity).create({
              fechaHoraInicio: inicio,
              fechaHoraFin: fin,
              psicologo: { id: String(p.psicologoId) },
              modalidad: { id: String(p.modalidadId) },
              estado: { id: pendiente.id },
              enlaceVideollamada: enlace,
              horarioPactadoId: Number(p.id),
              fechaPactada: fecha,
            } as Partial<SesionEntity>),
          )
          await db.getRepository(PacienteTieneSesionEntity).insert({ sesionId: sesion.id, pacienteId: String(p.pacienteId) })
          creados++
        } catch (e) {
          // Otra pasada ya lo creó (clave única horario pactado + fecha)
          if (!(e instanceof Error && e.message.includes("Duplicate"))) throw e
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error("No se pudieron generar los turnos de los horarios pactados:", error)
  } finally {
    if (general) generando = false
  }
  return { creados, error }
}

// Pactos activos de un paciente (con qué psicólogo) o de un psicólogo (con qué pacientes)
export async function pactosActivos(
  db: DataSource | EntityManager,
  filtro: { pacienteId?: number; psicologoId?: number },
): Promise<HorarioPactadoEntity[]> {
  return db.getRepository(HorarioPactadoEntity).find({
    where: { activo: true, ...filtro },
    order: { diaSemana: "ASC", horaInicio: "ASC" },
  })
}
