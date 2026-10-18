// src/lib/auth/jwt.ts
// Cómo se firma y se verifica el token de sesión.
// Lo usan auth-config.ts (al crear la sesión) y middleware.ts (al proteger páginas).
import { SignJWT, jwtVerify } from "jose";
import type { JWT, JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";

function clave(secret: JWTEncodeParams["secret"]) {
  return new TextEncoder().encode(secret as string);
}

export async function codificarJwt({ token, secret }: JWTEncodeParams): Promise<string> {
  return await new SignJWT(token ?? {})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(clave(secret));
}

export async function decodificarJwt({ token, secret }: JWTDecodeParams): Promise<JWT | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(secret), { algorithms: ["HS256"] });
    return payload as JWT;
  } catch {
    return null; // token falso, modificado o vencido
  }
}