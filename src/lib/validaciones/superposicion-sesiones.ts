// src/lib/validaciones/superposicion-sesiones.ts
// RF 3.1 - Un psicólogo no puede tener dos turnos que se pisen.
// Dos turnos se superponen si uno empieza antes de que termine el otro.
// Las sesiones canceladas no ocupan horario.

import type { DataSource, EntityManager } from "typeorm"
import { SesionEntity } from "@/entities"

export const MENSAJE_FIN_ANTES_DE_INICIO = "La hora de fin debe ser posterior a la hora de inicio."

export async function buscarSesionSuperpuesta(
  db: DataSource | EntityManager,
  psicologoId: string | number,
  inicio: Date,
  fin: Date,
  excluirSesionId?: string | number,
): Promise<SesionEntity | null> {
  const query = db
    .getRepository(SesionEntity)
    .createQueryBuilder("s")
    .leftJoin("s.estado", "e")
    .where("s.id_psicologo = :psicologoId", { psicologoId })
    .andWhere("s.fecha_hora_inicio < :fin", { fin })
    .andWhere("s.fecha_hora_fin > :inicio", { inicio })
    .andWhere("(e.nombre IS NULL OR e.nombre <> 'Cancelada')")

  if (excluirSesionId !== undefined) {
    query.andWhere("s.id <> :excluirSesionId", { excluirSesionId })
  }

  return query.getOne()
}

// Mensaje claro para mostrar en el formulario, con el horario ya ocupado (hora de Argentina)
export function mensajeSuperposicion(sesion: SesionEntity): string {
  const hora = (fecha: Date) =>
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(fecha)
  return `El psicólogo ya tiene un turno de ${hora(sesion.fechaHoraInicio)} a ${hora(sesion.fechaHoraFin)} ese día. Elegí otro horario.`
}
