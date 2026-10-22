// src/instrumentation.ts
// Next.js ejecuta register() una sola vez cuando arranca el servidor.
// Acá se programa el envío de los recordatorios de turno por email y por WhatsApp (RF 3.3).
const MINUTOS_ENTRE_PASADAS = 10;

export async function register() {
  // Solo en el servidor Node (no en el runtime Edge del middleware)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Cada canal se activa a propósito, para no escribirles a pacientes reales desde una copia de prueba
  const conEmail = process.env.RECORDATORIOS_EMAIL === "activo";
  const conWhatsapp = process.env.RECORDATORIOS_WHATSAPP === "activo";
  if (!conEmail && !conWhatsapp) return;

  // En desarrollo el módulo se puede recargar: se evita programar el temporizador dos veces
  const global = globalThis as typeof globalThis & { recordatoriosProgramados?: boolean };
  if (global.recordatoriosProgramados) return;
  global.recordatoriosProgramados = true;

  const { enviarRecordatoriosPorEmail } = await import("@/lib/notificaciones/recordatorio-email");
  const { enviarRecordatoriosPorWhatsapp } = await import("@/lib/notificaciones/recordatorio-whatsapp");
  const pasada = () => {
    if (conEmail) void enviarRecordatoriosPorEmail();
    if (conWhatsapp) void enviarRecordatoriosPorWhatsapp();
  };
  pasada();
  setInterval(pasada, MINUTOS_ENTRE_PASADAS * 60 * 1000);
}
