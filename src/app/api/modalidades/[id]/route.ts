// src/app/api/modalidades/[id]/route.ts
import { NextRequest } from 'next/server';
import { ModalidadController } from '@/lib/controllers/modalidad.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.getModalidadById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.updateModalidad(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModalidadController.deleteModalidad(request, { params });
}