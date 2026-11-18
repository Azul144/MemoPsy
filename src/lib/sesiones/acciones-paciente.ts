// src/lib/sesiones/acciones-paciente.ts
// Cambios que el paciente puede hacer sobre su propio turno. Los usan la pantalla de reprogramación
// (RF 4.3) y el chatbot de WhatsApp, para que las reglas sean exactamente las mismas en los dos lados.
import type { DataSource } from "typeorm"
import { EstadoEntity, SesionEntity } from "@/entities"
import type { HorarioLibre } from "@/lib/sesiones/horarios-libres"
import { buscarSesionSuperpuesta } from "@/lib/validaciones/superposicion-sesiones"

// Se lanza dentro de la transacción si alguien ocupó el horario mientras el paciente elegía
export class ErrorHorarioOcupado extends Error {}

export const MENSAJE_HORARIO_NO_DISPONIBLE = "Ese horario ya no está disponible. Elegí otro."

export function turnoTerminado(sesion: SesionEntity): boolean {
  return sesion.estado?.nombre === "Finalizada" || sesion.estado?.nombre === "Cancelada"
}

async function estado(dataSource: DataSource, nombre: string) {
  return dataSource.getRepository(EstadoEntity).findOne({ where: { nombre } })
}

// Mueve el turno a un horario libre (ya validado) y lo deja "Reprogramada"
export async function moverTurno(dataSource: DataSource, sesion: SesionEntity, horario: HorarioLibre) {
  const reprogramada = await estado(dataSource, "Reprogramada")
  const inicio = new Date(horario.inicio)
  const fin = new Date(horario.fin)
  await dataSource.transaction(async (manager) => {
    // RF 3.1 - Se vuelve a mirar dentro de la transacción por si otro lo tomó recién
    const superpuesta = await buscarSesionSuperpuesta(manager, sesion.psicologo.id, inicio, fin, sesion.id)
    if (superpuesta) throw new ErrorHorarioOcupado()
    await manager.update(SesionEntity, { id: sesion.id }, {
      fechaHoraInicio: inicio,
      fechaHoraFin: fin,
      ...(reprogramada && { estado: { id: reprogramada.id } as EstadoEntity }),
    })
  })
  return reprogramada
}

// Cambia solo el estado del turno ("Confirmada" o "Cancelada")
export async function cambiarEstadoTurno(dataSource: DataSource, sesion: SesionEntity, nombre: "Confirmada" | "Cancelada") {
  const nuevo = await estado(dataSource, nombre)
  if (!nuevo) throw new Error(`No existe el estado ${nombre}`)
  await dataSource.getRepository(SesionEntity).update({ id: sesion.id }, { estado: { id: nuevo.id } as EstadoEntity })
  return nuevo
}
