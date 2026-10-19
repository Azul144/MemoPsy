// src/app/api/modulos/[id]/route.ts
import { NextRequest } from 'next/server';
import { ModuloController } from '@/lib/controllers/modulo.controller'; // Adjust path if needed

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.getModuloById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.updateModulo(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  return ModuloController.deleteModulo(request, { params });
}