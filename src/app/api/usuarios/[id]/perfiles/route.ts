// src/app/api/usuarios/[id]/perfiles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UsuarioController } from '@/lib/controllers/usuario.controller';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  // Delegates to a controller method to fetch assigned profiles for a user
  return UsuarioController.getUserProfiles(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  // Delegates to a controller method to update assigned profiles for a user
  return UsuarioController.updateUserProfiles(request, { params });
}
