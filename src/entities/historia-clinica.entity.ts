// historia-clinica.entity.ts
// Historia clínica del paciente (Ley 26.529, arts. 12 a 15): una por paciente y psicólogo tratante.
// Guarda la admisión y el cierre; la evolución son las notas clínicas del mismo psicólogo y paciente.
// Todos los textos se guardan cifrados.
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { PacienteEntity } from "./paciente.entity";
import { PsicologoEntity } from "./psicologo.entity";
import { columnaCifrada } from "../lib/auth/columna-cifrada";
import type { MotivoCierre } from "../lib/historia-clinica/apartados";

export { MOTIVOS_CIERRE, CAMPOS_TEXTO_HISTORIA, type MotivoCierre, type CampoTextoHistoria } from "../lib/historia-clinica/apartados";

const texto = (name: string) => ({ name, type: "text" as const, nullable: true, transformer: columnaCifrada });

@Entity({ name: "historia_clinica" })
export class HistoriaClinicaEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_historia_clinica" })
  id: string;

  @ManyToOne(() => PacienteEntity)
  @JoinColumn({ name: "id_paciente" })
  paciente: PacienteEntity;

  @ManyToOne(() => PsicologoEntity)
  @JoinColumn({ name: "id_psicologo" })
  psicologo: PsicologoEntity;

  @Column({ name: "fecha_admision", type: "date" })
  fechaAdmision: string;

  @Column(texto("estado_civil")) estadoCivil: string | null;
  @Column(texto("ocupacion")) ocupacion: string | null;
  @Column(texto("escolaridad")) escolaridad: string | null;
  @Column(texto("convivencia")) convivencia: string | null;
  @Column(texto("contacto_emergencia")) contactoEmergencia: string | null;
  @Column(texto("derivado_por")) derivadoPor: string | null;

  @Column(texto("motivo_consulta")) motivoConsulta: string | null;
  @Column(texto("historia_problema")) historiaProblema: string | null;
  @Column(texto("antecedentes_personales")) antecedentesPersonales: string | null;
  @Column(texto("antecedentes_familiares")) antecedentesFamiliares: string | null;
  @Column(texto("examen_mental")) examenMental: string | null;
  @Column(texto("evaluaciones")) evaluaciones: string | null;
  @Column(texto("impresion_diagnostica")) impresionDiagnostica: string | null;
  @Column(texto("plan_tratamiento")) planTratamiento: string | null;

  @Column({ name: "consentimiento_informado", type: "tinyint", default: 0 })
  consentimientoInformado: boolean;

  @Column({ name: "fecha_consentimiento", type: "date", nullable: true })
  fechaConsentimiento: string | null;

  @Column({ name: "fecha_cierre", type: "date", nullable: true })
  fechaCierre: string | null;

  @Column({ name: "motivo_cierre", type: "varchar", length: 20, nullable: true })
  motivoCierre: MotivoCierre | null;

  @Column(texto("epicrisis")) epicrisis: string | null;

  @Column({ name: "fecha_creacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaCreacion: Date;

  @Column({ name: "fecha_actualizacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaActualizacion: Date;
}
