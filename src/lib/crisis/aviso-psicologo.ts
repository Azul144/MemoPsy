// src/lib/crisis/aviso-psicologo.ts
// RF 4.3 - Aviso de crisis al psicólogo. El paciente que inició sesión toca «Avisar a mi psicólogo/a»
// (un solo toque, sin elegir qué le pasa). Le llega al profesional por la campanita de MemoPsy, por WhatsApp
// (si tiene celular cargado) y por email (si tiene casilla real), con el día y la hora.
import { Like, MoreThan } from "typeorm";
import { initializeDatabase } from "@/lib/database";
import { NotificacionEntity } from "@/entities";
import { enviarEmail } from "@/lib/email/brevo";
import { enviarTextoWhatsapp } from "@/lib/whatsapp";
import { psicologosDelPaciente } from "@/lib/whatsapp/alerta-crisis";

// Si el paciente vuelve a avisar en este lapso, no se repite el aviso
const MINUTOS_SIN_REPETIR = 10;

export type ResultadoAviso = { avisados: number; repetido: boolean; canales: string[] };

function fechaYHora(fecha: Date) {
  const zona = { timeZone: "America/Argentina/Buenos_Aires" } as const;
  return {
    // "jueves 26 de noviembre" (sin la coma que agrega el formato de fecha)
    dia: fecha.toLocaleDateString("es-AR", { ...zona, weekday: "long", day: "numeric", month: "long" }).replace(",", ""),
    hora: fecha.toLocaleTimeString("es-AR", { ...zona, hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export async function avisarCrisisAlPsicologo(pacienteId: number, paciente: string): Promise<ResultadoAviso> {
  const psicologos = await psicologosDelPaciente(pacienteId);
  if (psicologos.length === 0) return { avisados: 0, repetido: false, canales: [] };

  const ahora = new Date();
  const { dia, hora } = fechaYHora(ahora);
  const titulo = "Aviso de crisis de un paciente";
  const inicio = `${paciente} te avisó desde MemoPsy`;
  const mensaje = `${inicio} el ${dia} a las ${hora} que está atravesando un momento difícil. Comunicate con la persona lo antes posible.`;

  const dataSource = await initializeDatabase();
  const repo = dataSource.getRepository(NotificacionEntity);

  // Si toca el botón varias veces seguidas, el psicólogo recibe un solo aviso.
  const desde = new Date(ahora.getTime() - MINUTOS_SIN_REPETIR * 60 * 1000);
  const previo = await repo.findOne({
    where: { usuarioId: psicologos[0].usuarioId, tipo: "CRISIS", fecha: MoreThan(desde), mensaje: Like(`${inicio}%`) },
    order: { fecha: "DESC" },
  });
  if (previo) {
    return { avisados: psicologos.length, repetido: true, canales: [] };
  }

  await repo.insert(psicologos.map((p) => ({ usuarioId: p.usuarioId, sesionId: null, tipo: "CRISIS", titulo, mensaje })));
  const canales = new Set<string>(["en MemoPsy"]);

  // WhatsApp y email son canales extra: si no están configurados o fallan, queda el aviso interno
  for (const p of psicologos) {
    if (p.telefono) {
      try {
        if (await enviarTextoWhatsapp(p.telefono, `Hola ${p.nombre}. ${mensaje}\n— MemoPsy`)) {
          canales.add("por WhatsApp");
        }
      } catch {
        console.error("No se pudo enviar por WhatsApp el aviso de crisis");
      }
    }
    if (/\.test$/i.test(p.email)) continue; // las cuentas de demostración no tienen casilla real
    try {
      await enviarEmail({
        para: p.email,
        asunto: "MemoPsy: aviso de crisis de un paciente",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #B42318; margin-top: 0;">${titulo}</h2>
            <p>Hola ${p.nombre}:</p>
            <p>${mensaje}</p>
            <p style="font-size: 13px; color: #555;">Este aviso también figura en la campanita de MemoPsy.</p>
          </div>`,
      });
      canales.add("por email");
    } catch {
      console.error("No se pudo enviar por email el aviso de crisis");
    }
  }
  return { avisados: psicologos.length, repetido: false, canales: [...canales] };
}
