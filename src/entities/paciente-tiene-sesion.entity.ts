// paciente-tiene-sesion.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { SesionEntity } from "./sesion.entity";
import { PacienteEntity } from "./paciente.entity";

@Entity({ name: "paciente_tiene_sesion" })
export class PacienteTieneSesionEntity {
  @PrimaryColumn({ name: "id_sesion" })
  sesionId: string;
  
  @PrimaryColumn({ name: "id_paciente" })
  pacienteId: string;

  @ManyToOne(() => SesionEntity)
  @JoinColumn({ name: "id_sesion" })
  sesion: SesionEntity;

  @ManyToOne(() => PacienteEntity)
  @JoinColumn({ name: "id_paciente" })
  paciente: PacienteEntity;
}