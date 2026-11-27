// src/app/api/pacientes/[id]/route.ts
import { initializeDatabase } from "@/lib/database"
import { nombrePaciente } from "@/lib/auditoria/detalle"
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { PacienteController } from '@/lib/controllers/paciente.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PacienteController.getPacienteById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PacienteController.updatePaciente(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PacienteController.deletePaciente(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, {
  modulo: "Pacientes",
  accion: "EDITAR",
  detalle: async (_d, { entidadId }) => `Edición de datos del paciente: ${await nombrePaciente(await initializeDatabase(), entidadId)}`,
})
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Usuarios", accion: "ELIMINAR", detalle: "Baja de paciente" })
