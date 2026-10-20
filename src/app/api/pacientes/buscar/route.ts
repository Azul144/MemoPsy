import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { PacienteEntity, PacienteTieneSesionEntity } from "@/entities"
import { Like } from "typeorm"

// Si llega psicologoId, los pacientes de ese psicólogo (los que ya tuvieron sesiones con él)
// vienen marcados con esDelPsicologo y primeros en la lista. Sin texto de búsqueda, se
// devuelven solo esos; con texto, se busca entre todos para poder sumar un paciente nuevo.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = (searchParams.get("q") || "").trim()
    const psicologoId = searchParams.get("psicologoId")

    const dataSource = await initializeDatabase()
    const pacienteRepository = dataSource.getRepository(PacienteEntity)

    const pacientesDelPsicologo = new Map<string, PacienteEntity>()
    if (psicologoId) {
      const relaciones = await dataSource.getRepository(PacienteTieneSesionEntity).find({
        where: { sesion: { psicologo: { id: psicologoId } } },
        relations: ["paciente", "paciente.persona", "paciente.obraSocial"],
      })
      for (const relacion of relaciones) {
        if (relacion.paciente?.persona) pacientesDelPsicologo.set(String(relacion.paciente.id), relacion.paciente)
      }
    }

    let pacientes: PacienteEntity[]
    if (!query && psicologoId) {
      pacientes = [...pacientesDelPsicologo.values()]
    } else if (query.length < 2) {
      pacientes = []
    } else {
      pacientes = await pacienteRepository.find({
        relations: ["persona", "obraSocial"],
        where: [{ persona: { nombre: Like(`%${query}%`) } }, { persona: { apellido: Like(`%${query}%`) } }, { persona: { dni: Like(`%${query}%`) } }],
        take: 20,
      })
    }

    const pacientesTransformados = pacientes
      .map((paciente) => ({
        id: paciente.id,
        esDelPsicologo: pacientesDelPsicologo.has(String(paciente.id)),
        persona: {
          nombre: paciente.persona.nombre,
          apellido: paciente.persona.apellido,
          dni: paciente.persona.dni,
          nombreCompleto: `${paciente.persona.nombre} ${paciente.persona.apellido}`,
        },
        obraSocial: {
          nombre: paciente.obraSocial?.nombre ?? null,
        },
      }))
      .sort(
        (a, b) =>
          Number(b.esDelPsicologo) - Number(a.esDelPsicologo) ||
          a.persona.apellido.localeCompare(b.persona.apellido, "es"),
      )

    return NextResponse.json(pacientesTransformados)
  } catch (error) {
    console.error("Error searching patients:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/*
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { PacienteEntity } from "@/entities"
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
    const pacienteRepository = dataSource.getRepository(PacienteEntity)

    const pacientes = await pacienteRepository.find({
      relations: ["persona", "obraSocial"],
      where: [{ persona: { nombre: Like(`%${query}%`) } }, { persona: { apellido: Like(`%${query}%`) } }],
      order: {
        persona: {
          apellido: "ASC",
        },
      },
      take: 10, // Limitar resultados
    })

    const pacientesTransformados = pacientes.map((paciente) => ({
      id: paciente.id,
      persona: {
        nombre: paciente.persona.nombre,
        apellido: paciente.persona.apellido,
        nombreCompleto: `${paciente.persona.nombre} ${paciente.persona.apellido}`,
      },
      obraSocial: {
        nombre: paciente.obraSocial.nombre,
      },
    }))

    return NextResponse.json(pacientesTransformados)
  } catch (error) {
    console.error("Error searching patients:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
  */
