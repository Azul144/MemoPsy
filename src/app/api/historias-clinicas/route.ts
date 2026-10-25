// src/app/api/historias-clinicas/route.ts
// Lista de pacientes del psicólogo, con el estado de su historia clínica.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { pacientesDelPsicologo } from "@/lib/historia-clinica/datos";

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  if (!session.user.psicologoId) {
    return NextResponse.json({ message: "Solo el psicólogo tratante accede a las historias clínicas." }, { status: 403 });
  }
  try {
    const ds = await initializeDatabase();
    return NextResponse.json(await pacientesDelPsicologo(ds, String(session.user.psicologoId)));
  } catch (error) {
    console.error("Error en GET /api/historias-clinicas:", (error as Error)?.name);
    return NextResponse.json({ message: "No se pudo cargar la lista de pacientes." }, { status: 500 });
  }
}
