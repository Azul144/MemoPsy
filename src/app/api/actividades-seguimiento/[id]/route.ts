// src/app/api/actividades-seguimiento/[id]/route.ts
// RF 2.4 - El paciente cuenta si pudo hacer una actividad del informe de seguimiento
// ("La hice" / "No pude") y puede dejar un comentario. Se avisa al psicólogo.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { ActividadSeguimientoEntity } from "@/entities"
import { accesoAlInforme } from "@/lib/informes/seguimiento"
import { notificarPsicologo } from "@/lib/notificaciones/notificar"

const respuestaSchema = z.object({
  respuesta: z.enum(["HECHA", "NO_PUDE"], { message: "Indicá si pudiste hacer la actividad." }),
  comentario: z.string().trim().max(500, "Máximo 500 caracteres.").nullish().transform((t) => (t ? t : null)),
})

async function manejarPATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.pacienteId) {
      return NextResponse.json({ error: "Solo el paciente responde sus actividades." }, { status: 403 })
    }

    const validacion = respuestaSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.issues[0]?.message ?? "Datos inválidos", details: validacion.error.issues },
        { status: 400 },
      )
    }

    const dataSource = await initializeDatabase()
    const actividad = await dataSource.getRepository(ActividadSeguimientoEntity).findOne({
      where: { id },
      relations: ["seguimiento", "seguimiento.informe"],
    })
    const acceso = actividad ? await accesoAlInforme(dataSource, actividad.seguimiento.informe.id, session.user) : null
    if (!actividad || !acceso?.esPaciente) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    const { respuesta, comentario } = validacion.data
    const fechaRespuesta = new Date()
    await dataSource.getRepository(ActividadSeguimientoEntity).update({ id: actividad.id }, { respuesta, comentario, fechaRespuesta })

    // Al psicólogo le llega quién respondió y qué; el comentario se lee en la nota
    const paciente = acceso.pacientes.find((p) => p.id === String(session.user.pacienteId))
    const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : "Un paciente"
    const actividadCorta = actividad.descripcion.length > 60 ? `${actividad.descripcion.slice(0, 57)}...` : actividad.descripcion
    await notificarPsicologo(acceso.informe.psicologo.id, {
      tipo: "RESPUESTA_ACTIVIDAD",
      titulo: "Respuesta a una actividad",
      mensaje: `${nombre} marcó "${actividadCorta}" como ${respuesta === "HECHA" ? "hecha" : "no pudo hacerla"}${comentario ? " y dejó un comentario" : ""}.`,
    })

    return NextResponse.json({
      id: String(actividad.id),
      respuesta,
      comentario,
      fechaRespuesta: fechaRespuesta.toISOString(),
    })
  } catch (error) {
    console.error("Error al responder la actividad:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PATCH = conAuditoria(manejarPATCH, { modulo: "Informes", accion: "RESPONDER_ACTIVIDAD", detalle: "El paciente respondió una actividad de seguimiento" })
