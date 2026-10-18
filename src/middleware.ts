// src/middleware.ts
// Se ejecuta ANTES de mostrar cualquier página o API de la lista de abajo (config.matcher).
// Si no hay una sesión válida, no deja pasar.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { decodificarJwt } from "@/lib/auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    decode: decodificarJwt,
  });

  // Sesión válida y usuario activo: puede pasar
  if (token && token.activo !== false) {
    return NextResponse.next();
  }

  // Sin sesión pidiendo datos a la API: respondemos 401 (no autenticado)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Sin sesión pidiendo una página: lo mandamos al login
  return NextResponse.redirect(new URL("/login", request.url));
}

// Rutas protegidas. Quedan PÚBLICAS: la landing (/), /login, /reset-password
// y lo que NextAuth necesita para iniciar sesión (/api/auth/session, /api/auth/csrf, etc.).
export const config = {
  matcher: [
    "/welcome/:path*",
    "/usuarios/:path*",
    "/sesiones/:path*",
    "/informes/:path*",
    "/perfiles/:path*",
    "/z-profile/:path*",
    "/z-register/:path*",
    "/z-pacientes/:path*",
    "/z-psicologos/:path*",
    "/api/((?!auth/).*)",
    "/api/auth/mfa/:path*",
    "/api/auth/profile/:path*",
    "/api/auth/register/:path*",
  ],
};