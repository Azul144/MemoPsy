// src/app/api/historias-clinicas/[id]/pdf/route.ts
// Descarga de la historia clínica completa en PDF ([id] = id del paciente), generada en el momento.
// Solo para el psicólogo tratante; queda en la auditoría.
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import { cargarHistoria } from "@/lib/historia-clinica/datos";
import { generarPdfHistoriaClinica } from "@/lib/pdf/historia-clinica-pdf";

async function manejarGET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.user.psicologoId) {
    return NextResponse.json({ error: "Solo el psicólogo tratante descarga la historia clínica." }, { status: 403 });
  }

  try {
    const ds = await initializeDatabase();
    const datos = await cargarHistoria(ds, id, String(session.user.psicologoId));
    if (!datos) return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
    if (!datos.historia) {
      return NextResponse.json({ error: "Este paciente todavía no tiene historia clínica." }, { status: 404 });
    }

    const bytes = await generarPdfHistoriaClinica(datos, session.user.persona?.nombreCompleto || session.user.email || "MemoPsy");
    const archivo = `historia-clinica-${datos.paciente.apellido}-${datos.paciente.nombre}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .toLowerCase();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${archivo}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error en GET /api/historias-clinicas/[id]/pdf:", (error as Error)?.name);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}

// RF 1.4 - Auditoría de la descarga (sin contenido clínico)
export const GET = conAuditoria(manejarGET, { modulo: "Historia clínica", accion: "EXPORTAR_PDF", detalle: "Descarga de la historia clínica en PDF" });
