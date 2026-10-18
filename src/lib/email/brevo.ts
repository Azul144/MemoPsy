// src/lib/email/brevo.ts
// Envía un email usando la API de Brevo. Solo se usa en el servidor.

type Email = {
  para: string;
  asunto: string;
  html: string;
};

export async function enviarEmail({ para, asunto, html }: Email): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const remitente = process.env.BREVO_REMITENTE_EMAIL;

  if (!apiKey || !remitente) {
    throw new Error("Falta BREVO_API_KEY o BREVO_REMITENTE_EMAIL en .env.local");
  }

  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "MemoPsy", email: remitente },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: html,
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Brevo respondió con estado ${respuesta.status}`);
  }
}