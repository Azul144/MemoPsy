// src/app/api/psicologos/[id]/route.ts
import { NextRequest } from 'next/server';
import { PsicologoController } from '@/lib/controllers/psicologo.controller';

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  return PsicologoController.getPsicologoById(request, { params });
}