// src/lib/notificaciones/recordatorio-manual.ts
// RF 3.3 - Recordatorio enviado a mano desde la agenda (botón "Recordatorio" del psicólogo o de recepción).
// Manda en el momento el mismo email y el mismo WhatsApp que los automáticos, a cada paciente del turno,
// aunque ya se le haya mandado antes. Lo deja anotado en recordatorio_enviado para que la pasada automática
// no lo repita. Solo con quién, cuándo y la modalidad: nunca contenido clínico.
import { initializeDatabase } from "@/lib/database";
import { enviarEmail } from "@/lib/email/brevo";
import { enviarWhatsapp, whatsappConfigurado } from "@/lib/whatsapp";
import { guardarConversacion } from "@/lib/whatsapp/conversacion";
import { armarEmail } from "./recordatorio-email";
import { recordatorio } from "./recordatorio-whatsapp";

export type ResultadoCanal = "enviado" | "no corresponde" | "error";

export interface ResultadoRecordatorio {
  pacientes: number;
  email: ResultadoCanal[];
  whatsapp: ResultadoCanal[];
}

interface PacienteDelTurno {
  sesionId: number;
  usuarioId: number;
  email: string | null;
  telefono: string | null;
  whatsappAcepta: Date | null;
  pacienteNombre: string;
  inicio: Date;
  modalidad: string | null;
  enlace: string | null;
  psicologoNombre: string;
  psicologoApellido: string;
}

const whatsappActivo = () => process.env.RECORDATORIOS_WHATSAPP === "activo" && whatsappConfigurado();

async function anotar(sesionId: number, usuarioId: number, canal: "EMAIL" | "WHATSAPP") {
  const dataSource = await initializeDatabase();
  await dataSource.query("INSERT IGNORE INTO recordatorio_enviado (id_sesion, id_usuario, canal) VALUES (?, ?, ?)", [
    sesionId,
    usuarioId,
    canal,
  ]);
}

export async function enviarRecordatorioDeTurno(sesionId: number): Promise<ResultadoRecordatorio> {
  const dataSource = await initializeDatabase();
  const pacientes: PacienteDelTurno[] = await dataSource.query(
    `SELECT s.id_sesion AS sesionId, u.id_usuario AS usuarioId, u.email, pe.telefono, pe.whatsapp_acepta AS whatsappAcepta,
            pe.nombre AS pacienteNombre, s.fecha_hora_inicio AS inicio, m.nombre AS modalidad,
            s.enlace_videollamada AS enlace, pp.nombre AS psicologoNombre, pp.apellido AS psicologoApellido
       FROM sesion s
       LEFT JOIN modalidad m ON m.id_modalidad = s.id_modalidad
       JOIN psicologo ps ON ps.id_psicologo = s.id_psicologo
       JOIN persona pp ON pp.id_persona = ps.id_persona
       JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
       JOIN paciente pa ON pa.id_paciente = pts.id_paciente
       JOIN persona pe ON pe.id_persona = pa.id_persona
       JOIN usuario u ON u.id_persona = pe.id_persona AND u.activo = 1
      WHERE s.id_sesion = ?`,
    [sesionId],
  );

  const resultado: ResultadoRecordatorio = { pacientes: pacientes.length, email: [], whatsapp: [] };

  for (const p of pacientes) {
    // Email: las cuentas .test son de prueba y no existen
    if (!p.email || p.email.endsWith(".test")) {
      resultado.email.push("no corresponde");
    } else {
      try {
        await enviarEmail({ para: p.email, ...armarEmail({ ...p, email: p.email }) });
        await anotar(p.sesionId, p.usuarioId, "EMAIL");
        resultado.email.push("enviado");
      } catch {
        console.error("No se pudo enviar un recordatorio manual por email"); // sin datos personales
        resultado.email.push("error");
      }
    }

    // WhatsApp: solo si el paciente tiene celular y aceptó recibirlo
    if (!p.telefono || !p.whatsappAcepta || !whatsappActivo()) {
      resultado.whatsapp.push("no corresponde");
    } else {
      try {
        await enviarWhatsapp(recordatorio({ ...p, telefono: p.telefono }));
        await guardarConversacion(p.telefono, { sesionId: p.sesionId, paso: "RECORDATORIO", opciones: null });
        await anotar(p.sesionId, p.usuarioId, "WHATSAPP");
        resultado.whatsapp.push("enviado");
      } catch {
        console.error("No se pudo enviar un recordatorio manual por WhatsApp");
        resultado.whatsapp.push("error");
      }
    }
  }

  return resultado;
}
