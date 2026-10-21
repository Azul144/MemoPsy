// src/app/api/seguimientos/route.ts
// RF 2.4 - Panel del paciente: todos sus informes de seguimiento, del más reciente al más viejo.
// Solo incluye lo que el psicólogo compartió; nunca el contenido de las notas clínicas.
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { InformeSeguimientoEntity } from "@/entities"
import { accesoAlInforme, proximaSesion, seguimientoParaEnviar } from "@/lib/informes/seguimiento"

export async function GET() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const pacienteId = session.user.pacienteId
    if (!pacienteId) {
      return NextResponse.json({ error: "Esta sección es para pacientes." }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const seguimientos = await dataSource
      .getRepository(InformeSeguimientoEntity)
      .createQueryBuilder("s")
      .innerJoinAndSelect("s.informe", "i")
      .leftJoinAndSelect("s.actividades", "a")
      .where("EXISTS (SELECT 1 FROM paciente_tiene_informe pti WHERE pti.informe_id = i.id AND pti.paciente_id = :pacienteId)", { pacienteId })
      .orderBy("i.fechaCreacion", "DESC")
      .addOrderBy("a.orden", "ASC")
      .getMany()

    // La próxima sesión se busca una vez por psicólogo
    const proximas = new Map<string, Date | null>()
    const lista = []
    for (const seguimiento of seguimientos) {
      const acceso = await accesoAlInforme(dataSource, seguimiento.informe.id, session.user)
      if (!acceso?.esPaciente) continue
      const psicologoId = String(acceso.informe.psicologo.id)
      if (!proximas.has(psicologoId)) {
        proximas.set(psicologoId, await proximaSesion(dataSource, psicologoId, [String(pacienteId)]))
      }
      lista.push(seguimientoParaEnviar(seguimiento, acceso, proximas.get(psicologoId) ?? null))
    }

    return NextResponse.json({ seguimientos: lista })
  } catch (error) {
    console.error("Error al listar los informes de seguimiento:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
