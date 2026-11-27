// src/lib/auditoria/detalle.ts
// Ayudas para que cada evento de la auditoría diga QUÉ pasó y con QUIÉN, en palabras:
// "Turno de Martín Acosta con Carla Benítez · lun 07/12 08:00 (Presencial)".
// La ruta arma el texto y lo adjunta a su respuesta con conDetalleAuditoria; conAuditoria lo lee
// (y lo saca de la respuesta) al registrar el evento. Nunca va contenido clínico ni contraseñas.
import type { DataSource, EntityManager } from "typeorm";

const CABECERA_DETALLE = "x-auditoria-detalle";
const CABECERA_ACCION = "x-auditoria-accion";

// Adjunta el detalle (y, si hace falta, una acción más precisa) a la respuesta de la ruta
export function conDetalleAuditoria<R extends Response>(respuesta: R, detalle: string, accion?: string): R {
  try {
    respuesta.headers.set(CABECERA_DETALLE, encodeURIComponent(detalle.slice(0, 480)));
    if (accion) respuesta.headers.set(CABECERA_ACCION, accion);
  } catch {
    // Si la respuesta no deja agregar cabeceras, queda el detalle fijo de la ruta
  }
  return respuesta;
}

// Lo lee conAuditoria y lo borra, para que no llegue al navegador
export function leerDetalleAuditoria(respuesta: Response): { detalle: string | null; accion: string | null } {
  try {
    const detalle = respuesta.headers.get(CABECERA_DETALLE);
    const accion = respuesta.headers.get(CABECERA_ACCION);
    respuesta.headers.delete(CABECERA_DETALLE);
    respuesta.headers.delete(CABECERA_ACCION);
    return { detalle: detalle ? decodeURIComponent(detalle) : null, accion };
  } catch {
    return { detalle: null, accion: null };
  }
}

// "lun 07/12 08:00" en la hora del consultorio
export function fechaHoraCorta(fecha: Date | string): string {
  const partes = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(new Date(fecha));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("weekday").replace(".", "")} ${v("day")}/${v("month")} ${v("hour")}:${v("minute")}`;
}

// "Martín Acosta con Carla Benítez · lun 07/12 08:00 (Presencial)"
export async function describirTurno(db: DataSource | EntityManager, sesionId: string | number): Promise<string> {
  const [s]: any[] = await db.query(
    `SELECT s.fecha_hora_inicio AS inicio, m.nombre AS modalidad, CONCAT(pp.nombre, ' ', pp.apellido) AS psicologo,
            (SELECT GROUP_CONCAT(CONCAT(pe.nombre, ' ', pe.apellido) SEPARATOR ', ')
               FROM paciente_tiene_sesion pts JOIN paciente pa ON pa.id_paciente = pts.id_paciente
               JOIN persona pe ON pe.id_persona = pa.id_persona WHERE pts.id_sesion = s.id_sesion) AS pacientes
       FROM sesion s
       LEFT JOIN modalidad m ON m.id_modalidad = s.id_modalidad
       LEFT JOIN psicologo ps ON ps.id_psicologo = s.id_psicologo
       LEFT JOIN persona pp ON pp.id_persona = ps.id_persona
      WHERE s.id_sesion = ?`,
    [sesionId],
  );
  if (!s) return `turno ${sesionId}`;
  return `${s.pacientes || "sin paciente"} con ${s.psicologo ?? "psicólogo/a"} · ${fechaHoraCorta(s.inicio)}${s.modalidad ? ` (${s.modalidad})` : ""}`;
}

// "Carla Benítez (Psicólogo) · carla@..." a partir del id de usuario
export async function describirUsuario(db: DataSource | EntityManager, usuarioId: string | number | null): Promise<string> {
  if (usuarioId == null) return "usuario";
  const [u]: any[] = await db.query(
    `SELECT CONCAT(pe.nombre, ' ', pe.apellido) AS nombre, u.email,
            (SELECT GROUP_CONCAT(p.nombre SEPARATOR ', ') FROM usuario_tiene_perfil up JOIN perfil p ON p.id_perfil = up.id_perfil
              WHERE up.id_usuario = u.id_usuario) AS perfiles
       FROM usuario u LEFT JOIN persona pe ON pe.id_persona = u.id_persona WHERE u.id_usuario = ?`,
    [usuarioId],
  );
  if (!u) return `usuario ${usuarioId}`;
  return `${u.nombre ?? "sin nombre"}${u.perfiles ? ` (${u.perfiles})` : ""} · ${u.email}`;
}

// ¿La cuenta quedó activa? (para decir "Activó" o "Desactivó")
export async function cuentaActiva(db: DataSource | EntityManager, usuarioId: string | number | null): Promise<boolean | null> {
  if (usuarioId == null) return null;
  const [u]: any[] = await db.query("SELECT activo FROM usuario WHERE id_usuario = ?", [usuarioId]);
  return u ? Boolean(Number(u.activo)) : null;
}

// "Nombre Apellido" de un paciente
export async function nombrePaciente(db: DataSource | EntityManager, pacienteId: string | number | null): Promise<string> {
  if (pacienteId == null) return "paciente";
  const [p]: any[] = await db.query(
    "SELECT CONCAT(pe.nombre, ' ', pe.apellido) AS nombre FROM paciente pa JOIN persona pe ON pe.id_persona = pa.id_persona WHERE pa.id_paciente = ?",
    [pacienteId],
  );
  return p?.nombre ?? `paciente ${pacienteId}`;
}
