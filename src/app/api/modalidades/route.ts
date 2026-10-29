import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { ModalidadEntity } from "@/entities"

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const modalidadRepository = dataSource.getRepository(ModalidadEntity)

    const modalidades = await modalidadRepository.find({
      order: {
        nombre: "ASC",
      },
    })

    return NextResponse.json(modalidades)
  } catch (error) {
    console.error("Error fetching modalities:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
