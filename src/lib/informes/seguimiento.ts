// src/lib/informes/seguimiento.ts
// RF 2.4 - Piezas comunes del informe de seguimiento para el paciente.
//  - Quién puede hacer qué: el psicólogo autor de la nota lo arma y ve las respuestas;
//    los pacientes de la nota lo ven, lo responden y lo descargan. Nadie más.
//  - Cómo se entrega: nunca incluye el contenido de la nota clínica.
import type { DataSource } from "typeorm"
import { InformeEntity, InformeSeguimientoEntity, PacienteTieneInformeEntity, SesionEntity } from "@/entities"

interface UsuarioConRol {
  psicologoId?: string | null
  pacienteId?: string | null
}

export interface AccesoInforme {
  informe: InformeEntity
  pacientes: { id: string; nombre: string; apellido: string }[]
  esAutor: boolean
  esPaciente: boolean
}

// Carga la nota y dice qué relación tiene la persona con ella (null si la nota no existe)
export async function accesoAlInforme(db: DataSource, informeId: string | number, usuario: UsuarioConRol): Promise<AccesoInforme | null> {
  const informe = await db.getRepository(InformeEntity).findOne({
    where: { id: String(informeId) },
    relations: ["psicologo", "psicologo.persona"],
  })
  if (!informe) return null
  const asociados = await db.getRepository(PacienteTieneInformeEntity).find({
    where: { informe: { id: informe.id } },
    relations: ["paciente", "paciente.persona"],
  })
  const pacientes = asociados.map((a) => ({
    id: String(a.paciente.id),
    nombre: a.paciente.persona?.nombre ?? "",
    apellido: a.paciente.persona?.apellido ?? "",
  }))
  return {
    informe,
    pacientes,
    esAutor: !!usuario.psicologoId && String(informe.psicologo?.id) === String(usuario.psicologoId),
    esPaciente: !!usuario.pacienteId && pacientes.some((p) => p.id === String(usuario.pacienteId)),
  }
}

// Próximo turno (no cancelado ni finalizado) entre el psicólogo y alguno de los pacientes
export async function proximaSesion(db: DataSource, psicologoId: string, pacientesIds: string[]): Promise<Date | null> {
  if (pacientesIds.length === 0) return null
  const sesion = await db
    .getRepository(SesionEntity)
    .createQueryBuilder("s")
    .leftJoin("s.estado", "e")
    .where("s.psicologo_id = :psicologoId", { psicologoId })
    .andWhere("s.fecha_hora_inicio > :ahora", { ahora: new Date() })
    .andWhere("(e.nombre IS NULL OR e.nombre NOT IN ('Cancelada', 'Finalizada'))")
    .andWhere(
      "EXISTS (SELECT 1 FROM paciente_tiene_sesion pts WHERE pts.sesion_id = s.id AND pts.paciente_id IN (:...pacientesIds))",
      { pacientesIds },
    )
    .orderBy("s.fecha_hora_inicio", "ASC")
    .getOne()
  return sesion?.fechaHoraInicio ?? null
}

export async function buscarSeguimiento(db: DataSource, informeId: string | number) {
  return db.getRepository(InformeSeguimientoEntity).findOne({
    where: { informe: { id: String(informeId) } },
    relations: ["actividades"],
    order: { actividades: { orden: "ASC" } },
  })
}

// Lo que se envía al navegador: los datos del informe de seguimiento, sin nada de la nota clínica
export function seguimientoParaEnviar(
  seguimiento: InformeSeguimientoEntity,
  acceso: AccesoInforme,
  proxima: Date | null,
) {
  const persona = acceso.informe.psicologo?.persona
  return {
    id: String(seguimiento.id),
    informeId: String(acceso.informe.id),
    // La fecha de la sesión es la de la nota clínica de la que sale el informe
    fechaSesion: acceso.informe.fechaCreacion.toISOString(),
    psicologo: persona ? `${persona.nombre} ${persona.apellido}` : null,
    pacientes: acceso.pacientes.map((p) => `${p.nombre} ${p.apellido}`.trim()),
    resumen: seguimiento.resumen,
    pautas: seguimiento.pautas,
    avances: seguimiento.avances,
    proximaSesion: proxima ? proxima.toISOString() : null,
    fechaCreacion: seguimiento.fechaCreacion.toISOString(),
    fechaActualizacion: seguimiento.fechaActualizacion.toISOString(),
    actividades: (seguimiento.actividades ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((a) => ({
        id: String(a.id),
        descripcion: a.descripcion,
        respuesta: a.respuesta,
        comentario: a.comentario,
        fechaRespuesta: a.fechaRespuesta ? a.fechaRespuesta.toISOString() : null,
      })),
  }
}

export type SeguimientoEnviado = ReturnType<typeof seguimientoParaEnviar>
