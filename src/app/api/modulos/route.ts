// src/app/api/modulos/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { ModuloController } from '@/lib/controllers/modulo.controller'; // Adjust path if needed

export async function GET(request: NextRequest) {
  return ModuloController.getAllModulos(request);
}

async function manejarPOST(request: NextRequest) {
  return ModuloController.createModulo(request);
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Perfiles", accion: "CREAR", detalle: "Alta de módulo" })
