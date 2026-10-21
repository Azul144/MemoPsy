// src/app/api/modulos/[id]/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { ModuloController } from '@/lib/controllers/modulo.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.getModuloById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.updateModulo(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.deleteModulo(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Perfiles", accion: "EDITAR", detalle: "Edición de módulo" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Perfiles", accion: "ELIMINAR", detalle: "Baja de módulo" })
