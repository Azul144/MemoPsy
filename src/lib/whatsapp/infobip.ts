// src/lib/whatsapp/infobip.ts
// Envía el recordatorio por WhatsApp a través de Infobip. Solo se usa en el servidor.
//  - INFOBIP_API_KEY y INFOBIP_BASE_URL salen del portal de Infobip (Guía → Clave API y URL base de API).
//  - INFOBIP_WHATSAPP_FROM: número remitente. Si no está, se usa el remitente de prueba de Infobip,
//    que en la prueba gratis solo entrega a los números verificados en la cuenta.
//  - Con INFOBIP_PLANTILLA: usa esa plantilla aprobada. Sus datos, en orden, son
//      {{1}} nombre del paciente, {{2}} psicólogo, {{3}} día y hora, {{4}} modalidad
//    (como la plantilla "recordatorio_turno" de Twilio). Funciona aunque el paciente nunca haya escrito.
//  - Sin INFOBIP_PLANTILLA: manda el texto en español. WhatsApp solo lo entrega dentro de las 24 horas
//    después de que el paciente le escribió al número (sirve para probar).
import { fechaTurno } from "@/lib/notificaciones/notificar";
import { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const REMITENTE_PRUEBA = "447860088970";

export function infobipConfigurado(): boolean {
  return Boolean(process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL);
}

function urlBase(): string {
  const base = process.env.INFOBIP_BASE_URL!.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(base) ? base : `https://${base}`;
}

function texto(r: RecordatorioWhatsapp): string {
  const enlace = r.enlace ? `\nEnlace de la videollamada: ${r.enlace}` : "";
  return (
    `Hola ${r.paciente} 👋 Te recordamos tu turno con ${r.psicologo} el ${fechaTurno(r.inicio)} (${r.modalidad}).${enlace}\n` +
    "Respondé *1* si confirmás o *2* si no podés ir.\n— MemoPsy"
  );
}

function datosDelPedido(r: RecordatorioWhatsapp): { ruta: string; cuerpo: unknown } {
  const from = (process.env.INFOBIP_WHATSAPP_FROM || REMITENTE_PRUEBA).replace(/\D/g, "");
  const plantilla = process.env.INFOBIP_PLANTILLA;

  if (!plantilla) {
    return { ruta: "/whatsapp/1/message/text", cuerpo: { from, to: r.para, content: { text: texto(r) } } };
  }
  return {
    ruta: "/whatsapp/1/message/template",
    cuerpo: {
      messages: [
        {
          from,
          to: r.para,
          content: {
            templateName: plantilla,
            templateData: {
              body: { placeholders: [r.paciente || "👋", r.psicologo, fechaTurno(r.inicio), r.modalidad] },
            },
            language: process.env.INFOBIP_IDIOMA || "es_AR",
          },
        },
      ],
    },
  };
}

export async function enviarPorInfobip(r: RecordatorioWhatsapp): Promise<void> {
  const { ruta, cuerpo } = datosDelPedido(r);
  const respuesta = await fetch(`${urlBase()}${ruta}`, {
    method: "POST",
    headers: {
      Authorization: `App ${process.env.INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(cuerpo),
  });

  if (!respuesta.ok) throw new WhatsappError(respuesta.status);
}
