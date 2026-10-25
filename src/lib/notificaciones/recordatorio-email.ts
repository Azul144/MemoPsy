// src/lib/notificaciones/recordatorio-email.ts
// RF 3.3 - Recordatorio por email a los pacientes, para los turnos de las próximas 24 horas.
// Lo dispara un temporizador del servidor (src/instrumentation.ts), así llega aunque el
// paciente no entre al sistema. El aviso dentro de la plataforma sigue saliendo como antes.
// La tabla recordatorio_enviado evita mandar dos veces el mismo email.
// En el email va solo fecha, hora, con quién y el enlace si es virtual. Nunca contenido clínico.
import { initializeDatabase } from "@/lib/database";
import { enviarEmail } from "@/lib/email/brevo";
import { fechaTurno } from "./notificar";

const HORAS_RECORDATORIO = 24;

interface TurnoPendiente {
  sesionId: number;
  usuarioId: number;
  email: string;
  inicio: Date;
  modalidad: string | null;
  enlace: string | null;
  psicologoNombre: string;
  psicologoApellido: string;
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function armarEmail(turno: TurnoPendiente) {
  const psicologo = escapar(`${turno.psicologoNombre} ${turno.psicologoApellido}`.trim());
  const cuando = escapar(fechaTurno(new Date(turno.inicio)));
  const modalidad = turno.modalidad ? ` (${escapar(turno.modalidad.toLowerCase())})` : "";
  const enlace =
    turno.enlace && /^https?:\/\//i.test(turno.enlace)
      ? `<p>Para conectarte a la videollamada usá este enlace:<br><a href="${escapar(turno.enlace)}">${escapar(turno.enlace)}</a></p>`
      : "";
  return {
    // Con la fecha en el asunto, si el turno se reprograma el email nuevo no queda escondido
    // en la misma conversación que el anterior
    asunto: `Recordatorio: tu turno del ${fechaTurno(new Date(turno.inicio))} en MemoPsy`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px;">
        <h2 style="color: #1D3434;">Recordatorio de turno</h2>
        <p>Te recordamos que tenés turno con ${psicologo} el <strong>${cuando}</strong>${modalidad}.</p>
        ${enlace}
        <p>Si no podés asistir, avisale a tu psicólogo con anticipación.</p>
        <p style="color: #888; font-size: 12px;">Este es un mensaje automático de MemoPsy. No lo respondas.</p>
      </div>
    `,
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
      `SELECT s.id AS sesionId, u.id AS usuarioId, u.email, s.fecha_hora_inicio AS inicio,
              m.nombre AS modalidad, s.enlace_videollamada AS enlace,
              pp.nombre AS psicologoNombre, pp.apellido AS psicologoApellido
         FROM sesion s
         JOIN estado e ON e.id = s.estado_id
         LEFT JOIN modalidad m ON m.id = s.modalidad_id
         JOIN psicologo ps ON ps.id = s.psicologo_id
         JOIN persona pp ON pp.id = ps.persona_id
         JOIN paciente_tiene_sesion pts ON pts.sesion_id = s.id
         JOIN paciente pa ON pa.id = pts.paciente_id
         JOIN usuario u ON u.persona_id = pa.persona_id AND u.activo = 1
        WHERE s.fecha_hora_inicio BETWEEN ? AND ?
          AND e.nombre NOT IN ('Cancelada', 'Finalizada')
          -- .test es un dominio reservado que no existe: son las cuentas de prueba y demostración
          AND u.email NOT LIKE '%.test'
          AND NOT EXISTS (SELECT 1 FROM recordatorio_enviado r
                           WHERE r.sesion_id = s.id AND r.usuario_id = u.id AND r.canal = 'EMAIL')`,
      [ahora, hasta],
    );

    for (const turno of pendientes) {
      // Se reserva antes de mandar: si otra pasada llega al mismo turno, el INSERT IGNORE no hace nada
      const reserva = await dataSource.query(
        "INSERT IGNORE INTO recordatorio_enviado (sesion_id, usuario_id, canal) VALUES (?, ?, 'EMAIL')",
        [turno.sesionId, turno.usuarioId],
      );
      if (!reserva?.affectedRows) continue;

      try {
        await enviarEmail({ para: turno.email, ...armarEmail(turno) });
      } catch {
        // Se libera para reintentar en la próxima pasada
        await dataSource.query(
          "DELETE FROM recordatorio_enviado WHERE sesion_id = ? AND usuario_id = ? AND canal = 'EMAIL'",
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
