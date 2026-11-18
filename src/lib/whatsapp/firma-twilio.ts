// src/lib/whatsapp/firma-twilio.ts
// Verifica que un pedido al webhook venga de verdad de Twilio (cabecera X-Twilio-Signature).
// Twilio firma con HMAC-SHA1, usando el Auth Token de la cuenta, la dirección pública exacta del
// webhook seguida de cada parámetro del formulario (ordenados por nombre) como nombre + valor.
// Sin esta verificación, cualquiera podría hacerse pasar por un paciente y cancelar sus turnos.
import { createHmac, timingSafeEqual } from "node:crypto";

export function firmaTwilio(token: string, url: string, parametros: Record<string, string>): string {
  const datos = Object.keys(parametros)
    .sort()
    .reduce((acumulado, clave) => acumulado + clave + parametros[clave], url);
  return createHmac("sha1", token).update(Buffer.from(datos, "utf-8")).digest("base64");
}

export function firmaTwilioValida(
  token: string,
  url: string,
  parametros: Record<string, string>,
  firmaRecibida: string | null,
): boolean {
  if (!token || !firmaRecibida) return false;
  const esperada = Buffer.from(firmaTwilio(token, url, parametros));
  const recibida = Buffer.from(firmaRecibida);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

// Dirección pública con la que Twilio llama al webhook (tiene que coincidir letra por letra)
export function urlWebhook(): string {
  return process.env.TWILIO_WEBHOOK_URL || `${(process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")}/api/whatsapp/webhook`;
}
