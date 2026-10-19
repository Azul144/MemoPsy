import { authenticator } from "otplib";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { cifrar, descifrar } from "./cifrado";

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
// ---------- Activación del MFA (paso L3) ----------


// Crea el secreto del autenticador: lo devolvemos en claro (para el QR) y cifrado (para la base)
export function generarSecretoMfa() {
  const secreto = authenticator.generateSecret(20);
  return { secreto, secretoCifrado: cifrar(secreto) };
}

// Arma la imagen del QR que se escanea con Google Authenticator, Microsoft Authenticator, etc.
export async function generarQrMfa(email: string, secreto: string): Promise<string> {
  const uri = authenticator.keyuri(email, "MemoPsy", secreto);
  return await QRCode.toDataURL(uri, { margin: 1, width: 240 });
}

// 8 códigos de recuperación tipo "K7PM-3QXD", sin letras que se confunden (0/O, 1/I/L)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function crearCodigosRecuperacion(cantidad = 8) {
  const codigos: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const bytes = randomBytes(8);
    const letras = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
    codigos.push(`${letras.slice(0, 4)}-${letras.slice(4)}`);
  }
  // En la base se guarda solo el hash de cada código (como con las contraseñas)
  const hashes = await Promise.all(codigos.map((c) => bcrypt.hash(c.replace("-", ""), 10)));
  return { codigos, hashesGuardados: JSON.stringify(hashes) };
}
