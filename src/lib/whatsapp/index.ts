// src/lib/whatsapp/index.ts
// Elige el proveedor de WhatsApp según WHATSAPP_PROVEEDOR: "meta" (API oficial, por defecto), "twilio" o "infobip".
import { enviarPorInfobip, infobipConfigurado } from "./infobip";
import { enviarPorMeta, metaConfigurado } from "./meta";
import { enviarPorTwilio, twilioConfigurado } from "./twilio";
import type { RecordatorioWhatsapp } from "./tipos";

export { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const proveedor = () => process.env.WHATSAPP_PROVEEDOR;

export function whatsappConfigurado(): boolean {
  if (proveedor() === "twilio") return twilioConfigurado();
  if (proveedor() === "infobip") return infobipConfigurado();
  return metaConfigurado();
}

export function enviarWhatsapp(recordatorio: RecordatorioWhatsapp): Promise<void> {
  if (proveedor() === "twilio") return enviarPorTwilio(recordatorio);
  if (proveedor() === "infobip") return enviarPorInfobip(recordatorio);
  return enviarPorMeta(recordatorio);
}
