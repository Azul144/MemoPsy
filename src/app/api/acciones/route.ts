// src/app/api/acciones/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { AccionController } from '@/lib/controllers/accion.controller'; // Adjust path if needed

export async function GET(request: NextRequest) {
  return AccionController.getAllAcciones(request);
}

async function manejarPOST(request: NextRequest) {
  return AccionController.createAccion(request);
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Perfiles", accion: "CREAR", detalle: "Alta de acción" })
