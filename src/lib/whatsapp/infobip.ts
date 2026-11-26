// src/lib/whatsapp/infobip.ts
// Envía el recordatorio por WhatsApp a través de Infobip. Solo se usa en el servidor.
//  - INFOBIP_API_KEY y INFOBIP_BASE_URL salen del portal de Infobip (Guía → Clave API y URL base de API).
//  - INFOBIP_WHATSAPP_FROM: número remitente propio. Si no está, se usa el remitente de prueba de Infobip,
//    que en la prueba gratis solo entrega a los números verificados en la cuenta. Esos números quedan
//    registrados sin el 9 de los celulares argentinos, así que con el remitente de prueba se manda sin el 9.
//  - INFOBIP_PLANTILLA: plantilla aprobada. Funciona aunque el paciente nunca le haya escrito al número.
//      · "appointment_reminder" (la trae el remitente de prueba, en inglés): {{1}} paciente, {{2}} día,
//        {{3}} hora y psicólogo. Es la que se usa por defecto con el remitente de prueba.
//      · Cualquier otra (propia, en castellano): {{1}} paciente, {{2}} psicólogo, {{3}} día y hora,
//        {{4}} modalidad, como la plantilla "recordatorio_turno" de Twilio.
//  - INFOBIP_PLANTILLA=ninguna: manda el texto en castellano. WhatsApp solo lo entrega dentro de las
//    24 horas después de que el paciente le escribió al número.
import { fechaTurno } from "@/lib/notificaciones/notificar";
import { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const REMITENTE_PRUEBA = "447860088970";
const PLANTILLA_PRUEBA = "appointment_reminder";

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

function datosPlantilla(plantilla: string, r: RecordatorioWhatsapp): string[] {
  const paciente = r.paciente || "👋";
  if (plantilla === PLANTILLA_PRUEBA) {
    const [dia, hora] = fechaTurno(r.inicio).split(" a las ");
    return [paciente, dia, `${hora} con ${r.psicologo} (MemoPsy, ${r.modalidad})`];
  }
  return [paciente, r.psicologo, fechaTurno(r.inicio), r.modalidad];
}

function datosDelPedido(r: RecordatorioWhatsapp): { ruta: string; cuerpo: unknown } {
  const propio = process.env.INFOBIP_WHATSAPP_FROM?.replace(/\D/g, "");
  const from = propio || REMITENTE_PRUEBA;
  const to = propio ? r.para : r.para.replace(/^549/, "54");
  const configurada = process.env.INFOBIP_PLANTILLA?.trim();
  const plantilla = configurada || (propio ? "" : PLANTILLA_PRUEBA);

  if (!plantilla || plantilla === "ninguna") {
    return { ruta: "/whatsapp/1/message/text", cuerpo: { from, to, content: { text: texto(r) } } };
  }
  return {
    ruta: "/whatsapp/1/message/template",
    cuerpo: {
      messages: [
        {
          from,
          to,
          content: {
            templateName: plantilla,
            templateData: { body: { placeholders: datosPlantilla(plantilla, r) } },
            language: process.env.INFOBIP_IDIOMA || (plantilla === PLANTILLA_PRUEBA ? "en" : "es_AR"),
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
