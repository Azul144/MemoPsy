// src/lib/notificaciones/recordatorio-whatsapp.ts
// RF 3.3 - Recordatorio por WhatsApp a los pacientes que tienen celular cargado, para los turnos
// de las próximas 24 horas. Funciona igual que el del email (recordatorio-email.ts) y es independiente:
// si WhatsApp falla, el paciente igual recibe el email y el aviso dentro del sistema.
// En el mensaje va solo con quién, cuándo y la modalidad (con el enlace si es virtual). Nunca contenido clínico.
import { initializeDatabase } from "@/lib/database";
import { enviarWhatsapp, WhatsappError, whatsappConfigurado, type RecordatorioWhatsapp } from "@/lib/whatsapp";

const HORAS_RECORDATORIO = 24;

interface TurnoPendiente {
  sesionId: number;
  usuarioId: number;
  telefono: string;
  inicio: Date;
  modalidad: string | null;
  enlace: string | null;
  psicologoNombre: string;
  psicologoApellido: string;
}

function recordatorio(turno: TurnoPendiente): RecordatorioWhatsapp {
  return {
    para: turno.telefono,
    psicologo: `${turno.psicologoNombre} ${turno.psicologoApellido}`.trim(),
    inicio: new Date(turno.inicio),
    modalidad: (turno.modalidad ?? "presencial").toLowerCase(),
    enlace: turno.enlace && /^https?:\/\//i.test(turno.enlace) ? turno.enlace : null,
  };
}

let enCurso = false;

export async function enviarRecordatoriosPorWhatsapp(): Promise<void> {
  if (enCurso) return;
  if (!whatsappConfigurado()) {
    console.error("RECORDATORIOS_WHATSAPP está activo pero faltan los datos del proveedor de WhatsApp en .env.local");
    return;
  }
  enCurso = true;
  try {
    const dataSource = await initializeDatabase();
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + HORAS_RECORDATORIO * 60 * 60 * 1000);

    const pendientes: TurnoPendiente[] = await dataSource.query(
      `SELECT s.id AS sesionId, u.id AS usuarioId, pe.telefono, s.fecha_hora_inicio AS inicio,
              m.nombre AS modalidad, s.enlace_videollamada AS enlace,
              pp.nombre AS psicologoNombre, pp.apellido AS psicologoApellido
         FROM sesion s
         JOIN estado e ON e.id = s.estado_id
         LEFT JOIN modalidad m ON m.id = s.modalidad_id
         JOIN psicologo ps ON ps.id = s.psicologo_id
         JOIN persona pp ON pp.id = ps.persona_id
         JOIN paciente_tiene_sesion pts ON pts.sesion_id = s.id
         JOIN paciente pa ON pa.id = pts.paciente_id
         JOIN persona pe ON pe.id = pa.persona_id
         JOIN usuario u ON u.persona_id = pe.id AND u.activo = 1
        WHERE s.fecha_hora_inicio BETWEEN ? AND ?
          AND e.nombre NOT IN ('Cancelada', 'Finalizada')
          AND pe.telefono IS NOT NULL AND pe.telefono <> ''
          AND NOT EXISTS (SELECT 1 FROM recordatorio_enviado r
                           WHERE r.sesion_id = s.id AND r.usuario_id = u.id AND r.canal = 'WHATSAPP')`,
      [ahora, hasta],
    );

    for (const turno of pendientes) {
      // Se reserva antes de mandar, igual que con el email, para no mandar dos veces
      const reserva = await dataSource.query(
        "INSERT IGNORE INTO recordatorio_enviado (sesion_id, usuario_id, canal) VALUES (?, ?, 'WHATSAPP')",
        [turno.sesionId, turno.usuarioId],
      );
      if (!reserva?.affectedRows) continue;

      try {
        await enviarWhatsapp(recordatorio(turno));
      } catch (error) {
        // Si el número no puede recibir (error 4xx) no se reintenta; si fue un corte, sí
        if (!(error instanceof WhatsappError && error.definitivo)) {
          await dataSource.query(
            "DELETE FROM recordatorio_enviado WHERE sesion_id = ? AND usuario_id = ? AND canal = 'WHATSAPP'",
            [turno.sesionId, turno.usuarioId],
          );
        }
        console.error(`No se pudo enviar un recordatorio por WhatsApp${error instanceof WhatsappError ? ` (estado ${error.status})` : ""}`);
      }
    }
  } catch {
    console.error("No se pudieron procesar los recordatorios por WhatsApp");
  } finally {
    enCurso = false;
  }
}
