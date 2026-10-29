// paciente.entity.ts
import { Entity, ManyToOne, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
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

}

