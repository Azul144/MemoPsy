// app/api/usuarios/me/route.ts
import { UsuarioController } from '@/lib/controllers/usuario.controller';

export async function GET() {
  return UsuarioController.getCurrentUser();
}