// src/app/api/estados/[id]/route.ts
import { NextRequest } from 'next/server';
import { EstadoController } from '@/lib/controllers/estado.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.getEstadoById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.updateEstado(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return EstadoController.deleteEstado(request, { params });
}
