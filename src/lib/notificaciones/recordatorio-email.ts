// src/lib/notificaciones/recordatorio-email.ts
// RF 3.3 - Recordatorio por email a los pacientes, para los turnos de las próximas 24 horas.
// Lo dispara un temporizador del servidor (src/instrumentation.ts), así llega aunque el
// paciente no entre al sistema. El aviso dentro de la plataforma sigue saliendo como antes.
// La tabla recordatorio_enviado evita mandar dos veces el mismo email.
// En el email va solo fecha, hora, con quién y el enlace si es virtual. Nunca contenido clínico.
import { initializeDatabase } from "@/lib/database";
import { enviarEmail } from "@/lib/email/brevo";
import { marcoEmail, parrafo, recuadroDatos, sitioMemoPsy } from "@/lib/email/plantilla";
import { fechaTurno } from "./notificar";

const HORAS_RECORDATORIO = 24;

export interface TurnoPendiente {
  sesionId: number;
  usuarioId: number;
  email: string;
  pacienteNombre: string | null;
  inicio: Date;
  modalidad: string | null;
  enlace: string | null;
  psicologoNombre: string;
  psicologoApellido: string;
}

// Mismos datos que el WhatsApp (src/lib/whatsapp/infobip.ts), con la plantilla clara de los emails
export function armarEmail(turno: TurnoPendiente) {
  const [dia, hora] = fechaTurno(new Date(turno.inicio)).split(" a las ");
  const nombre = (turno.pacienteNombre ?? "").trim().split(/\s+/)[0] ?? "";
  const enlace = turno.enlace && /^https?:\/\//i.test(turno.enlace) ? turno.enlace : "";
  const sitio = sitioMemoPsy();
  const modalidad = (turno.modalidad ?? "presencial").toLowerCase();
  return {
    // Con la fecha en el asunto, si el turno se reprograma el email nuevo no queda escondido
    // en la misma conversación que el anterior
    asunto: `Recordatorio: tu turno del ${fechaTurno(new Date(turno.inicio))} en MemoPsy`,
    html: marcoEmail({
      resumen: `Tu turno es el ${dia} a las ${hora} con ${turno.psicologoNombre} ${turno.psicologoApellido}.`,
      titulo: nombre ? `${nombre}, te esperamos en tu sesión` : "Te esperamos en tu sesión",
      cuerpo:
        parrafo("Te recordamos los datos de tu próximo turno:") +
        recuadroDatos([
          ["Día", dia],
          ["Hora", hora ?? ""],
          ["Profesional", `${turno.psicologoNombre} ${turno.psicologoApellido}`.trim()],
          ["Modalidad", modalidad.charAt(0).toUpperCase() + modalidad.slice(1)],
        ]),
      // Sesión remota: el botón lleva directo a la videollamada; presencial: a su cuenta
      boton: enlace
        ? { texto: "Entrar a la videollamada", enlace }
        : sitio
          ? { texto: "Ver mi turno", enlace: `${sitio}/sesiones` }
          : undefined,
      notas: [
        "Si no podés asistir, reprogramá el turno desde tu cuenta de MemoPsy hasta 24 horas antes, o avisale al consultorio.",
        ...(enlace ? [`Enlace de la videollamada: <a href="${enlace.replace(/"/g, "")}" style="color: #1D4A48;">${enlace.replace(/[<>"]/g, "")}</a>`] : []),
      ],
    }),
  };
}

let enCurso = false;

export async function enviarRecordatoriosPorEmail(): Promise<void> {
  // Si una pasada tarda más que el intervalo, no se pisan
  if (enCurso) return;
  enCurso = true;
  try {
    const dataSource = await initializeDatabase();
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + HORAS_RECORDATORIO * 60 * 60 * 1000);

    const pendientes: TurnoPendiente[] = await dataSource.query(
      `SELECT s.id_sesion AS sesionId, u.id_usuario AS usuarioId, u.email, pe.nombre AS pacienteNombre, s.fecha_hora_inicio AS inicio,
              m.nombre AS modalidad, s.enlace_videollamada AS enlace,
              pp.nombre AS psicologoNombre, pp.apellido AS psicologoApellido
         FROM sesion s
         JOIN estado e ON e.id_estado = s.id_estado
         LEFT JOIN modalidad m ON m.id_modalidad = s.id_modalidad
         JOIN psicologo ps ON ps.id_psicologo = s.id_psicologo
         JOIN persona pp ON pp.id_persona = ps.id_persona
         JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
         JOIN paciente pa ON pa.id_paciente = pts.id_paciente
         JOIN persona pe ON pe.id_persona = pa.id_persona
         JOIN usuario u ON u.id_persona = pa.id_persona AND u.activo = 1
        WHERE s.fecha_hora_inicio BETWEEN ? AND ?
          AND e.nombre NOT IN ('Cancelada', 'Finalizada')
          -- .test es un dominio reservado que no existe: son las cuentas de prueba y demostración
          AND u.email NOT LIKE '%.test'
          AND NOT EXISTS (SELECT 1 FROM recordatorio_enviado r
                           WHERE r.id_sesion = s.id_sesion AND r.id_usuario = u.id_usuario AND r.canal = 'EMAIL')`,
      [ahora, hasta],
    );

    for (const turno of pendientes) {
      // Se reserva antes de mandar: si otra pasada llega al mismo turno, el INSERT IGNORE no hace nada
      const reserva = await dataSource.query(
        "INSERT IGNORE INTO recordatorio_enviado (id_sesion, id_usuario, canal) VALUES (?, ?, 'EMAIL')",
        [turno.sesionId, turno.usuarioId],
      );
      if (!reserva?.affectedRows) continue;

      try {
        await enviarEmail({ para: turno.email, ...armarEmail(turno) });
      } catch {
        // Se libera para reintentar en la próxima pasada
        await dataSource.query(
          "DELETE FROM recordatorio_enviado WHERE id_sesion = ? AND id_usuario = ? AND canal = 'EMAIL'",
          [turno.sesionId, turno.usuarioId],
        );
        console.error("No se pudo enviar un recordatorio por email"); // sin datos personales
      }
    }
  } catch {
    console.error("No se pudieron procesar los recordatorios por email");
  } finally {
    enCurso = false;
  }
}
