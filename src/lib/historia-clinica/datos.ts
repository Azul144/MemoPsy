// src/lib/historia-clinica/datos.ts
// Consultas compartidas por las rutas de la historia clínica.
// La historia es del psicólogo tratante: cada psicólogo ve solo la suya y solo sus notas como evolución.
import type { DataSource } from "typeorm";
import {
  CAMPOS_TEXTO_HISTORIA,
  HistoriaClinicaEntity,
  InformeEntity,
  MOTIVOS_CIERRE,
  PacienteEntity,
  PsicologoEntity,
  type CampoTextoHistoria,
  type MotivoCierre,
} from "@/entities";

export interface PacienteDeHistoria {
  pacienteId: string;
  nombre: string;
  apellido: string;
  dni: string;
  obraSocial: string | null;
  historiaId: string | null;
  fechaActualizacion: string | null;
  cerrada: boolean;
}

// Pacientes que el psicólogo atiende (turnos o notas con él) o que ya tienen historia suya
export async function pacientesDelPsicologo(ds: DataSource, psicologoId: string): Promise<PacienteDeHistoria[]> {
  const filas: any[] = await ds.query(
    `SELECT pa.id_paciente AS pacienteId, pe.nombre, pe.apellido, pe.dni, os.nombre AS obraSocial,
            hc.id_historia_clinica AS historiaId, hc.fecha_actualizacion AS fechaActualizacion, hc.fecha_cierre AS fechaCierre
       FROM paciente pa
       JOIN persona pe ON pe.id_persona = pa.id_persona
       LEFT JOIN obra_social os ON os.id_obra_social = pa.id_obra_social
       LEFT JOIN historia_clinica hc ON hc.id_paciente = pa.id_paciente AND hc.id_psicologo = ?
      WHERE hc.id_historia_clinica IS NOT NULL
         OR pa.id_paciente IN (SELECT pts.id_paciente FROM paciente_tiene_sesion pts JOIN sesion s ON s.id_sesion = pts.id_sesion WHERE s.id_psicologo = ?)
         OR pa.id_paciente IN (SELECT pti.id_paciente FROM paciente_tiene_informe pti JOIN informe i ON i.id_informe = pti.id_informe WHERE i.id_psicologo = ?)
      ORDER BY pe.apellido, pe.nombre`,
    [psicologoId, psicologoId, psicologoId],
  );
  return filas.map((f) => ({
    pacienteId: String(f.pacienteId),
    nombre: f.nombre,
    apellido: f.apellido,
    dni: f.dni,
    obraSocial: f.obraSocial ?? null,
    historiaId: f.historiaId != null ? String(f.historiaId) : null,
    fechaActualizacion: f.fechaActualizacion ? new Date(f.fechaActualizacion).toISOString() : null,
    cerrada: !!f.fechaCierre,
  }));
}

export interface HistoriaCompleta {
  paciente: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string | null;
    telefono: string | null;
    obraSocial: string | null;
  };
  psicologo: { nombre: string; especialidad: string | null; licencia: string | null };
  historia: HistoriaClinicaEntity | null;
  // Notas clínicas del psicólogo sobre este paciente, de la más vieja a la más nueva
  evoluciones: { id: string; titulo: string; contenido: string; fecha: string }[];
}

// ¿El psicólogo atiende a este paciente? (turnos o notas con él, o una historia suya ya abierta)
// Sin esto, cualquier psicólogo vería los datos de cualquier paciente con solo cambiar el id.
export async function atiendeAlPaciente(ds: DataSource, pacienteId: string, psicologoId: string): Promise<boolean> {
  const filas: any[] = await ds.query(
    `SELECT 1 FROM historia_clinica WHERE id_paciente = ? AND id_psicologo = ?
     UNION SELECT 1 FROM paciente_tiene_sesion pts JOIN sesion s ON s.id_sesion = pts.id_sesion WHERE pts.id_paciente = ? AND s.id_psicologo = ?
     UNION SELECT 1 FROM paciente_tiene_informe pti JOIN informe i ON i.id_informe = pti.id_informe WHERE pti.id_paciente = ? AND i.id_psicologo = ?
     LIMIT 1`,
    [pacienteId, psicologoId, pacienteId, psicologoId, pacienteId, psicologoId],
  );
  return filas.length > 0;
}

// null = el paciente no existe o no es de este psicólogo (se responde igual, para no revelar nada)
export async function cargarHistoria(ds: DataSource, pacienteId: string, psicologoId: string): Promise<HistoriaCompleta | null> {
  if (!(await atiendeAlPaciente(ds, pacienteId, psicologoId))) return null;
  const paciente = await ds.getRepository(PacienteEntity).findOne({
    where: { id: pacienteId },
    relations: ["persona", "obraSocial"],
  });
  if (!paciente) return null;

  const psicologo = await ds.getRepository(PsicologoEntity).findOne({ where: { id: psicologoId }, relations: ["persona"] });
  const historia = await ds.getRepository(HistoriaClinicaEntity).findOne({
    where: { paciente: { id: pacienteId }, psicologo: { id: psicologoId } },
  });
  const notas = await ds
    .getRepository(InformeEntity)
    .createQueryBuilder("i")
    .innerJoin("paciente_tiene_informe", "pti", "pti.id_informe = i.id")
    .where("pti.id_paciente = :pacienteId", { pacienteId })
    .andWhere("i.id_psicologo = :psicologoId", { psicologoId })
    .orderBy("i.fecha_creacion", "ASC")
    .getMany();

  const nacimiento = paciente.persona.fechaNacimiento as unknown as string | Date | null;
  return {
    paciente: {
      id: String(paciente.id),
      nombre: paciente.persona.nombre,
      apellido: paciente.persona.apellido,
      dni: paciente.persona.dni,
      fechaNacimiento: nacimiento ? String(nacimiento instanceof Date ? nacimiento.toISOString() : nacimiento).slice(0, 10) : null,
      telefono: paciente.persona.telefono ?? null,
      obraSocial: paciente.obraSocial?.nombre ?? null,
    },
    psicologo: {
      nombre: psicologo ? `${psicologo.persona.nombre} ${psicologo.persona.apellido}` : "",
      especialidad: psicologo?.especialidad ?? null,
      licencia: psicologo?.numeroLicencia ?? null,
    },
    historia,
    evoluciones: notas.map((n) => ({
      id: String(n.id),
      titulo: n.titulo,
      contenido: n.contenido,
      fecha: new Date(n.fechaCreacion).toISOString(),
    })),
  };
}

const LARGO_MAXIMO_CAMPO = 20000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type DatosHistoria = Partial<Record<CampoTextoHistoria, string | null>> & {
  fechaAdmision: string;
  consentimientoInformado: boolean;
  fechaConsentimiento: string | null;
  fechaCierre: string | null;
  motivoCierre: MotivoCierre | null;
};

// Valida lo que llega del formulario; devuelve los datos limpios o el mensaje de error
export function validarHistoria(body: any): { datos: DatosHistoria } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Datos inválidos." };
  const fecha = (v: unknown) => (typeof v === "string" && FECHA.test(v) ? v : null);

  const fechaAdmision = fecha(body.fechaAdmision);
  if (!fechaAdmision) return { error: "Indicá la fecha de admisión." };

  const datos: DatosHistoria = {
    fechaAdmision,
    consentimientoInformado: body.consentimientoInformado === true,
    fechaConsentimiento: fecha(body.fechaConsentimiento),
    fechaCierre: fecha(body.fechaCierre),
    motivoCierre: MOTIVOS_CIERRE.includes(body.motivoCierre) ? body.motivoCierre : null,
  };
  for (const campo of CAMPOS_TEXTO_HISTORIA) {
    const valor = typeof body[campo] === "string" ? body[campo].trim() : "";
    if (valor.length > LARGO_MAXIMO_CAMPO) return { error: `Un apartado supera los ${LARGO_MAXIMO_CAMPO} caracteres.` };
    datos[campo] = valor || null;
  }
  if (datos.consentimientoInformado && !datos.fechaConsentimiento) datos.fechaConsentimiento = fechaAdmision;
  if (!datos.consentimientoInformado) datos.fechaConsentimiento = null;
  if (datos.fechaCierre && !datos.motivoCierre) return { error: "Indicá el motivo del cierre." };
  if (!datos.fechaCierre) {
    datos.motivoCierre = null;
  } else if (datos.fechaCierre < fechaAdmision) {
    return { error: "La fecha de cierre no puede ser anterior a la de admisión." };
  }
  return { datos };
}
