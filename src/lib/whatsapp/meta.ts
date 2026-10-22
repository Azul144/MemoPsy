// src/lib/whatsapp/meta.ts
// Envía un mensaje de plantilla con la API oficial de WhatsApp (Cloud API de Meta). Solo se usa en el servidor.
// WhatsApp exige plantillas aprobadas para los mensajes que inicia la empresa, como los recordatorios.
// Con WHATSAPP_PLANTILLA=hello_world se puede probar con el número de prueba de Meta: esa plantilla
// viene aprobada, pero no lleva datos del turno.

type MensajePlantilla = {
  para: string; // 5493704123456
  parametros: string[]; // los {{1}}, {{2}}, ... del cuerpo de la plantilla
};

export class WhatsappError extends Error {
  constructor(public status: number) {
    super(`WhatsApp respondió con estado ${status}`);
  }
  // 4xx: el pedido está mal o el número no puede recibir (no tiene sentido reintentar)
  get definitivo() {
    return this.status >= 400 && this.status < 500 && this.status !== 429;
  }
}

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function enviarWhatsapp({ para, parametros }: MensajePlantilla): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const numeroId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numeroId) {
    throw new Error("Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID en .env.local");
  }
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const plantilla = process.env.WHATSAPP_PLANTILLA || "recordatorio_turno";
  const esPrueba = plantilla === "hello_world";

  const respuesta = await fetch(`https://graph.facebook.com/${version}/${numeroId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "template",
      template: {
        name: plantilla,
        language: { code: esPrueba ? "en_US" : process.env.WHATSAPP_IDIOMA || "es_AR" },
        ...(esPrueba
          ? {}
          : { components: [{ type: "body", parameters: parametros.map((text) => ({ type: "text", text })) }] }),
      },
    }),
  });

  if (!respuesta.ok) throw new WhatsappError(respuesta.status);
}
