// src/app/api/seguimientos/[id]/pdf/route.ts
// RF 2.5 - Descarga del informe de seguimiento en PDF, generado en el momento (no se guarda en el servidor).
// Lo descargan los pacientes de la nota y el psicólogo autor (para revisar lo que ve el paciente).
// Nunca incluye el contenido de la nota clínica.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { InformeSeguimientoEntity } from "@/entities"
import { accesoAlInforme, proximaSesion, seguimientoParaEnviar } from "@/lib/informes/seguimiento"
import { generarPdfSeguimiento } from "@/lib/pdf/informe-pdf"

async function manejarGET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const seguimiento = await dataSource.getRepository(InformeSeguimientoEntity).findOne({
      where: { id },
      relations: ["informe", "actividades"],
    })
    const acceso = seguimiento ? await accesoAlInforme(dataSource, seguimiento.informe.id, session.user) : null
    if (!seguimiento || !acceso || (!acceso.esAutor && !acceso.esPaciente)) {
      return NextResponse.json({ error: "No tenés acceso a este informe" }, { status: 403 })
    }

    const proxima = await proximaSesion(dataSource, String(acceso.informe.psicologo.id), acceso.pacientes.map((p) => p.id))
    const datos = seguimientoParaEnviar(seguimiento, acceso, proxima)
    const bytes = await generarPdfSeguimiento(
      {
        id: datos.id,
        fechaSesion: datos.fechaSesion,
        psicologo: datos.psicologo,
        pacientes: datos.pacientes,
        resumen: datos.resumen,
        actividades: datos.actividades,
        pautas: datos.pautas,
        avances: datos.avances,
        proximaSesion: datos.proximaSesion,
      },
      session.user.email ?? "MemoPsy",
    )

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe-seguimiento-${datos.id}.pdf"`,
        // Dato sensible: que no quede guardado en cachés intermedias
        "Cache-Control": "no-store, private",
      },
    })
  } catch (error) {
    console.error("Error al generar el PDF del informe de seguimiento:", error)
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 })
  }
}

// RF 1.4 - Cada descarga queda registrada (y los intentos sin acceso, como ACCESO_DENEGADO)
export const GET = conAuditoria(manejarGET, { modulo: "Informes", accion: "EXPORTAR_PDF", detalle: "Descarga en PDF de un informe de seguimiento" })
