// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";

// DESACTIVADO por seguridad: la versión anterior permitía cambiar la contraseña
// de cualquier usuario sabiendo solo su email. Se rehace en el paso L4 con un
// enlace secreto de un solo uso.
export async function POST() {
  return NextResponse.json(
    { message: "La recuperación de contraseña está temporalmente deshabilitada." },
    { status: 503 }
  );
}