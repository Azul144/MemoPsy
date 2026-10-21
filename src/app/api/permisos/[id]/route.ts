// src/app/api/permisos/[id]/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { PermisoController } from '@/lib/controllers/permiso.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PermisoController.getPermisoById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PermisoController.updatePermiso(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return PermisoController.deletePermiso(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Perfiles", accion: "EDITAR", detalle: "Edición de permiso" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Perfiles", accion: "ELIMINAR", detalle: "Baja de permiso" })
