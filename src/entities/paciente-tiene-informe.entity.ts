// paciente-tiene-informe.entity.ts
import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { InformeEntity } from "./informe.entity";
import { PacienteEntity } from "./paciente.entity";

@Entity({ name: "paciente_tiene_informe" })
export class PacienteTieneInformeEntity {
  @PrimaryColumn({ name: "id_informe" })
  informeId: string;

  @PrimaryColumn({ name: "id_paciente" })
  pacienteId: string;

  @ManyToOne(() => InformeEntity)
  @JoinColumn({ name: "id_informe" })
  informe: InformeEntity;

  @ManyToOne(() => PacienteEntity)
  @JoinColumn({ name: "id_paciente" })
  paciente: PacienteEntity;
}