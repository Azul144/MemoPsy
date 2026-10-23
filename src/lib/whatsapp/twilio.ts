// src/lib/whatsapp/twilio.ts
// Envía el recordatorio por WhatsApp a través de Twilio. Solo se usa en el servidor.
// Sirve también con el sandbox de Twilio (número compartido +1 415 523 8886), que no pide verificar
// un negocio: cada celular se une mandando "join <código>" y la unión dura 3 días.
//  - Con TWILIO_CONTENT_SID: usa una plantilla aprobada (en el sandbox, la de recordatorio de turno:
//    "Your appointment is coming up on {{1}} at {{2}}"). Funciona aunque el paciente no haya escrito antes.
//  - Sin TWILIO_CONTENT_SID: manda el texto en español. WhatsApp solo lo entrega dentro de las 24 horas
//    después de que el paciente le escribió al número (en el sandbox, el "join" abre esa ventana).
import { fechaTurno } from "@/lib/notificaciones/notificar";
import { WhatsappError, type RecordatorioWhatsapp } from "./tipos";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const SANDBOX = "+14155238886";

export function twilioConfigurado(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function texto(r: RecordatorioWhatsapp): string {
  const enlace = r.enlace ? `\nEnlace de la videollamada: ${r.enlace}` : "";
  return `Hola 👋 Te recordamos tu turno con ${r.psicologo} el ${fechaTurno(r.inicio)} (${r.modalidad}).${enlace}\nSi no podés asistir, avisale a tu psicólogo con anticipación.\n— MemoPsy`;
}

// {{1}} día y {{2}} hora, como pide la plantilla de recordatorio del sandbox
function variables(r: RecordatorioWhatsapp): string {
  const formato = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-AR", { timeZone: ZONA_HORARIA, ...opciones }).format(r.inicio);
  return JSON.stringify({
    "1": formato({ day: "2-digit", month: "2-digit", year: "numeric" }),
    "2": formato({ hour: "2-digit", minute: "2-digit", hour12: false }),
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
