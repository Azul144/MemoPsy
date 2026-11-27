// src/lib/whatsapp/index.ts
// Elige el proveedor de WhatsApp según WHATSAPP_PROVEEDOR: "meta" (API oficial, por defecto), "twilio" o "infobip".
import { enviarPorInfobip, enviarTextoPorInfobip, infobipConfigurado } from "./infobip";
import { enviarPorMeta, enviarTextoPorMeta, metaConfigurado } from "./meta";
import { enviarPorTwilio, enviarTextoPorTwilio, twilioConfigurado } from "./twilio";
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

// Texto libre a un celular (aviso de crisis al psicólogo). Devuelve false si no hay WhatsApp configurado:
// en ese caso el aviso queda en la campanita y el email.
export async function enviarTextoWhatsapp(para: string, cuerpo: string): Promise<boolean> {
  if (!whatsappConfigurado()) return false;
  if (proveedor() === "infobip") await enviarTextoPorInfobip(para, cuerpo);
  else if (proveedor() === "twilio") await enviarTextoPorTwilio(para, cuerpo);
  else await enviarTextoPorMeta(para, cuerpo);
  return true;
}
