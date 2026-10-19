// src/middleware.ts
// Se ejecuta ANTES de mostrar cualquier página o API de la lista de abajo (config.matcher).
// 1) Si no hay una sesión válida, no deja pasar.
// 2) Si hay sesión pero el rol no tiene el permiso necesario (reglas-acceso.ts), tampoco.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { decodificarJwt } from "@/lib/auth/jwt";
import { tieneAcceso } from "@/lib/auth/reglas-acceso";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esApi = pathname.startsWith("/api/");

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    decode: decodificarJwt,
  });

  // 1) Sin sesión (o usuario desactivado)
  if (!token || token.activo === false) {
    if (esApi) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2) Con sesión: ¿su rol tiene permiso para esto?
  const permisos = Array.isArray(token.permisos)
    ? (token.permisos as { nombre?: string }[]).map((p) => p?.nombre).filter((n): n is string => Boolean(n))
    : [];

  if (!tieneAcceso(pathname, request.method, permisos)) {
    if (esApi) {
      return NextResponse.json({ error: "No tenés permiso para realizar esta acción." }, { status: 403 });
    }
    // Página sin permiso: vuelve al panel de bienvenida con un aviso
    const destino = new URL("/welcome", request.url);
    destino.searchParams.set("sinPermiso", "1");
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

// Rutas protegidas. Quedan PÚBLICAS: la landing (/), /login, /olvide-password, /reset-password
// y lo que NextAuth necesita para iniciar sesión (/api/auth/session, /api/auth/csrf, etc.).
export const config = {
  matcher: [
    "/welcome/:path*",
    "/usuarios/:path*",
    "/sesiones/:path*",
    "/informes/:path*",
    "/perfiles/:path*",
    "/api/((?!auth/).*)",
    "/api/auth/mfa/:path*",
  ],
};
