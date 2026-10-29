// src/app/api/obras-sociales/route.ts
import { NextResponse } from "next/server"
import { getRepository } from "@/lib/database"
import { ObraSocialEntity } from "@/entities"

export async function GET() {
  try {
    const obraSocialRepo = await getRepository(ObraSocialEntity)

    const obrasSociales = await obraSocialRepo.find({
      where: { activo: true },
      order: { nombre: "ASC" },
    })

    // "Particular" (sin obra social, paga en efectivo o QR) siempre primero
    const esParticular = (nombre: string) => nombre.trim().toLowerCase() === "particular"
    obrasSociales.sort((a, b) => Number(esParticular(b.nombre)) - Number(esParticular(a.nombre)))

    return NextResponse.json(obrasSociales)
  } catch (error) {
    console.error("Error al obtener obras sociales:", error)
    return NextResponse.json({ message: "Error al cargar obras sociales" }, { status: 500 })
  }
}
