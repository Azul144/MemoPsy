// src/app/api/personas/[id]/route.ts
import { NextRequest } from 'next/server';
import { PersonaController } from '@/lib/controllers/persona.controller';

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  return PersonaController.getPersonaById(request, { params });
}
