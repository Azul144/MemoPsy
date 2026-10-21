// src/app/api/sesiones/[id]/estado/route.ts
// Cambia SOLO el estado de un turno (confirmar / cancelar / reprogramar), sin tener que
// reenviar toda la sesión. Lo usan las acciones rápidas de la agenda.
import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { initializeDatabase } from "@/lib/database"
import { SesionEntity, EstadoEntity } from "@/entities"
import { notificarCambioDeTurno } from "@/lib/notificaciones/notificar"

const estadoSchema = z.object({
  estadoId: z.coerce.number().int().positive(),
})

async function manejarPATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const permisos = session.user.permisos?.map((p) => p.nombre) ?? []
    if (!permisos.includes("Editar Sesión")) {
      return NextResponse.json({ error: "Sin permiso para cambiar el estado del turno" }, { status: 403 })
    }

    const validacion = estadoSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validacion.error.issues }, { status: 400 })
    }
    const { estadoId } = validacion.data

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const sesion = await sesionRepository.findOne({ where: { id }, relations: ["psicologo", "estado"] })
    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    // El psicólogo solo cambia el estado de sus propias sesiones; recepción, de todas.
    const alcance = alcanceSesiones(session.user)
    const esSuya = alcance.tipo === "psicologo" && String(sesion.psicologo?.id ?? "") === alcance.id
    if (alcance.tipo !== "todas" && !esSuya) {
      return NextResponse.json({ error: "No tenés permiso para cambiar el estado de este turno." }, { status: 403 })
    }

    // Una sesión finalizada o cancelada no se vuelve a tocar.
    if (sesion.estado?.nombre === "Finalizada" || sesion.estado?.nombre === "Cancelada") {
      return NextResponse.json({ error: `No se puede cambiar el estado de un turno ${sesion.estado.nombre.toLowerCase()}.` }, { status: 409 })
    }

    const estado = await dataSource.getRepository(EstadoEntity).findOne({ where: { id: String(estadoId) } })
    if (!estado) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
    }

    sesion.estado = estado
    await sesionRepository.save(sesion)

    // RF 3.2 - Si se canceló, se avisa al psicólogo y a los pacientes
    if (estado.nombre === "Cancelada") {
      await notificarCambioDeTurno({
        sesionId: id,
        tipo: "CANCELACION",
        inicioAnterior: sesion.fechaHoraInicio,
        usuarioQueCambia: session.user.id,
      })
    }

    return NextResponse.json({ ok: true, estado: { id: estado.id, nombre: estado.nombre } })
  } catch (error) {
    console.error("Error al cambiar el estado de la sesión:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PATCH = conAuditoria(manejarPATCH, { modulo: "Sesiones", accion: "CAMBIAR_ESTADO", detalle: (d) => (d?.estado?.nombre ? `Nuevo estado del turno: ${d.estado.nombre}` : "Cambio de estado del turno") })
