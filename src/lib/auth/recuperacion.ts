// src/lib/auth/recuperacion.ts
// El "enlace secreto" para restablecer la contraseña.
import { randomBytes, createHash } from "crypto";

export const MINUTOS_VALIDEZ = 30;

// Genera un token al azar (64 caracteres, imposible de adivinar).
// Al usuario le mandamos el TOKEN; en la base guardamos solo su HASH.
export function generarToken() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

// SHA-256: la "huella" del token. Si alguien roba la base, con la huella no puede armar el enlace.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}