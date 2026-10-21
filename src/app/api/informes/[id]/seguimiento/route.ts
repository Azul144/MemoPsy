// src/app/api/informes/[id]/seguimiento/route.ts
// RF 2.4 - Informe de seguimiento de una nota clínica.
//  GET: el psicólogo autor (con las respuestas del paciente) o un paciente de la nota
//  PUT: el psicólogo autor lo crea o lo actualiza; se avisa a los pacientes
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { ActividadSeguimientoEntity, InformeSeguimientoEntity } from "@/entities"
import { accesoAlInforme, buscarSeguimiento, proximaSesion, seguimientoParaEnviar } from "@/lib/informes/seguimiento"
import { fechaTurno, notificarPacientes } from "@/lib/notificaciones/notificar"

const textoOpcional = z.string().trim().max(5000).nullish().transform((t) => (t ? t : null))

const seguimientoSchema = z.object({
  resumen: z.string().trim().min(1, "Contale al paciente qué trabajaron en la sesión.").max(5000),
  pautas: textoOpcional,
  avances: textoOpcional,
  actividades: z
    .array(
      z.object({
        id: z.string().optional(),
        descripcion: z.string().trim().min(1, "La actividad no puede quedar vacía.").max(500, "Máximo 500 caracteres."),
      }),
    )
    .max(20, "Hasta 20 actividades por informe."),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const acceso = await accesoAlInforme(dataSource, id, session.user)
    // A quien no es el autor ni paciente de la nota, se le responde como si no existiera
    if (!acceso || (!acceso.esAutor && !acceso.esPaciente)) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 })
    }

    const seguimiento = await buscarSeguimiento(dataSource, id)
    if (!seguimiento) {
      return NextResponse.json({ seguimiento: null })
    }
    const proxima = await proximaSesion(dataSource, String(acceso.informe.psicologo.id), acceso.pacientes.map((p) => p.id))
    return NextResponse.json({ seguimiento: seguimientoParaEnviar(seguimiento, acceso, proxima) })
  } catch (error) {
    console.error("Error al obtener el informe de seguimiento:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function manejarPUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const permisos = session.user.permisos?.map((p) => p.nombre) ?? []
    if (!permisos.includes("Registrar Informe") && !permisos.includes("Editar Informe")) {
      return NextResponse.json({ error: "Sin permiso para generar informes de seguimiento" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const acceso = await accesoAlInforme(dataSource, id, session.user)
    if (!acceso || !acceso.esAutor) {
      return NextResponse.json({ error: "Solo el psicólogo autor de la nota puede armar su informe de seguimiento." }, { status: 403 })
    }
    if (acceso.pacientes.length === 0) {
      return NextResponse.json({ error: "La nota no tiene pacientes asociados: no hay a quién compartirle el informe." }, { status: 400 })
    }

    const validacion = seguimientoSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json(
        { error: validacion.error.issues[0]?.message ?? "Datos inválidos", details: validacion.error.issues },
        { status: 400 },
      )
    }
    const { resumen, pautas, avances, actividades } = validacion.data

    const existente = await buscarSeguimiento(dataSource, id)
    const seguimientoId = await dataSource.transaction(async (manager) => {
      let seguimiento: InformeSeguimientoEntity
      if (existente) {
        existente.resumen = resumen
        existente.pautas = pautas
        existente.avances = avances
        existente.fechaActualizacion = new Date()
        seguimiento = await manager.save(InformeSeguimientoEntity, existente)
      } else {
        seguimiento = await manager.save(
          manager.create(InformeSeguimientoEntity, { informe: acceso.informe, resumen, pautas, avances }),
        )
      }

      // Actividades: las que siguen conservan la respuesta del paciente, salvo que cambie el texto
      const anteriores = new Map((existente?.actividades ?? []).map((a) => [String(a.id), a]))
      const quedan = new Set<string>()
      for (const [orden, actividad] of actividades.entries()) {
        const anterior = actividad.id ? anteriores.get(actividad.id) : undefined
        if (anterior) {
          quedan.add(String(anterior.id))
          const cambioTexto = anterior.descripcion !== actividad.descripcion
          await manager.update(ActividadSeguimientoEntity, { id: anterior.id }, {
            descripcion: actividad.descripcion,
            orden,
            ...(cambioTexto && { respuesta: null, comentario: null, fechaRespuesta: null }),
          })
        } else {
          await manager.insert(ActividadSeguimientoEntity, {
            seguimiento: { id: seguimiento.id } as InformeSeguimientoEntity,
            descripcion: actividad.descripcion,
            orden,
          })
        }
      }
      const borrar = [...anteriores.keys()].filter((actividadId) => !quedan.has(actividadId))
      if (borrar.length > 0) await manager.delete(ActividadSeguimientoEntity, borrar)
      return seguimiento.id
    })

    const persona = acceso.informe.psicologo?.persona
    const quien = persona ? `${persona.nombre} ${persona.apellido}` : "Tu psicólogo/a"
    await notificarPacientes(acceso.pacientes.map((p) => p.id), {
      tipo: "SEGUIMIENTO",
      titulo: existente ? "Informe de seguimiento actualizado" : "Nuevo informe de seguimiento",
      mensaje: `${quien} ${existente ? "actualizó" : "te compartió"} el informe de la sesión del ${fechaTurno(acceso.informe.fechaCreacion).split(" a las")[0]}. Lo encontrás en Informes.`,
    })

    const guardado = await buscarSeguimiento(dataSource, id)
    const proxima = await proximaSesion(dataSource, String(acceso.informe.psicologo.id), acceso.pacientes.map((p) => p.id))
    return NextResponse.json(
      { id: String(seguimientoId), seguimiento: guardado ? seguimientoParaEnviar(guardado, acceso, proxima) : null },
      { status: existente ? 200 : 201 },
    )
  } catch (error) {
    console.error("Error al guardar el informe de seguimiento:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta (sin contenido clínico en el detalle)
export const PUT = conAuditoria(manejarPUT, { modulo: "Informes", accion: "EDITAR", detalle: "Informe de seguimiento para el paciente" })
