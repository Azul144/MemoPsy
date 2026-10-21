// src/app/api/informes/[id]/pdf/route.ts
// RF 2.5 - Descarga de una nota clínica en PDF, generado en el momento (no se guarda en el servidor).
//  - Psicólogo autor: la nota completa.
//  - Paciente asociado: solo si la nota no es privada, en su versión para el paciente.
//  - Cualquier otra persona: acceso denegado (y queda en la auditoría).
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { InformeEntity, PacienteTieneInformeEntity } from "@/entities"
import { generarPdfInforme } from "@/lib/pdf/informe-pdf"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"

async function manejarGET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const { user } = session
    if (!user.permisos?.some((p) => p.nombre === "Ver Informes")) {
      return NextResponse.json({ error: "No tenés permiso para ver informes" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const informe = await dataSource.getRepository(InformeEntity).findOne({
      where: { id },
      relations: ["psicologo", "psicologo.persona"],
    })
    if (!informe) {
      return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 })
    }

    const asociados = await dataSource.getRepository(PacienteTieneInformeEntity).find({
      where: { informe: { id: informe.id } },
      relations: ["paciente", "paciente.persona"],
    })

    const esAutor = !!user.psicologoId && String(informe.psicologo?.id) === String(user.psicologoId)
    const esPacienteAsociado =
      !!user.pacienteId && asociados.some((a) => String(a.paciente.id) === String(user.pacienteId))

    let vista: "psicologo" | "paciente"
    if (esAutor) {
      vista = "psicologo"
    } else if (esPacienteAsociado && !informe.esPrivado) {
      vista = "paciente"
    } else {
      return NextResponse.json({ error: "No tenés acceso a este informe" }, { status: 403 })
    }

    const persona = informe.psicologo?.persona
    const bytes = await generarPdfInforme(
      {
        id: String(informe.id),
        titulo: informe.titulo,
        contenido: informe.contenido,
        etiquetas: informe.etiquetas,
        fechaCreacion: informe.fechaCreacion,
        esPrivado: informe.esPrivado,
        psicologo: persona ? `${persona.nombre} ${persona.apellido}` : null,
        pacientes: asociados.map((a) => ({
          nombre: a.paciente.persona.nombre,
          apellido: a.paciente.persona.apellido,
          // El DNI solo va en la nota del profesional
          dni: vista === "psicologo" ? a.paciente.persona.dni : null,
        })),
      },
      { vista, generadoPor: user.email ?? "MemoPsy" },
    )

    const archivo = vista === "psicologo" ? `nota-clinica-${informe.id}.pdf` : `informe-${informe.id}.pdf`
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${archivo}"`,
        // Dato sensible: que no quede guardado en cachés intermedias
        "Cache-Control": "no-store, private",
      },
    })
  } catch (error) {
    console.error("Error al generar el PDF del informe:", error)
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 })
  }
}

// RF 1.4 - Cada descarga queda registrada (y los intentos sin acceso, como ACCESO_DENEGADO)
export const GET = conAuditoria(manejarGET, { modulo: "Informes", accion: "EXPORTAR_PDF", detalle: "Descarga en PDF de una nota clínica" })
