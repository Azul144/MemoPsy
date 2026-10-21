// src/app/api/personas/route.ts
import { NextRequest } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { PersonaController } from '@/lib/controllers/persona.controller';

export async function GET(request: NextRequest) {
  return PersonaController.getAllPersonas(request);
}

async function manejarPOST(request: NextRequest) {
  return PersonaController.createPersona(request);
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Usuarios", accion: "CREAR", detalle: "Alta de datos personales" })
