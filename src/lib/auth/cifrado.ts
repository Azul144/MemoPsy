import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM: cifra y además detecta si alguien modificó el dato guardado
const ALGORITMO = "aes-256-gcm";

// Cada uso tiene su propia clave: el secreto de la verificación en dos pasos (MFA_ENCRYPTION_KEY)
// y los datos clínicos (DATOS_ENCRYPTION_KEY). Si se filtra una, la otra sigue protegiendo lo suyo.
export type VariableClave = "MFA_ENCRYPTION_KEY" | "DATOS_ENCRYPTION_KEY";

function obtenerClave(variable: VariableClave): Buffer {
  const claveBase64 = process.env[variable];
  if (!claveBase64) {
    throw new Error(`Falta ${variable} en .env.local`);
  }
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.length !== 32) {
    throw new Error(`${variable} tiene que ser de 32 bytes`);
  }
  return clave;
}

export function cifrar(texto: string, variable: VariableClave = "MFA_ENCRYPTION_KEY"): string {
  const iv = randomBytes(12); // valor al azar, distinto cada vez
  const cipher = createCipheriv(ALGORITMO, obtenerClave(variable), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const etiqueta = cipher.getAuthTag(); // "sello" que detecta modificaciones

  // Se guarda como "iv:etiqueta:cifrado"
  return [iv, etiqueta, cifrado].map((parte) => parte.toString("base64")).join(":");
}

export function descifrar(valorGuardado: string, variable: VariableClave = "MFA_ENCRYPTION_KEY"): string {
  const [ivB64, etiquetaB64, cifradoB64] = valorGuardado.split(":");
  const decipher = createDecipheriv(ALGORITMO, obtenerClave(variable), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(etiquetaB64, "base64"));
  const descifrado = Buffer.concat([
    decipher.update(Buffer.from(cifradoB64, "base64")),
    decipher.final(),
  ]);
  return descifrado.toString("utf8");
}

// "iv:etiqueta:cifrado" en base64: 12 bytes de iv (16 caracteres) y 16 de etiqueta (24 caracteres)
const FORMATO_CIFRADO = /^[A-Za-z0-9+/]{16}:[A-Za-z0-9+/]{22}==:[A-Za-z0-9+/]*={0,2}$/;

export function estaCifrado(valor: string): boolean {
  return FORMATO_CIFRADO.test(valor);
}
