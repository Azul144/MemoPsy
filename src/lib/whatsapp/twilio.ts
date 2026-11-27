// src/lib/whatsapp/twilio.ts
// Envía el recordatorio por WhatsApp a través de Twilio. Solo se usa en el servidor.
//  - Con TWILIO_CONTENT_SID: usa la plantilla aprobada "recordatorio_turno" (la crea
//    scripts/crear-plantilla-twilio.mjs). Tiene cuatro datos y dos botones de respuesta rápida:
//      {{1}} nombre del paciente, {{2}} psicólogo, {{3}} día y hora, {{4}} modalidad
//      Botones: "Confirmo" (CONFIRMAR) y "No puedo ir" (CANCELAR), que contesta el chatbot.
//    Funciona aunque el paciente nunca le haya escrito al número.
//  - Sin TWILIO_CONTENT_SID: manda el texto en español. WhatsApp solo lo entrega dentro de las
//    24 horas después de que el paciente le escribió al número (sirve para probar).
import { fechaTurno } from "@/lib/notificaciones/notificar";
import { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const SANDBOX = "+14155238886";

export function twilioConfigurado(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function texto(r: RecordatorioWhatsapp): string {
  return (
    `Hola ${r.paciente} 👋 Te recordamos tu turno con ${r.psicologo} el ${fechaTurno(r.inicio)} (${r.modalidad}).\n` +
    "Respondé *1* si confirmás o *2* si no podés ir.\n— MemoPsy"
  );
}

function variables(r: RecordatorioWhatsapp): string {
  return JSON.stringify({
    "1": r.paciente || "👋",
    "2": r.psicologo,
    "3": fechaTurno(r.inicio),
    "4": r.modalidad,
  });
}

export async function enviarPorTwilio(r: RecordatorioWhatsapp): Promise<void> {
  const cuenta = process.env.TWILIO_ACCOUNT_SID!;
  const desde = process.env.TWILIO_WHATSAPP_FROM || SANDBOX;
  const plantilla = process.env.TWILIO_CONTENT_SID;

  const datos = new URLSearchParams({ From: `whatsapp:${desde}`, To: `whatsapp:+${r.para}` });
  if (plantilla) {
    datos.set("ContentSid", plantilla);
    datos.set("ContentVariables", variables(r));
  } else {
    datos.set("Body", texto(r));
  }

  const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cuenta}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cuenta}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: datos,
  });

  if (!respuesta.ok) throw new WhatsappError(respuesta.status);
}

// Mensaje de texto libre (por ejemplo, el aviso de crisis al psicólogo). WhatsApp solo lo entrega dentro de
// las 24 horas después de que el destinatario le escribió al número; para entregarlo siempre hace falta
// una plantilla aprobada, como la del recordatorio.
export async function enviarTextoPorTwilio(para: string, cuerpo: string): Promise<void> {
  const cuenta = process.env.TWILIO_ACCOUNT_SID!;
  const desde = process.env.TWILIO_WHATSAPP_FROM || SANDBOX;
  const respuesta = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cuenta}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cuenta}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: `whatsapp:${desde}`, To: `whatsapp:+${para}`, Body: cuerpo }),
  });
  if (!respuesta.ok) throw new WhatsappError(respuesta.status);
}
