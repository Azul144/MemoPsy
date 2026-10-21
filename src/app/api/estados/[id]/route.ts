// src/app/api/estados/[id]/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { EstadoController } from '@/lib/controllers/estado.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.getEstadoById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.updateEstado(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.deleteEstado(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Sesiones", accion: "EDITAR", detalle: "Edición de estado de turno" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Sesiones", accion: "ELIMINAR", detalle: "Baja de estado de turno" })
