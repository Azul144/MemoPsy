// src/app/api/sesiones/[id]/recordatorio/route.ts
// RF 3.3 - El psicólogo (de sus turnos) o recepción (de todos) manda en el momento el recordatorio
// del turno por email y por WhatsApp, con el botón "Recordatorio" de la agenda.
import { conDetalleAuditoria, describirTurno, fechaHoraCorta } from "@/lib/auditoria/detalle"
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { initializeDatabase } from "@/lib/database"
import { SesionEntity } from "@/entities"
import { enviarRecordatorioDeTurno } from "@/lib/notificaciones/recordatorio-manual"

async function manejarPOST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const permisos = session.user.permisos?.map((p) => p.nombre) ?? []
    if (!permisos.includes("Editar Sesión")) {
      return NextResponse.json({ error: "Sin permiso para enviar recordatorios" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const sesion = await dataSource.getRepository(SesionEntity).findOne({ where: { id }, relations: ["psicologo", "estado"] })
    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const alcance = alcanceSesiones(session.user)
    const esSuya = alcance.tipo === "psicologo" && String(sesion.psicologo?.id ?? "") === alcance.id
    if (alcance.tipo !== "todas" && !esSuya) {
      return NextResponse.json({ error: "No tenés permiso para enviar el recordatorio de este turno." }, { status: 403 })
    }

    if (sesion.estado?.nombre === "Finalizada" || sesion.estado?.nombre === "Cancelada") {
      return NextResponse.json({ error: `No se manda recordatorio de un turno ${sesion.estado.nombre.toLowerCase()}.` }, { status: 409 })
    }
    if (new Date(sesion.fechaHoraInicio).getTime() < Date.now()) {
      return NextResponse.json({ error: "El turno ya pasó." }, { status: 409 })
    }

    const resultado = await enviarRecordatorioDeTurno(Number(id))
    if (resultado.pacientes === 0) {
      return NextResponse.json({ error: "El turno no tiene pacientes con cuenta activa." }, { status: 409 })
    }
    return conDetalleAuditoria(
      NextResponse.json({ ok: true, ...resultado }),
      `Recordatorio enviado a mano: ${await describirTurno(await initializeDatabase(), id)}`,
    )
  } catch (error) {
    console.error("Error al enviar el recordatorio:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Sesiones", accion: "ENVIAR_RECORDATORIO", detalle: () => "Recordatorio del turno enviado a mano" })
