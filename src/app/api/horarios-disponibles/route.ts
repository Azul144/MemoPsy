// src/app/api/horarios-disponibles/route.ts
// RF 4.3 - Franjas semanales en las que el psicólogo acepta que sus pacientes reprogramen turnos.
//  GET: las franjas del psicólogo (el propio, o ?psicologoId= para recepción)
//  PUT: reemplaza todas las franjas por las que se envían
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { alcanceSesiones } from "@/lib/auth/alcance-sesiones"
import { initializeDatabase } from "@/lib/database"
import { HorarioDisponibleEntity } from "@/entities"

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const horariosSchema = z.object({
  psicologoId: z.coerce.number().int().positive().optional(),
  franjas: z
    .array(
      z.object({
        diaSemana: z.number().int().min(1, "Solo de lunes a viernes").max(5, "Solo de lunes a viernes"),
        horaInicio: z.string().regex(HORA, "Hora inválida"),
        horaFin: z.string().regex(HORA, "Hora inválida"),
      }),
    )
    .max(50),
})

type Usuario = Parameters<typeof alcanceSesiones>[0] & { permisos?: { nombre?: string }[] }

// De qué psicólogo se leen/guardan las franjas. El psicólogo solo maneja las suyas;
// recepción (que gestiona toda la agenda) puede manejar las de cualquiera.
function psicologoDestino(usuario: Usuario, pedido: string | number | null | undefined, editar: boolean) {
  const alcance = alcanceSesiones(usuario)
  if (alcance.tipo === "todas") {
    const puedeEditar = (usuario.permisos ?? []).some((p) => p?.nombre === "Editar Sesión")
    if (editar && !puedeEditar) return null
    return pedido != null ? String(pedido) : usuario.psicologoId ? String(usuario.psicologoId) : null
  }
  if (alcance.tipo === "psicologo" && (pedido == null || String(pedido) === alcance.id)) return alcance.id
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const psicologoId = psicologoDestino(session.user, request.nextUrl.searchParams.get("psicologoId"), false)
    if (!psicologoId) {
      return NextResponse.json({ error: "Sin permiso para ver estos horarios" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const franjas = await dataSource.getRepository(HorarioDisponibleEntity).find({
      where: { psicologoId: Number(psicologoId) },
      order: { diaSemana: "ASC", horaInicio: "ASC" },
    })
    return NextResponse.json({
      psicologoId,
      franjas: franjas.map((f) => ({ diaSemana: f.diaSemana, horaInicio: f.horaInicio.slice(0, 5), horaFin: f.horaFin.slice(0, 5) })),
    })
  } catch (error) {
    console.error("Error al obtener los horarios disponibles:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function manejarPUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const validacion = horariosSchema.safeParse(await request.json())
    if (!validacion.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validacion.error.issues }, { status: 400 })
    }
    const { franjas } = validacion.data

    const psicologoId = psicologoDestino(session.user, validacion.data.psicologoId, true)
    if (!psicologoId) {
      return NextResponse.json({ error: "Sin permiso para modificar estos horarios" }, { status: 403 })
    }

    // Cada franja debe terminar después de empezar y no pisarse con otra del mismo día
    const errores: { path: (string | number)[]; message: string }[] = []
    franjas.forEach((f, i) => {
      if (f.horaFin <= f.horaInicio) {
        errores.push({ path: [i, "horaFin"], message: "La hora de fin debe ser posterior a la de inicio." })
        return
      }
      const pisada = franjas.some(
        (otra, j) => j !== i && otra.diaSemana === f.diaSemana && otra.horaInicio < f.horaFin && otra.horaFin > f.horaInicio,
      )
      if (pisada) errores.push({ path: [i, "horaInicio"], message: "Se superpone con otra franja del mismo día." })
    })
    if (errores.length > 0) {
      return NextResponse.json({ error: errores[0].message, details: errores }, { status: 400 })
    }

    const dataSource = await initializeDatabase()
    await dataSource.transaction(async (manager) => {
      await manager.delete(HorarioDisponibleEntity, { psicologoId: Number(psicologoId) })
      if (franjas.length > 0) {
        await manager.insert(
          HorarioDisponibleEntity,
          franjas.map((f) => ({ psicologoId: Number(psicologoId), diaSemana: f.diaSemana, horaInicio: `${f.horaInicio}:00`, horaFin: `${f.horaFin}:00` })),
        )
      }
    })

    return NextResponse.json({ ok: true, psicologoId, franjas })
  } catch (error) {
    console.error("Error al guardar los horarios disponibles:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Sesiones", accion: "EDITAR", detalle: "Horarios habilitados para reprogramar turnos" })
