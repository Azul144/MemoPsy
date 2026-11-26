// src/lib/crisis/aviso-psicologo.ts
// RF 4.3 - Aviso opcional al psicólogo cuando un paciente que inició sesión usa la ayuda en crisis
// y elige "Avisarle a mi psicólogo". Le llega a la campanita (y por email si tiene casilla real)
// con el día, la hora y la situación que eligió. No se guarda nada más de lo que hizo en la guía.
import { MoreThan } from "typeorm";
import { initializeDatabase } from "@/lib/database";
import { NotificacionEntity } from "@/entities";
import { enviarEmail } from "@/lib/email/brevo";
import { psicologosDelPaciente } from "@/lib/whatsapp/alerta-crisis";
import type { GuiaCrisis } from "./contenido";

// Si el paciente toca el botón otra vez en este lapso, no se repite el aviso
const MINUTOS_SIN_REPETIR = 10;

export type ResultadoAviso = { avisados: number; repetido: boolean };

function fechaYHora(fecha: Date) {
  const zona = { timeZone: "America/Argentina/Buenos_Aires" } as const;
  return {
    // "jueves 26 de noviembre" (sin la coma que agrega el formato de fecha)
    dia: fecha.toLocaleDateString("es-AR", { ...zona, weekday: "long", day: "numeric", month: "long" }).replace(",", ""),
    hora: fecha.toLocaleTimeString("es-AR", { ...zona, hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

export async function avisarCrisisAlPsicologo(pacienteId: number, paciente: string, guia: GuiaCrisis): Promise<ResultadoAviso> {
  const psicologos = await psicologosDelPaciente(pacienteId);
  if (psicologos.length === 0) return { avisados: 0, repetido: false };

  const ahora = new Date();
  const { dia, hora } = fechaYHora(ahora);
  const riesgo = !!guia.riesgo;
  const titulo = riesgo ? "⚠️ Urgente: un paciente usó la ayuda en crisis" : "Un paciente usó la ayuda en crisis";
  const mensaje =
    `${paciente} usó la ayuda en crisis de MemoPsy el ${dia} a las ${hora} y eligió «${guia.titulo}». ` +
    (riesgo
      ? "La guía le indicó llamar a las líneas de emergencia y de salud mental. Comunicate con la persona lo antes posible."
      : "Pidió que lo sepas para retomarlo con vos.");

  const dataSource = await initializeDatabase();
  const repo = dataSource.getRepository(NotificacionEntity);

  // Evita avisos repetidos por tocar el botón más de una vez
  const desde = new Date(ahora.getTime() - MINUTOS_SIN_REPETIR * 60 * 1000);
  const previo = await repo.findOne({
    where: { usuarioId: psicologos[0].usuarioId, tipo: "CRISIS", fecha: MoreThan(desde) },
    order: { fecha: "DESC" },
  });
  if (previo?.mensaje.startsWith(`${paciente} usó la ayuda en crisis`) && previo.mensaje.includes(`«${guia.titulo}»`)) {
    return { avisados: psicologos.length, repetido: true };
  }

  await repo.insert(psicologos.map((p) => ({ usuarioId: p.usuarioId, sesionId: null, tipo: "CRISIS", titulo, mensaje })));

  // El email es un segundo canal: si Brevo no está configurado o falla, queda el aviso interno
  for (const p of psicologos) {
    if (/\.test$/i.test(p.email)) continue; // las cuentas de demostración no tienen casilla real
    try {
      await enviarEmail({
        para: p.email,
        asunto: riesgo ? "MemoPsy: aviso urgente de un paciente" : "MemoPsy: un paciente usó la ayuda en crisis",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #B42318; margin-top: 0;">${titulo}</h2>
            <p>Hola ${p.nombre}:</p>
            <p>${mensaje}</p>
            <p style="font-size: 13px; color: #555;">Este aviso también figura en la campanita de MemoPsy.</p>
          </div>`,
      });
    } catch {
      console.error("No se pudo enviar por email el aviso de crisis");
    }
  }
  return { avisados: psicologos.length, repetido: false };
}
