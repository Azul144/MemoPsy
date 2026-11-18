// src/app/api/whatsapp/webhook/route.ts
// Recibe los mensajes que los pacientes le mandan al número de WhatsApp de MemoPsy (Twilio).
// Es pública (Twilio no inicia sesión), por eso el middleware no la controla y acá se verifica la
// firma X-Twilio-Signature: si no coincide, se rechaza sin leer nada más.
// La respuesta va en TwiML, el formato de Twilio, y WhatsApp la entrega como contestación al paciente.
// El texto del mensaje no se guarda en ningún lado.
import { NextResponse, type NextRequest } from "next/server";
import { responderMensaje } from "@/lib/whatsapp/chatbot";
import { firmaTwilioValida, urlWebhook } from "@/lib/whatsapp/firma-twilio";

function escaparXml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function twiml(texto: string | null): NextResponse {
  const cuerpo = texto ? `<Response><Message>${escaparXml(texto)}</Message></Response>` : "<Response/>";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>${cuerpo}`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  if (process.env.WHATSAPP_CHATBOT !== "activo") {
    return new NextResponse("Chatbot desactivado", { status: 404 });
  }

  const formulario = await request.formData();
  const parametros: Record<string, string> = {};
  formulario.forEach((valor, clave) => {
    if (typeof valor === "string") parametros[clave] = valor;
  });

  const valida = firmaTwilioValida(
    process.env.TWILIO_AUTH_TOKEN ?? "",
    urlWebhook(),
    parametros,
    request.headers.get("x-twilio-signature"),
  );
  if (!valida) {
    console.error("Webhook de WhatsApp: firma de Twilio inválida");
    return new NextResponse("Firma inválida", { status: 403 });
  }

  try {
    const respuesta = await responderMensaje({
      telefono: parametros.From ?? "",
      texto: parametros.Body ?? "",
      boton: parametros.ButtonPayload || null,
    });
    return twiml(respuesta);
  } catch (error) {
    console.error("Error en el chatbot de WhatsApp:", (error as Error)?.name);
    // Aunque algo falle, la persona recibe al menos las líneas de ayuda
    return twiml(
      "Perdón, no pudimos procesar tu mensaje. Si estás pasando un momento difícil llamá al 0800 999 0091 " +
        "(gratis, 24 h) o al 911 si estás en peligro.\n— MemoPsy",
    );
  }
}
