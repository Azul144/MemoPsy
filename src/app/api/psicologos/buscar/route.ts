import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { PsicologoEntity } from "@/entities"
import { Like } from "typeorm"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""

    const dataSource = await initializeDatabase()
    const psicologoRepository = dataSource.getRepository(PsicologoEntity)

    // Sin texto devuelve todos (para mostrar la lista al hacer clic); con texto busca por nombre, apellido o especialidad
    const psicologos = await psicologoRepository.find({
      relations: ["persona"],
      where: [
        { persona: { nombre: Like(`%${query}%`) } },
        { persona: { apellido: Like(`%${query}%`) } },
        { especialidad: Like(`%${query}%`) },
      ],
      order: {
        persona: {
          apellido: "ASC",
        },
      },
      take: 50,
    })

    const psicologosTransformados = psicologos.map((psicologo) => ({
      id: psicologo.id,
      especialidad: psicologo.especialidad,
      numeroLicencia: psicologo.numeroLicencia,
      persona: {
        nombre: psicologo.persona.nombre,
        apellido: psicologo.persona.apellido,
        nombreCompleto: `${psicologo.persona.nombre} ${psicologo.persona.apellido}`,
      },
    }))

    return NextResponse.json(psicologosTransformados)
  } catch (error) {
    console.error("Error searching psychologists:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
