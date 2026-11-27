// app/api/usuarios/[id]/toggle-status/route.ts
import { initializeDatabase } from "@/lib/database"
import { cuentaActiva, describirUsuario } from "@/lib/auditoria/detalle"
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { UsuarioController } from '@/lib/controllers/usuario.controller';

async function manejarPATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return UsuarioController.toggleUsuarioStatus(request, { params });
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PATCH = conAuditoria(manejarPATCH, {
  modulo: "Usuarios",
  accion: "CAMBIAR_ESTADO",
  detalle: async (_d, { entidadId }) => {
    const ds = await initializeDatabase()
    const activa = await cuentaActiva(ds, entidadId)
    return `${activa === false ? "Desactivó" : "Activó"} la cuenta: ${await describirUsuario(ds, entidadId)}`
  },
})
