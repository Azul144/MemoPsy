// src/app/api/modalidades/[id]/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { ModalidadController } from '@/lib/controllers/modalidad.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.getModalidadById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.updateModalidad(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.deleteModalidad(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Sesiones", accion: "EDITAR", detalle: "Edición de modalidad" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Sesiones", accion: "ELIMINAR", detalle: "Baja de modalidad" })
