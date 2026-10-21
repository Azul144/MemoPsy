// src/app/api/pacientes/[id]/route.ts
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
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "EDITAR", detalle: "Edición de datos del paciente" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Usuarios", accion: "ELIMINAR", detalle: "Baja de paciente" })
