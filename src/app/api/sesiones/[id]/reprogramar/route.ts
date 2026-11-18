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
import { PacienteTieneSesionEntity, SesionEntity } from "@/entities"
import { buscarHorariosLibres, HORAS_ANTICIPACION, MENSAJE_SIN_ANTICIPACION } from "@/lib/sesiones/horarios-libres"
import { ErrorHorarioOcupado, MENSAJE_HORARIO_NO_DISPONIBLE, moverTurno, turnoTerminado } from "@/lib/sesiones/acciones-paciente"
import { notificarCambioDeTurno } from "@/lib/notificaciones/notificar"

const reprogramarSchema = z.object({
  fechaHoraInicio: z.string().datetime({ message: "Elegí un horario" }),
})

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
  if (turnoTerminado(sesion)) {
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

    const inicioAnterior = sesion.fechaHoraInicio
    const reprogramada = await moverTurno(dataSource, sesion, horario)
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
