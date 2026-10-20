// src/app/api/medios-de-pago/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { MedioDePagoEntity } from "@/entities"

export async function GET() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const medios = await dataSource.getRepository(MedioDePagoEntity).find({ order: { id: "ASC" } })
    return NextResponse.json(medios)
  } catch (error) {
    console.error("Error al obtener medios de pago:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
