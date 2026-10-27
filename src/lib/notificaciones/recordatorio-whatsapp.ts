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
      `SELECT s.id_sesion AS sesionId, u.id_usuario AS usuarioId, pe.telefono, s.fecha_hora_inicio AS inicio,
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
         JOIN usuario u ON u.id_persona = pe.id_persona AND u.activo = 1
        WHERE s.fecha_hora_inicio BETWEEN ? AND ?
          AND e.nombre NOT IN ('Cancelada', 'Finalizada')
          AND pe.telefono IS NOT NULL AND pe.telefono <> ''
          AND NOT EXISTS (SELECT 1 FROM recordatorio_enviado r
                           WHERE r.id_sesion = s.id_sesion AND r.id_usuario = u.id_usuario AND r.canal = 'WHATSAPP')`,
      [ahora, hasta],
    );

    for (const turno of pendientes) {
      // Se reserva antes de mandar, igual que con el email, para no mandar dos veces
      const reserva = await dataSource.query(
        "INSERT IGNORE INTO recordatorio_enviado (id_sesion, id_usuario, canal) VALUES (?, ?, 'WHATSAPP')",
        [turno.sesionId, turno.usuarioId],
      );
      if (!reserva?.affectedRows) continue;

      try {
        await enviarWhatsapp(recordatorio(turno));
      } catch (error) {
        // Si el número no puede recibir (error 4xx) no se reintenta; si fue un corte, sí
        if (!(error instanceof WhatsappError && error.definitivo)) {
          await dataSource.query(
            "DELETE FROM recordatorio_enviado WHERE id_sesion = ? AND id_usuario = ? AND canal = 'WHATSAPP'",
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
