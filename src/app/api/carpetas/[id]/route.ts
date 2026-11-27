// src/app/api/carpetas/[id]/route.ts
// Carpeta de un paciente ([id] = id del paciente): turnos, notas clínicas, seguimientos e historia clínica.
// Queda en la auditoría como una consulta (sin el contenido).
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import { cargarCarpeta } from "@/lib/carpetas/datos";

type Contexto = { params: Promise<{ id: string }> };

async function manejarGET(_request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  if (!session.user.psicologoId) {
    return NextResponse.json({ message: "Solo el psicólogo tratante accede a la carpeta del paciente." }, { status: 403 });
  }
  try {
    const ds = await initializeDatabase();
    const carpeta = await cargarCarpeta(ds, id, String(session.user.psicologoId));
    if (!carpeta) return NextResponse.json({ message: "Paciente no encontrado." }, { status: 404 });
    return NextResponse.json(carpeta);
  } catch (error) {
    console.error("Error en GET /api/carpetas/[id]:", (error as Error)?.name);
    return NextResponse.json({ message: "No se pudo cargar la carpeta." }, { status: 500 });
  }
}
export const GET = conAuditoria(manejarGET, { modulo: "Historia clínica", accion: "VER", detalle: "Consulta de la carpeta del paciente" });
