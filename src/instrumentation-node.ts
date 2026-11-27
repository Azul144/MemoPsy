// src/instrumentation-node.ts
// Programa el envío de los recordatorios de turno por email y por WhatsApp (RF 3.3) y la creación de
// los turnos de los horarios pactados de las próximas semanas (RF 3.1).
// Solo lo carga instrumentation.ts en el servidor Node: usa crypto y mysql, que no existen en el runtime Edge.
import { enviarRecordatoriosPorEmail } from "@/lib/notificaciones/recordatorio-email";
import { enviarRecordatoriosPorWhatsapp } from "@/lib/notificaciones/recordatorio-whatsapp";
import { initializeDatabase } from "@/lib/database";
import { generarTurnosPactados } from "@/lib/sesiones/pacto";

const MINUTOS_ENTRE_PASADAS = 10;

export function programarRecordatorios() {
  programarTurnosPactados();

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

// Turnos de los horarios pactados: al arrancar y después cada hora. Si ya existen, no se repiten.
function programarTurnosPactados() {
  if (process.env.TURNOS_PACTADOS === "inactivo") return;
  const global = globalThis as typeof globalThis & { pactosProgramados?: boolean };
  if (global.pactosProgramados) return;
  global.pactosProgramados = true;

  const pasada = async () => {
    try {
      await generarTurnosPactados(await initializeDatabase());
    } catch {
      console.error("No se pudieron generar los turnos pactados");
    }
  };
  void pasada();
  setInterval(pasada, 60 * 60 * 1000);
}
