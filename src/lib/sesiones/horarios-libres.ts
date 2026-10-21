// src/lib/sesiones/horarios-libres.ts
// RF 4.3 - Horarios a los que un paciente puede mover su turno.
// Salen de las franjas que habilitó el psicólogo (tabla horario_disponible), cortadas en
// turnos de la misma duración que el original, y se descartan los que ya están ocupados.
import type { DataSource, EntityManager } from "typeorm"
import { HorarioDisponibleEntity, SesionEntity } from "@/entities"

// El paciente puede reprogramar (y elegir horarios) con al menos 24 h de anticipación
export const HORAS_ANTICIPACION = 24
// Hasta cuántos días para adelante se ofrecen horarios
export const DIAS_A_FUTURO = 21

export const MENSAJE_SIN_ANTICIPACION = `Solo se puede reprogramar un turno con al menos ${HORAS_ANTICIPACION} horas de anticipación.`

const ZONA_HORARIA = "America/Argentina/Buenos_Aires"
// Argentina no tiene horario de verano: la hora del consultorio es siempre UTC-3
const DESFASE_ARGENTINA = "-03:00"
const UNA_HORA = 60 * 60 * 1000
const UN_DIA = 24 * UNA_HORA

export interface HorarioLibre {
  inicio: string // ISO
  fin: string // ISO
}

// "2026-10-27" del día en Argentina y su día de la semana (1 = lunes ... 7 = domingo)
function diaEnConsultorio(fecha: Date): { dia: string; diaSemana: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(fecha)
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ""
  const dias = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return { dia: `${parte("year")}-${parte("month")}-${parte("day")}`, diaSemana: dias.indexOf(parte("weekday")) + 1 }
}

// Arma la fecha real de un día y una hora del consultorio ("HH:mm" o "HH:mm:ss")
function horaDelConsultorio(dia: string, hora: string): Date {
  return new Date(`${dia}T${hora.slice(0, 5)}:00${DESFASE_ARGENTINA}`)
}

export async function buscarHorariosLibres(
  db: DataSource | EntityManager,
  sesion: SesionEntity,
  pacientesIds: string[],
): Promise<HorarioLibre[]> {
  const psicologoId = sesion.psicologo?.id
  if (!psicologoId) return []

  const franjas = await db.getRepository(HorarioDisponibleEntity).find({ where: { psicologoId: Number(psicologoId) } })
  if (franjas.length === 0) return []

  const duracion = sesion.fechaHoraFin.getTime() - sesion.fechaHoraInicio.getTime()
  if (duracion <= 0) return []

  const ahora = Date.now()
  const desde = new Date(ahora + HORAS_ANTICIPACION * UNA_HORA)
  const hasta = new Date(ahora + DIAS_A_FUTURO * UN_DIA)

  // Turnos que ya ocupan al psicólogo o a alguno de los pacientes (los cancelados no ocupan)
  const consulta = db
    .getRepository(SesionEntity)
    .createQueryBuilder("s")
    .leftJoin("s.estado", "e")
    .where("s.id <> :id", { id: sesion.id })
    .andWhere("s.fecha_hora_inicio < :hasta AND s.fecha_hora_fin > :desde", { desde, hasta })
    .andWhere("(e.nombre IS NULL OR e.nombre <> 'Cancelada')")
  if (pacientesIds.length > 0) {
    consulta.andWhere(
      "(s.psicologo_id = :psicologoId OR EXISTS (SELECT 1 FROM paciente_tiene_sesion pts WHERE pts.sesion_id = s.id AND pts.paciente_id IN (:...pacientesIds)))",
      { psicologoId, pacientesIds },
    )
  } else {
    consulta.andWhere("s.psicologo_id = :psicologoId", { psicologoId })
  }
  const ocupados = await consulta.getMany()

  const libres: HorarioLibre[] = []
  for (let t = ahora; t <= hasta.getTime(); t += UN_DIA) {
    const { dia, diaSemana } = diaEnConsultorio(new Date(t))
    for (const franja of franjas.filter((f) => f.diaSemana === diaSemana)) {
      const finFranja = horaDelConsultorio(dia, franja.horaFin).getTime()
      for (let inicio = horaDelConsultorio(dia, franja.horaInicio).getTime(); inicio + duracion <= finFranja; inicio += duracion) {
        const fin = inicio + duracion
        if (inicio < desde.getTime() || inicio === sesion.fechaHoraInicio.getTime()) continue
        const pisaOtro = ocupados.some((o) => o.fechaHoraInicio.getTime() < fin && o.fechaHoraFin.getTime() > inicio)
        if (!pisaOtro) libres.push({ inicio: new Date(inicio).toISOString(), fin: new Date(fin).toISOString() })
      }
    }
  }
  return libres.sort((a, b) => a.inicio.localeCompare(b.inicio))
}
