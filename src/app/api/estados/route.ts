// src/app/api/estados/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { EstadoEntity } from "@/entities"

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const estadoRepository = dataSource.getRepository(EstadoEntity)

    const estados = await estadoRepository.find({
      order: {
        nombre: "ASC",
      },
    })

    return NextResponse.json(estados)
  } catch (error) {
    console.error("Error fetching states:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

