// src/lib/notificaciones/notificar.ts
// RF 3.2 / RF 3.3 - Avisos dentro de la plataforma sobre los turnos.
//  - Cuando un turno se reprograma o se cancela, se avisa al psicólogo y a los pacientes
//    (menos a quien hizo el cambio, que ya lo sabe).
//  - Los turnos de las próximas 24 horas generan un recordatorio la próxima vez que la
//    persona abre el sistema (no hace falta un proceso programado).
// Igual que la auditoría, nunca corta la operación principal: si falla, se avisa en consola.
// En el texto va solo fecha, hora y con quién es el turno. Nunca contenido clínico.
import type { EntityManager } from "typeorm";
import { initializeDatabase } from "@/lib/database";
import { NotificacionEntity, PacienteTieneSesionEntity, SesionEntity } from "@/entities";

// SEGUIMIENTO: el psicólogo compartió un informe de seguimiento (RF 2.4)
// RESPUESTA_ACTIVIDAD: el paciente respondió una actividad del informe
export type TipoNotificacion = "REPROGRAMACION" | "CANCELACION" | "RECORDATORIO" | "SEGUIMIENTO" | "RESPUESTA_ACTIVIDAD";

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const HORAS_RECORDATORIO = 24;

// "lun 27/10 a las 15:00" en la hora del consultorio
export function fechaTurno(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("weekday").replace(".", "")} ${parte("day")}/${parte("month")} a las ${parte("hour")}:${parte("minute")}`;
}

const nombre = (persona?: { nombre?: string; apellido?: string } | null) =>
  persona ? `${persona.nombre ?? ""} ${persona.apellido ?? ""}`.trim() : "";

interface Destinatario {
  usuarioId: number;
  rol: "psicologo" | "paciente";
}

// Usuarios activos del psicólogo y de los pacientes de un turno
async function destinatariosDelTurno(manager: EntityManager, sesionId: string): Promise<Destinatario[]> {
  const filas: { usuarioId: number; rol: Destinatario["rol"] }[] = await manager.query(
    `SELECT u.id AS usuarioId, 'psicologo' AS rol
       FROM sesion s
       JOIN psicologo ps ON ps.id = s.psicologo_id
       JOIN usuario u ON u.persona_id = ps.persona_id
      WHERE s.id = ? AND u.activo = 1
     UNION
     SELECT u.id, 'paciente'
       FROM paciente_tiene_sesion pts
       JOIN paciente pa ON pa.id = pts.paciente_id
       JOIN usuario u ON u.persona_id = pa.persona_id
      WHERE pts.sesion_id = ? AND u.activo = 1`,
    [sesionId, sesionId],
  );
  return filas.map((f) => ({ usuarioId: Number(f.usuarioId), rol: f.rol }));
}

// Con quién es el turno, visto por cada parte: el paciente ve al psicólogo y el psicólogo a los pacientes
async function contraparte(manager: EntityManager, sesion: SesionEntity) {
  const pts = await manager.find(PacienteTieneSesionEntity, {
    where: { sesionId: sesion.id },
    relations: ["paciente", "paciente.persona"],
  });
  const pacientes = pts.map((p) => nombre(p.paciente?.persona)).filter(Boolean).join(", ");
  const psicologo = nombre(sesion.psicologo?.persona);
  return {
    psicologo: pacientes ? ` con ${pacientes}` : "",
    paciente: psicologo ? ` con ${psicologo}` : "",
  };
}

interface CambioDeTurno {
  sesionId: string | number;
  tipo: "REPROGRAMACION" | "CANCELACION";
  // Fecha del turno antes del cambio (para decir "del lunes ... pasó al miércoles ...")
  inicioAnterior: Date;
  // Quien hizo el cambio: no se le avisa a sí mismo
  usuarioQueCambia?: string | number | null;
}

export async function notificarCambioDeTurno(cambio: CambioDeTurno): Promise<void> {
  try {
    const dataSource = await initializeDatabase();
    const manager = dataSource.manager;
    const sesionId = String(cambio.sesionId);
    const sesion = await manager.findOne(SesionEntity, {
      where: { id: sesionId },
      relations: ["psicologo", "psicologo.persona"],
    });
    if (!sesion) return;

    // El recordatorio que ya se mandó quedó viejo: si el turno sigue en pie, se vuelve a generar con el nuevo horario
    await manager.delete(NotificacionEntity, { sesionId: Number(sesionId), tipo: "RECORDATORIO" });

    const conQuien = await contraparte(manager, sesion);
    const quienCambia = cambio.usuarioQueCambia != null ? Number(cambio.usuarioQueCambia) : null;
    const destinatarios = (await destinatariosDelTurno(manager, sesionId)).filter((d) => d.usuarioId !== quienCambia);
    if (destinatarios.length === 0) return;

    const antes = fechaTurno(cambio.inicioAnterior);
    const avisos = destinatarios.map((d) =>
      cambio.tipo === "CANCELACION"
        ? {
            usuarioId: d.usuarioId,
            sesionId: Number(sesionId),
            tipo: cambio.tipo,
            titulo: "Turno cancelado",
            mensaje: `Se canceló el turno${conQuien[d.rol]} del ${antes}.`,
          }
        : {
            usuarioId: d.usuarioId,
            sesionId: Number(sesionId),
            tipo: cambio.tipo,
            titulo: "Turno reprogramado",
            mensaje: `El turno${conQuien[d.rol]} del ${antes} pasó al ${fechaTurno(sesion.fechaHoraInicio)}.`,
          },
    );
    await manager.insert(NotificacionEntity, avisos);
  } catch {
    console.error("No se pudo generar la notificación del turno"); // sin datos personales
  }
}

interface UsuarioConRol {
  id: string | number;
  psicologoId?: string | null;
  pacienteId?: string | null;
}

// RF 3.3 - Crea los recordatorios de los turnos de las próximas 24 horas que todavía no se avisaron
export async function generarRecordatorios(usuario: UsuarioConRol): Promise<void> {
  if (!usuario.psicologoId && !usuario.pacienteId) return;
  try {
    const dataSource = await initializeDatabase();
    const manager = dataSource.manager;
    const usuarioId = Number(usuario.id);
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + HORAS_RECORDATORIO * 60 * 60 * 1000);

    const pendientes: { id: number; rol: Destinatario["rol"] }[] = await manager.query(
      `SELECT s.id, IF(s.psicologo_id = ?, 'psicologo', 'paciente') AS rol
         FROM sesion s
         JOIN estado e ON e.id = s.estado_id
        WHERE s.fecha_hora_inicio BETWEEN ? AND ?
          AND e.nombre NOT IN ('Cancelada', 'Finalizada')
          AND (s.psicologo_id = ?
               OR EXISTS (SELECT 1 FROM paciente_tiene_sesion pts WHERE pts.sesion_id = s.id AND pts.paciente_id = ?))
          AND NOT EXISTS (SELECT 1 FROM notificacion n
                           WHERE n.usuario_id = ? AND n.sesion_id = s.id AND n.tipo = 'RECORDATORIO')`,
      [usuario.psicologoId ?? 0, ahora, hasta, usuario.psicologoId ?? 0, usuario.pacienteId ?? 0, usuarioId],
    );
    if (pendientes.length === 0) return;

    const avisos = [];
    for (const p of pendientes) {
      const sesion = await manager.findOne(SesionEntity, {
        where: { id: String(p.id) },
        relations: ["psicologo", "psicologo.persona", "modalidad"],
      });
      if (!sesion) continue;
      const conQuien = await contraparte(manager, sesion);
      const modalidad = sesion.modalidad?.nombre ? ` (${sesion.modalidad.nombre.toLowerCase()})` : "";
      avisos.push({
        usuarioId,
        sesionId: Number(p.id),
        tipo: "RECORDATORIO" as TipoNotificacion,
        titulo: "Recordatorio de turno",
        mensaje: `Tenés turno${conQuien[p.rol]} el ${fechaTurno(sesion.fechaHoraInicio)}${modalidad}.`,
      });
    }
    if (avisos.length > 0) await manager.insert(NotificacionEntity, avisos);
  } catch {
    console.error("No se pudieron generar los recordatorios de turnos");
  }
}

interface AvisoSimple {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
}

// RF 2.4 - Aviso a los pacientes (sus usuarios activos) de que tienen un informe de seguimiento
export async function notificarPacientes(pacientesIds: (string | number)[], aviso: AvisoSimple): Promise<void> {
  if (pacientesIds.length === 0) return;
  try {
    const dataSource = await initializeDatabase();
    const filas: { usuarioId: number }[] = await dataSource.query(
      `SELECT u.id AS usuarioId
         FROM paciente pa
         JOIN usuario u ON u.persona_id = pa.persona_id
        WHERE pa.id IN (?) AND u.activo = 1`,
      [pacientesIds.map(Number)],
    );
    if (filas.length === 0) return;
    await dataSource.manager.insert(
      NotificacionEntity,
      filas.map((f) => ({ usuarioId: Number(f.usuarioId), sesionId: null, ...aviso })),
    );
  } catch {
    console.error("No se pudo avisar a los pacientes");
  }
}

// RF 2.4 - Aviso al psicólogo (su usuario activo), por ejemplo cuando un paciente responde una actividad
export async function notificarPsicologo(psicologoId: string | number, aviso: AvisoSimple): Promise<void> {
  try {
    const dataSource = await initializeDatabase();
    const filas: { usuarioId: number }[] = await dataSource.query(
      `SELECT u.id AS usuarioId
         FROM psicologo ps
         JOIN usuario u ON u.persona_id = ps.persona_id
        WHERE ps.id = ? AND u.activo = 1`,
      [Number(psicologoId)],
    );
    if (filas.length === 0) return;
    await dataSource.manager.insert(
      NotificacionEntity,
      filas.map((f) => ({ usuarioId: Number(f.usuarioId), sesionId: null, ...aviso })),
    );
  } catch {
    console.error("No se pudo avisar al psicólogo");
  }
}
