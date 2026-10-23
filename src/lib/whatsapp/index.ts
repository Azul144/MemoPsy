// src/lib/whatsapp/index.ts
// Elige el proveedor de WhatsApp según WHATSAPP_PROVEEDOR: "meta" (API oficial, por defecto) o "twilio".
import { enviarPorMeta, metaConfigurado } from "./meta";
import { enviarPorTwilio, twilioConfigurado } from "./twilio";
import type { RecordatorioWhatsapp } from "./tipos";

export { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const usaTwilio = () => process.env.WHATSAPP_PROVEEDOR === "twilio";

export function whatsappConfigurado(): boolean {
  return usaTwilio() ? twilioConfigurado() : metaConfigurado();
}

export function enviarWhatsapp(recordatorio: RecordatorioWhatsapp): Promise<void> {
  return usaTwilio() ? enviarPorTwilio(recordatorio) : enviarPorMeta(recordatorio);
}
