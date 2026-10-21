// src/app/api/notificaciones/route.ts
// RF 3.2 / RF 3.3 - Avisos de la persona que inició sesión.
//  GET:   últimos avisos y cuántos sin leer (antes genera los recordatorios de las próximas 24 h)
//  PATCH: marca todos como leídos
// Cada uno ve solo sus propios avisos, así que no hace falta un permiso aparte.
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { NotificacionEntity } from "@/entities"
import { generarRecordatorios } from "@/lib/notificaciones/notificar"

const CANTIDAD = 20

export async function GET() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await generarRecordatorios(session.user)

    const dataSource = await initializeDatabase()
    const repositorio = dataSource.getRepository(NotificacionEntity)
    const usuarioId = Number(session.user.id)
    const [notificaciones, sinLeer] = await Promise.all([
      repositorio.find({ where: { usuarioId }, order: { fecha: "DESC", id: "DESC" }, take: CANTIDAD }),
      repositorio.count({ where: { usuarioId, leida: false } }),
    ])

    return NextResponse.json({
      sinLeer,
      notificaciones: notificaciones.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        leida: Boolean(n.leida),
        fecha: n.fecha.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error al obtener las notificaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    await dataSource
      .getRepository(NotificacionEntity)
      .update({ usuarioId: Number(session.user.id), leida: false }, { leida: true })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error al marcar las notificaciones:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
