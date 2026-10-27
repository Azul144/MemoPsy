// src/instrumentation-node.ts
// Programa el envío de los recordatorios de turno por email y por WhatsApp (RF 3.3).
// Solo lo carga instrumentation.ts en el servidor Node: usa crypto y mysql, que no existen en el runtime Edge.
import { enviarRecordatoriosPorEmail } from "@/lib/notificaciones/recordatorio-email";
import { enviarRecordatoriosPorWhatsapp } from "@/lib/notificaciones/recordatorio-whatsapp";

const MINUTOS_ENTRE_PASADAS = 10;

export function programarRecordatorios() {
  // Cada canal se activa a propósito, para no escribirles a pacientes reales desde una copia de prueba
  const conEmail = process.env.RECORDATORIOS_EMAIL === "activo";
  const conWhatsapp = process.env.RECORDATORIOS_WHATSAPP === "activo";
  if (!conEmail && !conWhatsapp) return;

  // En desarrollo el módulo se puede recargar: se evita programar el temporizador dos veces
  const global = globalThis as typeof globalThis & { recordatoriosProgramados?: boolean };
  if (global.recordatoriosProgramados) return;
  global.recordatoriosProgramados = true;

  const pasada = () => {
    if (conEmail) void enviarRecordatoriosPorEmail();
    if (conWhatsapp) void enviarRecordatoriosPorWhatsapp();
  };
  pasada();
  setInterval(pasada, MINUTOS_ENTRE_PASADAS * 60 * 1000);
}
