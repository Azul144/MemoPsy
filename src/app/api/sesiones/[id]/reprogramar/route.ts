// src/app/api/sesiones/[id]/reprogramar/route.ts
// RF 4.3 - El paciente mueve su turno a uno de los horarios que habilitó su psicólogo.
//  GET:  horarios libres a los que se puede mover
//  POST: mueve el turno al horario elegido; queda "Reprogramada" y se avisa al psicólogo (RF 3.2)
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { initializeDatabase } from "@/lib/database"
import { EstadoEntity, PacienteTieneSesionEntity, SesionEntity } from "@/entities"
import { buscarHorariosLibres, HORAS_ANTICIPACION, MENSAJE_SIN_ANTICIPACION } from "@/lib/sesiones/horarios-libres"
import { buscarSesionSuperpuesta } from "@/lib/validaciones/superposicion-sesiones"
import { notificarCambioDeTurno } from "@/lib/notificaciones/notificar"

const reprogramarSchema = z.object({
  fechaHoraInicio: z.string().datetime({ message: "Elegí un horario" }),
})

const MENSAJE_HORARIO_NO_DISPONIBLE = "Ese horario ya no está disponible. Elegí otro."

// Se lanza dentro de la transacción si alguien ocupó el horario mientras el paciente elegía
class ErrorHorarioOcupado extends Error {}

// Carga el turno y verifica que quien pide sea uno de sus pacientes y que todavía se pueda mover
async function turnoDelPaciente(id: string) {
  const session = await getServerSession(authConfig)
  if (!session?.user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  }
  const alcance = alcanceSesiones(session.user)
  if (alcance.tipo !== "paciente") {
    return { error: NextResponse.json({ error: "Solo el paciente puede reprogramar su turno desde aquí." }, { status: 403 }) }
  }

  const dataSource = await initializeDatabase()
  const sesion = await dataSource.getRepository(SesionEntity).findOne({ where: { id }, relations: ["psicologo", "estado"] })
  const pts = sesion ? await dataSource.getRepository(PacienteTieneSesionEntity).find({ where: { sesionId: sesion.id } }) : []
  const pacientesIds = pts.map((p) => String(p.pacienteId))
  // Si no es suyo, respondemos como si no existiera
  if (!sesion || !pacientesIds.includes(alcance.id)) {
    return { error: NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 }) }
  }
  if (sesion.estado?.nombre === "Finalizada" || sesion.estado?.nombre === "Cancelada") {
    return { error: NextResponse.json({ error: `No se puede reprogramar un turno ${sesion.estado.nombre.toLowerCase()}.` }, { status: 409 }) }
  }
  if (sesion.fechaHoraInicio.getTime() - Date.now() < HORAS_ANTICIPACION * 60 * 60 * 1000) {
    return { error: NextResponse.json({ error: MENSAJE_SIN_ANTICIPACION }, { status: 409 }) }
  }
  return { session, dataSource, sesion, pacientesIds }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const turno = await turnoDelPaciente(id)
    if (turno.error) return turno.error
    const { dataSource, sesion, pacientesIds } = turno

    const horarios = await buscarHorariosLibres(dataSource, sesion, pacientesIds)
    return NextResponse.json({ horarios })
  } catch (error) {
    console.error("Error al buscar horarios para reprogramar:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function manejarPOST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const turno = await turnoDelPaciente(id)
    if (turno.error) return turno.error
    const { session, dataSource, sesion, pacientesIds } = turno

    const validacion = reprogramarSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validacion.error.issues }, { status: 400 })
    }

    // Solo se acepta un horario de los que habilitó el psicólogo y siguen libres
    const elegido = new Date(validacion.data.fechaHoraInicio).getTime()
    const horario = (await buscarHorariosLibres(dataSource, sesion, pacientesIds)).find(
      (h) => new Date(h.inicio).getTime() === elegido,
    )
    if (!horario) {
      return NextResponse.json({ error: MENSAJE_HORARIO_NO_DISPONIBLE }, { status: 409 })
    }

    const reprogramada = await dataSource.getRepository(EstadoEntity).findOne({ where: { nombre: "Reprogramada" } })
    const inicioAnterior = sesion.fechaHoraInicio
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

    await notificarCambioDeTurno({
      sesionId: sesion.id,
      tipo: "REPROGRAMACION",
      inicioAnterior,
      usuarioQueCambia: session.user.id,
    })

    return NextResponse.json({
      id: sesion.id,
      fechaHoraInicio: horario.inicio,
      fechaHoraFin: horario.fin,
      estado: reprogramada ? { id: reprogramada.id, nombre: reprogramada.nombre } : null,
    })
  } catch (error) {
    if (error instanceof ErrorHorarioOcupado) {
      return NextResponse.json({ error: MENSAJE_HORARIO_NO_DISPONIBLE }, { status: 409 })
    }
    console.error("Error al reprogramar el turno:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Sesiones", accion: "REPROGRAMAR", detalle: "El paciente reprogramó su turno" })
