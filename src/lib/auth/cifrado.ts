import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM: cifra y además detecta si alguien modificó el dato guardado
const ALGORITMO = "aes-256-gcm";

function obtenerClave(): Buffer {
  const claveBase64 = process.env.MFA_ENCRYPTION_KEY;
  if (!claveBase64) {
    throw new Error("Falta MFA_ENCRYPTION_KEY en .env.local");
  }
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY tiene que ser de 32 bytes");
  }
  return clave;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12); // valor al azar, distinto cada vez
  const cipher = createCipheriv(ALGORITMO, obtenerClave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const etiqueta = cipher.getAuthTag(); // "sello" que detecta modificaciones

  // Se guarda como "iv:etiqueta:cifrado"
  return [iv, etiqueta, cifrado].map((parte) => parte.toString("base64")).join(":");
}

export function descifrar(valorGuardado: string): string {
  const [ivB64, etiquetaB64, cifradoB64] = valorGuardado.split(":");
  const decipher = createDecipheriv(ALGORITMO, obtenerClave(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(etiquetaB64, "base64"));
  const descifrado = Buffer.concat([
    decipher.update(Buffer.from(cifradoB64, "base64")),
    decipher.final(),
  ]);
  return descifrado.toString("utf8");
}