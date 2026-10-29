// src/app/api/usuarios/[id]/perfiles/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { UsuarioController } from '@/lib/controllers/usuario.controller';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  // Delegates to a controller method to fetch assigned profiles for a user
  return UsuarioController.getUserProfiles(request, { params });
}

async function manejarPUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  // Delegates to a controller method to update assigned profiles for a user
  return UsuarioController.updateUserProfiles(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "ASIGNAR_PERFIL", detalle: "Cambio de perfiles asignados" })
