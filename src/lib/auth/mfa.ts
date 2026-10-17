import { authenticator } from "otplib";
import * as bcrypt from "bcrypt";
import { descifrar } from "./cifrado";

// Acepta también el código anterior y el siguiente (±30 segundos),
// por si el reloj del celular está un poco desfasado
authenticator.options = { window: 1 };

// Un código del autenticador son exactamente 6 números
export function esCodigoTotp(codigo: string): boolean {
  return /^\d{6}$/.test(codigo);
}

export function verificarCodigoTotp(secretoCifrado: string, codigo: string): boolean {
  try {
    const secreto = descifrar(secretoCifrado);
    return authenticator.verify({ token: codigo, secret: secreto });
  } catch {
    console.error("No se pudo verificar el código MFA (revisar MFA_ENCRYPTION_KEY)");
    return false;
  }
}

// Si el código de recuperación es válido, devuelve la lista SIN ese código
// (cada código sirve una sola vez). Si no es válido, devuelve null.
export async function usarCodigoRecuperacion(
  hashesGuardados: string | null,
  codigo: string
): Promise<string | null> {
  if (!hashesGuardados) return null;

  const hashes: string[] = JSON.parse(hashesGuardados);
  const codigoNormalizado = codigo.replace(/[\s-]/g, "").toUpperCase();

  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(codigoNormalizado, hashes[i])) {
      hashes.splice(i, 1);
      return JSON.stringify(hashes);
    }
  }
  return null;
}