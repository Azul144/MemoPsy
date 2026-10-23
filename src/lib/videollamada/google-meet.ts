// src/lib/videollamada/google-meet.ts
// Crea un evento en Google Calendar con una reunión de Google Meet y devuelve su enlace.
// Solo se usa si en .env.local están GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN
// (OAuth de la cuenta del consultorio con el permiso de Calendar).
// Importante: si la app de Google Cloud está en modo "Testing", el refresh token vence a los 7 días.
// Al evento no se le pasan datos del paciente: solo un título genérico y el horario.
import { randomUUID } from "crypto";

export function googleMeetConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

async function tokenDeAcceso(): Promise<string> {
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!respuesta.ok) throw new Error(`Google OAuth respondió con estado ${respuesta.status}`);
  const datos = await respuesta.json();
  return datos.access_token;
}

export async function enlaceGoogleMeet(inicio: Date, fin: Date): Promise<string> {
  const calendario = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  const respuesta = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendario}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await tokenDeAcceso()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: "Sesión MemoPsy",
        start: { dateTime: inicio.toISOString() },
        end: { dateTime: fin.toISOString() },
        conferenceData: {
          createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
      }),
    },
  );
  if (!respuesta.ok) throw new Error(`Google Calendar respondió con estado ${respuesta.status}`);
  const evento = await respuesta.json();
  if (!evento.hangoutLink) throw new Error("Google Calendar no devolvió el enlace de Meet");
  return evento.hangoutLink;
}
