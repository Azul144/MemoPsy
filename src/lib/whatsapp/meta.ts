// src/lib/whatsapp/meta.ts
// Envía el recordatorio con la API oficial de WhatsApp (Cloud API de Meta). Solo se usa en el servidor.
// WhatsApp exige plantillas aprobadas para los mensajes que inicia la empresa, como los recordatorios.
// Con WHATSAPP_PLANTILLA=hello_world se puede probar con el número de prueba de Meta: esa plantilla
// viene aprobada, pero no lleva datos del turno.
// Importante: Meta exige que el negocio esté verificado para poder enviar, incluso con el número de prueba.
import { fechaTurno } from "@/lib/notificaciones/notificar";
import { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

export function metaConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Los tres datos que completa la plantilla "recordatorio_turno": {{1}} psicólogo, {{2}} cuándo, {{3}} modalidad
function parametros(r: RecordatorioWhatsapp): string[] {
  return [r.psicologo, fechaTurno(r.inicio), r.enlace ? `${r.modalidad} - enlace: ${r.enlace}` : r.modalidad];
}

export async function enviarPorMeta(r: RecordatorioWhatsapp): Promise<void> {
  const version = process.env.WHATSAPP_API_VERSION || "v25.0";
  const plantilla = process.env.WHATSAPP_PLANTILLA || "recordatorio_turno";
  const esPrueba = plantilla === "hello_world";

  const respuesta = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: r.para,
      type: "template",
      template: {
        name: plantilla,
        language: { code: esPrueba ? "en_US" : process.env.WHATSAPP_IDIOMA || "es_AR" },
        ...(esPrueba
          ? {}
          : { components: [{ type: "body", parameters: parametros(r).map((text) => ({ type: "text", text })) }] }),
      },
    }),
  });

  if (!respuesta.ok) throw new WhatsappError(respuesta.status);
}
