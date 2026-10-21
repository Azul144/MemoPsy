// src/app/api/obras-sociales/[id]/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { ObraSocialController } from '@/lib/controllers/obra-social.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ObraSocialController.getObraSocialById(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ObraSocialController.updateObraSocial(request, { params });
}

async function manejarDELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ObraSocialController.deleteObraSocial(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "EDITAR", detalle: "Edición de obra social" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Usuarios", accion: "ELIMINAR", detalle: "Baja de obra social" })
