// src/lib/telefono.ts
// Normaliza un celular argentino al formato que usa WhatsApp: 549 + código de área + número,
// sin el 0 ni el 15 (por ejemplo "3704 15-123456" o "+54 9 3704 123456" -> "5493704123456").

export const AYUDA_CELULAR = "Escribilo con código de área, sin 0 ni 15. Por ejemplo: 3704 123456.";

// null = vacío (el celular es opcional); undefined = no se pudo interpretar
export function normalizarCelular(texto: unknown): string | null | undefined {
  if (texto == null) return null;
  if (typeof texto !== "string") return undefined;
  let digitos = texto.replace(/\D/g, "");
  if (!digitos) return null;

  if (digitos.startsWith("549")) digitos = digitos.slice(3);
  else if (digitos.startsWith("54")) digitos = digitos.slice(2);
  digitos = digitos.replace(/^0/, "");

  // Código de área de 2 a 4 cifras seguido de "15": se quita el 15 (el número queda en 10 cifras)
  if (digitos.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (digitos.slice(largoArea, largoArea + 2) === "15") {
        digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
        break;
      }
    }
  }

  return digitos.length === 10 ? `549${digitos}` : undefined;
}
