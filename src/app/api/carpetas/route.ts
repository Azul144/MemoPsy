// src/app/api/carpetas/route.ts
// Carpetas de los pacientes del psicólogo: cuántos turnos tiene programados cada uno y qué hay en su carpeta.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { listarCarpetas } from "@/lib/carpetas/datos";

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session?.user) return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  if (!session.user.psicologoId) {
    return NextResponse.json({ message: "Solo el psicólogo tratante accede a las carpetas de sus pacientes." }, { status: 403 });
  }
  try {
    const ds = await initializeDatabase();
    return NextResponse.json(await listarCarpetas(ds, String(session.user.psicologoId)));
  } catch (error) {
    console.error("Error en GET /api/carpetas:", (error as Error)?.name);
    return NextResponse.json({ message: "No se pudieron cargar las carpetas." }, { status: 500 });
  }
}
