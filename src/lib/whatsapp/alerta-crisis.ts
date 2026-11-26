// src/lib/whatsapp/alerta-crisis.ts
// Aviso urgente a los psicólogos de un paciente que escribió por WhatsApp un mensaje de crisis.
// Va dentro de MemoPsy (campanita) y por email. Nunca incluye el texto del mensaje: solo quién,
// cuándo y qué tipo de alerta, para que el profesional decida cómo comunicarse.
import { initializeDatabase } from "@/lib/database";
import { NotificacionEntity } from "@/entities";
import { enviarEmail } from "@/lib/email/brevo";
import type { NivelCrisis } from "./crisis";

interface Psicologo {
  usuarioId: number;
  email: string;
  nombre: string;
}

// Psicólogos que atienden al paciente: los de sus turnos y los que tienen su historia clínica
export async function psicologosDelPaciente(pacienteId: number): Promise<Psicologo[]> {
  const dataSource = await initializeDatabase();
  const filas: { usuarioId: number; email: string; nombre: string }[] = await dataSource.query(
    `SELECT DISTINCT u.id_usuario AS usuarioId, u.email, pe.nombre
       FROM psicologo ps
       JOIN persona pe ON pe.id_persona = ps.id_persona
       JOIN usuario u ON u.id_persona = ps.id_persona AND u.activo = 1
      WHERE ps.id_psicologo IN (
              SELECT s.id_psicologo FROM sesion s
                JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
               WHERE pts.id_paciente = ?
              UNION
              SELECT hc.id_psicologo FROM historia_clinica hc WHERE hc.id_paciente = ?
            )`,
    [pacienteId, pacienteId],
  );
  return filas.map((f) => ({ usuarioId: Number(f.usuarioId), email: f.email, nombre: f.nombre }));
}

export async function avisarCrisis(pacienteId: number, paciente: string, nivel: NivelCrisis): Promise<number> {
  const psicologos = await psicologosDelPaciente(pacienteId);
  if (psicologos.length === 0) return 0;

  const titulo = nivel === "riesgo" ? "⚠️ Urgente: posible riesgo" : "Pedido de ayuda por WhatsApp";
  const mensaje =
    nivel === "riesgo"
      ? `${paciente} escribió por WhatsApp un mensaje que puede indicar riesgo para su vida o su integridad. ` +
        "El bot le envió las líneas de emergencia y de salud mental. Comunicate con la persona lo antes posible."
      : `${paciente} pidió ayuda por WhatsApp porque está atravesando un momento difícil. ` +
        "El bot le envió las líneas de ayuda y la guía de crisis.";

  const dataSource = await initializeDatabase();
  await dataSource.manager.insert(
    NotificacionEntity,
    psicologos.map((p) => ({ usuarioId: p.usuarioId, sesionId: null, tipo: "CRISIS", titulo, mensaje })),
  );

  // El email es un segundo canal: si Brevo no está configurado o falla, queda el aviso interno
  for (const p of psicologos) {
    // Las cuentas de demostración (@...test) no tienen casilla real
    if (/\.test$/i.test(p.email)) continue;
    try {
      await enviarEmail({
        para: p.email,
        asunto: nivel === "riesgo" ? "MemoPsy: aviso urgente de un paciente" : "MemoPsy: un paciente pidió ayuda",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #B42318; margin-top: 0;">${titulo}</h2>
            <p>Hola ${p.nombre}:</p>
            <p>${mensaje}</p>
            <p style="font-size: 13px; color: #555;">Por privacidad, el texto del mensaje no se guarda ni se reenvía.
            Este aviso también figura en la campanita de MemoPsy.</p>
          </div>`,
      });
    } catch {
      console.error("No se pudo enviar por email el aviso de crisis");
    }
  }
  return psicologos.length;
}
