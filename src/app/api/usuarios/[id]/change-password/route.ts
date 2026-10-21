// app/api/usuarios/[id]/change-password/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { UsuarioController } from '@/lib/controllers/usuario.controller';

async function manejarPOST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return UsuarioController.changePassword(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Usuarios", accion: "CAMBIAR_CONTRASENA", detalle: "Cambio de contraseña de un usuario" })
