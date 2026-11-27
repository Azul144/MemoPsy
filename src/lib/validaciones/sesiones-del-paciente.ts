// src/lib/validaciones/sesiones-del-paciente.ts
// Regla del consultorio: un paciente tiene como máximo 2 sesiones por semana (de lunes a domingo),
// en días distintos; nunca 2 el mismo día. Las canceladas no cuentan.
// La usan el alta y la edición de turnos y los horarios que se ofrecen para reprogramar
// (pantalla y WhatsApp), así la regla es la misma en todos lados. Si cambia, se cambia SOLO acá.
import type { DataSource, EntityManager } from "typeorm";

export const MAXIMO_SESIONES_POR_SEMANA = 2;
const ZONA = "America/Argentina/Buenos_Aires";
const UN_DIA = 24 * 60 * 60 * 1000;

// "aaaa-mm-dd" en la hora del consultorio
const diaLocal = (fecha: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(fecha);
// Lunes de la semana de ese día, también "aaaa-mm-dd"
function lunesDe(dia: string) {
  const [a, m, d] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const desdeLunes = (fecha.getUTCDay() + 6) % 7;
  return new Date(fecha.getTime() - desdeLunes * UN_DIA).toISOString().slice(0, 10);
}
const fechaCorta = (dia: string) => dia.slice(8, 10) + "/" + dia.slice(5, 7);

export interface SesionDePaciente {
  sesionId: string;
  pacienteId: string;
  paciente: string; // "Nombre Apellido"
  inicio: Date;
}

// Sesiones (no canceladas) de esos pacientes entre dos fechas, sin contar la que se está editando
export async function sesionesDePacientes(
  db: DataSource | EntityManager,
  pacientesIds: (string | number)[],
  desde: Date,
  hasta: Date,
  excluirSesionId?: string | number,
): Promise<SesionDePaciente[]> {
  if (pacientesIds.length === 0) return [];
  const filas: { sesionId: number; pacienteId: number; nombre: string; apellido: string; inicio: Date }[] = await db.query(
    `SELECT s.id_sesion AS sesionId, pts.id_paciente AS pacienteId, pe.nombre, pe.apellido, s.fecha_hora_inicio AS inicio
       FROM sesion s
       JOIN paciente_tiene_sesion pts ON pts.id_sesion = s.id_sesion
       JOIN paciente pa ON pa.id_paciente = pts.id_paciente
       JOIN persona pe ON pe.id_persona = pa.id_persona
       LEFT JOIN estado e ON e.id_estado = s.id_estado
      WHERE pts.id_paciente IN (?)
        AND (e.nombre IS NULL OR e.nombre <> 'Cancelada')
        AND s.fecha_hora_inicio >= ? AND s.fecha_hora_inicio < ?
        AND s.id_sesion <> ?`,
    [pacientesIds.map(String), desde, hasta, excluirSesionId ?? 0],
  );
  return filas.map((f) => ({
    sesionId: String(f.sesionId),
    pacienteId: String(f.pacienteId),
    paciente: `${f.nombre} ${f.apellido}`,
    inicio: new Date(f.inicio),
  }));
}

// null = se puede; si no, el motivo para mostrar. "otras" son las sesiones de UN paciente.
export function motivoSesionNoPermitida(otras: Pick<SesionDePaciente, "paciente" | "inicio">[], inicio: Date): string | null {
  const dia = diaLocal(inicio);
  const lunes = lunesDe(dia);
  const mismoDia = otras.find((o) => diaLocal(o.inicio) === dia);
  if (mismoDia) {
    return `${mismoDia.paciente} ya tiene una sesión ese día (${fechaCorta(dia)}). Un paciente puede tener una sola sesión por día.`;
  }
  const deLaSemana = otras.filter((o) => lunesDe(diaLocal(o.inicio)) === lunes);
  if (deLaSemana.length >= MAXIMO_SESIONES_POR_SEMANA) {
    const dias = deLaSemana.map((o) => fechaCorta(diaLocal(o.inicio))).join(" y ");
    return `${deLaSemana[0].paciente} ya tiene ${deLaSemana.length} sesiones esa semana (${dias}). El máximo es ${MAXIMO_SESIONES_POR_SEMANA} por semana, en días distintos.`;
  }
  return null;
}

// Para el alta y la edición: revisa a todos los pacientes del turno
export async function validarSesionesDelPaciente(
  db: DataSource | EntityManager,
  pacientesIds: (string | number)[],
  inicio: Date,
  excluirSesionId?: string | number,
): Promise<string | null> {
  const otras = await sesionesDePacientes(db, pacientesIds, new Date(inicio.getTime() - 8 * UN_DIA), new Date(inicio.getTime() + 8 * UN_DIA), excluirSesionId);
  for (const id of pacientesIds.map(String)) {
    const motivo = motivoSesionNoPermitida(otras.filter((o) => o.pacienteId === id), inicio);
    if (motivo) return motivo;
  }
  return null;
}
