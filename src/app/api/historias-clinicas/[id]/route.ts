// src/app/api/historias-clinicas/[id]/route.ts
// Historia clínica de un paciente ([id] = id del paciente) para el psicólogo que la consulta.
//  - GET: datos del paciente, la historia (o null si todavía no se abrió) y la evolución.
//  - PUT: crea o actualiza la historia. Queda en la auditoría, nunca con el contenido.
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { conAuditoria } from "@/lib/auditoria/con-auditoria";
import { HistoriaClinicaEntity, PacienteEntity } from "@/entities";
import { atiendeAlPaciente, cargarHistoria, validarHistoria } from "@/lib/historia-clinica/datos";

type Contexto = { params: Promise<{ id: string }> };

async function psicologoDeLaSesion(): Promise<{ error: NextResponse } | { psicologoId: string }> {
  const session = await getServerSession(authConfig);
  if (!session?.user) return { error: NextResponse.json({ message: "No autorizado" }, { status: 401 }) };
  if (!session.user.psicologoId) {
    return { error: NextResponse.json({ message: "Solo el psicólogo tratante accede a la historia clínica." }, { status: 403 }) };
  }
  return { psicologoId: String(session.user.psicologoId) };
}

async function manejarGET(_request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const auth = await psicologoDeLaSesion();
  if ("error" in auth) return auth.error;
  try {
    const ds = await initializeDatabase();
    const datos = await cargarHistoria(ds, id, auth.psicologoId);
    if (!datos) return NextResponse.json({ message: "Paciente no encontrado." }, { status: 404 });
    return NextResponse.json(datos);
  } catch (error) {
    console.error("Error en GET /api/historias-clinicas/[id]:", (error as Error)?.name);
    return NextResponse.json({ message: "No se pudo cargar la historia clínica." }, { status: 500 });
  }
}

async function manejarPUT(request: NextRequest, { params }: Contexto) {
  const { id } = await params;
  const auth = await psicologoDeLaSesion();
  if ("error" in auth) return auth.error;

  const resultado = validarHistoria(await request.json().catch(() => null));
  if ("error" in resultado) return NextResponse.json({ message: resultado.error }, { status: 400 });

  try {
    const ds = await initializeDatabase();
    const paciente = await ds.getRepository(PacienteEntity).findOne({ where: { id } });
    if (!paciente || !(await atiendeAlPaciente(ds, id, auth.psicologoId))) {
      return NextResponse.json({ message: "Paciente no encontrado." }, { status: 404 });
    }

    const repo = ds.getRepository(HistoriaClinicaEntity);
    const existente = await repo.findOne({ where: { paciente: { id }, psicologo: { id: auth.psicologoId } } });
    const historia = existente ?? repo.create({ paciente: { id }, psicologo: { id: auth.psicologoId } });
    Object.assign(historia, resultado.datos, { fechaActualizacion: new Date() });
    const guardada = await repo.save(historia);

    return NextResponse.json({ id: String(guardada.id), nueva: !existente, fechaActualizacion: guardada.fechaActualizacion });
  } catch (error) {
    console.error("Error en PUT /api/historias-clinicas/[id]:", (error as Error)?.name);
    return NextResponse.json({ message: "No se pudo guardar la historia clínica." }, { status: 500 });
  }
}

// RF 1.4 - Auditoría: quién consultó o modificó la historia de qué paciente, sin el contenido
export const GET = conAuditoria(manejarGET, { modulo: "Historia clínica", accion: "VER", detalle: "Consulta de la historia clínica" });
export const PUT = conAuditoria(manejarPUT, {
  modulo: "Historia clínica",
  accion: "EDITAR",
  detalle: (datos) => (datos?.nueva ? "Apertura de la historia clínica" : "Actualización de la historia clínica"),
});
