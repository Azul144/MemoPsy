// src/lib/carpetas/datos.ts
// Carpeta de cada paciente para su psicólogo tratante: turnos, notas clínicas, informes de
// seguimiento y la historia clínica, todo junto y en orden de fecha.
// Cada psicólogo ve solo lo suyo (mismo criterio que la historia clínica).
import type { DataSource } from "typeorm";
import { HistoriaClinicaEntity, InformeEntity, InformeSeguimientoEntity } from "@/entities";
import { atiendeAlPaciente, pacientesDelPsicologo } from "@/lib/historia-clinica/datos";
import { TURNOS } from "@/lib/sesiones/turnos-atencion";

// Turnos que todavía van a pasar (los cancelados y finalizados no cuentan como programados)
const ESTADOS_CERRADOS = ["Cancelada", "Finalizada"];

export interface ResumenCarpeta {
  pacienteId: string;
  nombre: string;
  apellido: string;
  obraSocial: string | null;
  turnosProgramados: number;
  turnosTotales: number;
  proximoTurno: string | null;
  ultimoTurno: string | null;
  notas: number;
  seguimientos: number;
  historia: "sin_abrir" | "en_curso" | "cerrada";
}

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

export async function listarCarpetas(ds: DataSource, psicologoId: string): Promise<ResumenCarpeta[]> {
  const pacientes = await pacientesDelPsicologo(ds, psicologoId);
  if (pacientes.length === 0) return [];
  const ids = pacientes.map((p) => p.pacienteId);

  const turnos: any[] = await ds.query(
    `SELECT pts.id_paciente AS pacienteId,
            COUNT(*) AS totales,
            SUM(s.fecha_hora_inicio >= NOW() AND e.nombre NOT IN (?)) AS programados,
            MIN(CASE WHEN s.fecha_hora_inicio >= NOW() AND e.nombre NOT IN (?) THEN s.fecha_hora_inicio END) AS proximo,
            MAX(CASE WHEN s.fecha_hora_inicio < NOW() AND e.nombre <> 'Cancelada' THEN s.fecha_hora_inicio END) AS ultimo
       FROM paciente_tiene_sesion pts
       JOIN sesion s ON s.id_sesion = pts.id_sesion
       JOIN estado e ON e.id_estado = s.id_estado
      WHERE s.id_psicologo = ? AND pts.id_paciente IN (?)
      GROUP BY pts.id_paciente`,
    [ESTADOS_CERRADOS, ESTADOS_CERRADOS, psicologoId, ids],
  );
  const notas: any[] = await ds.query(
    `SELECT pti.id_paciente AS pacienteId, COUNT(DISTINCT i.id_informe) AS notas, COUNT(DISTINCT seg.id_informe_seguimiento) AS seguimientos
       FROM paciente_tiene_informe pti
       JOIN informe i ON i.id_informe = pti.id_informe
       LEFT JOIN informe_seguimiento seg ON seg.id_informe = i.id_informe
      WHERE i.id_psicologo = ? AND pti.id_paciente IN (?)
      GROUP BY pti.id_paciente`,
    [psicologoId, ids],
  );
  const turnosDe = new Map(turnos.map((t) => [String(t.pacienteId), t]));
  const notasDe = new Map(notas.map((n) => [String(n.pacienteId), n]));

  return pacientes.map((p) => {
    const t = turnosDe.get(p.pacienteId);
    const n = notasDe.get(p.pacienteId);
    return {
      pacienteId: p.pacienteId,
      nombre: p.nombre,
      apellido: p.apellido,
      obraSocial: p.obraSocial,
      turnosProgramados: Number(t?.programados ?? 0),
      turnosTotales: Number(t?.totales ?? 0),
      proximoTurno: iso(t?.proximo),
      ultimoTurno: iso(t?.ultimo),
      notas: Number(n?.notas ?? 0),
      seguimientos: Number(n?.seguimientos ?? 0),
      historia: !p.historiaId ? "sin_abrir" : p.cerrada ? "cerrada" : "en_curso",
    };
  });
}

export interface TurnoDeCarpeta {
  id: string;
  inicio: string;
  fin: string | null;
  estado: string;
  modalidad: string;
  franja: "manana" | "tarde" | null;
}

export interface CarpetaPaciente {
  paciente: { id: string; nombre: string; apellido: string; dni: string; obraSocial: string | null; fechaNacimiento: string | null };
  historia: { estado: "sin_abrir" | "en_curso" | "cerrada"; fechaAdmision: string | null; fechaCierre: string | null; motivoConsulta: string | null };
  turnos: TurnoDeCarpeta[];
  notas: { id: string; titulo: string; fecha: string; etiquetas: string | null; tieneSeguimiento: boolean }[];
  seguimientos: {
    informeId: string;
    tituloNota: string;
    fecha: string;
    resumen: string;
    pautas: string | null;
    avances: string | null;
    actividades: { descripcion: string; respuesta: string | null; comentario: string | null }[];
  }[];
}

// Hora de Argentina "HH:mm" de una fecha, para saber en qué franja cae el turno
function horaLocal(d: Date) {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}
export function franjaDeHora(hhmm: string): "manana" | "tarde" | null {
  // Mañana: antes de las 14. Tarde-noche: desde las 14. Si no cae en ninguna franja de atención igual se agrupa.
  const [h] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h < 14 ? TURNOS[0].clave : TURNOS[1].clave;
}

// null = el paciente no existe o no es de este psicólogo
export async function cargarCarpeta(ds: DataSource, pacienteId: string, psicologoId: string): Promise<CarpetaPaciente | null> {
  if (!/^\d+$/.test(pacienteId) || !(await atiendeAlPaciente(ds, pacienteId, psicologoId))) return null;

  const [p]: any[] = await ds.query(
    `SELECT pa.id_paciente AS id, pe.nombre, pe.apellido, pe.dni, pe.fecha_nacimiento AS nacimiento, os.nombre AS obraSocial
       FROM paciente pa JOIN persona pe ON pe.id_persona = pa.id_persona
       LEFT JOIN obra_social os ON os.id_obra_social = pa.id_obra_social
      WHERE pa.id_paciente = ?`,
    [pacienteId],
  );
  if (!p) return null;

  const [hc]: any[] = await ds.query(
    `SELECT fecha_admision AS admision, fecha_cierre AS cierre FROM historia_clinica WHERE id_paciente = ? AND id_psicologo = ?`,
    [pacienteId, psicologoId],
  );
  // El motivo de consulta está cifrado: se lee con la entidad
  let motivoConsulta: string | null = null;
  if (hc) {
    const h = await ds.getRepository(HistoriaClinicaEntity).findOne({ where: { paciente: { id: pacienteId }, psicologo: { id: psicologoId } } });
    motivoConsulta = h?.motivoConsulta ?? null;
  }

  const filasTurnos: any[] = await ds.query(
    `SELECT s.id_sesion AS id, s.fecha_hora_inicio AS inicio, s.fecha_hora_fin AS fin, e.nombre AS estado, m.nombre AS modalidad
       FROM paciente_tiene_sesion pts
       JOIN sesion s ON s.id_sesion = pts.id_sesion
       JOIN estado e ON e.id_estado = s.id_estado
       JOIN modalidad m ON m.id_modalidad = s.id_modalidad
      WHERE pts.id_paciente = ? AND s.id_psicologo = ?
      ORDER BY s.fecha_hora_inicio ASC`,
    [pacienteId, psicologoId],
  );

  const notas = await ds
    .getRepository(InformeEntity)
    .createQueryBuilder("i")
    .innerJoin("paciente_tiene_informe", "pti", "pti.id_informe = i.id")
    .where("pti.id_paciente = :pacienteId", { pacienteId })
    .andWhere("i.id_psicologo = :psicologoId", { psicologoId })
    .orderBy("i.fecha_creacion", "ASC")
    .getMany();

  const seguimientos = notas.length
    ? await ds
        .getRepository(InformeSeguimientoEntity)
        .createQueryBuilder("s")
        .innerJoinAndSelect("s.informe", "i")
        .leftJoinAndSelect("s.actividades", "a")
        .where("i.id IN (:...ids)", { ids: notas.map((n) => n.id) })
        .orderBy("i.fechaCreacion", "ASC")
        .addOrderBy("a.orden", "ASC")
        .getMany()
    : [];
  const conSeguimiento = new Set(seguimientos.map((s) => String(s.informe.id)));

  const nacimiento = p.nacimiento as string | Date | null;
  return {
    paciente: {
      id: String(p.id),
      nombre: p.nombre,
      apellido: p.apellido,
      dni: p.dni,
      obraSocial: p.obraSocial ?? null,
      fechaNacimiento: nacimiento ? String(nacimiento instanceof Date ? nacimiento.toISOString() : nacimiento).slice(0, 10) : null,
    },
    historia: {
      estado: !hc ? "sin_abrir" : hc.cierre ? "cerrada" : "en_curso",
      fechaAdmision: hc?.admision ? iso(hc.admision) : null,
      fechaCierre: hc?.cierre ? iso(hc.cierre) : null,
      motivoConsulta,
    },
    turnos: filasTurnos.map((t) => {
      const inicio = new Date(t.inicio);
      return {
        id: String(t.id),
        inicio: inicio.toISOString(),
        fin: iso(t.fin),
        estado: t.estado,
        modalidad: t.modalidad,
        franja: franjaDeHora(horaLocal(inicio)),
      };
    }),
    notas: notas.map((n) => ({
      id: String(n.id),
      titulo: n.titulo,
      fecha: new Date(n.fechaCreacion).toISOString(),
      etiquetas: n.etiquetas ?? null,
      tieneSeguimiento: conSeguimiento.has(String(n.id)),
    })),
    seguimientos: seguimientos.map((s) => ({
      informeId: String(s.informe.id),
      tituloNota: s.informe.titulo,
      fecha: new Date(s.informe.fechaCreacion).toISOString(),
      resumen: s.resumen,
      pautas: s.pautas ?? null,
      avances: s.avances ?? null,
      actividades: (s.actividades ?? []).map((a: any) => ({ descripcion: a.descripcion, respuesta: a.respuesta ?? null, comentario: a.comentario ?? null })),
    })),
  };
}
