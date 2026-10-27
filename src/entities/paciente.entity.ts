// paciente.entity.ts
import { Entity, ManyToOne, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import type { PersonaEntity } from "./persona.entity";
import { ObraSocialEntity } from "./obra-social.entity";

@Entity({ name: "paciente" })
export class PacienteEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_paciente" })
  id: string;

  @OneToOne("PersonaEntity")
  @JoinColumn({ name: "id_persona" })
  persona: PersonaEntity;

  @ManyToOne(() => ObraSocialEntity)
  @JoinColumn({ name: "id_obra_social" })
  obraSocial: ObraSocialEntity;

  /*
  @OneToMany(() => PacienteTieneInformeEntity, pacienteTieneInforme => pacienteTieneInforme.paciente)
  informes: PacienteTieneInformeEntity[];

  @OneToMany(() => PacienteTieneSesionEntity, pacienteTieneSesion => pacienteTieneSesion.paciente)
  sesiones: PacienteTieneSesionEntity[];
  */
}

//@Column({ name: "id_persona" })
  //personaId: string;

  //@Column({ name: "id_obra_social" })
  //obraSocialId: string;