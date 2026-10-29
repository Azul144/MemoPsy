// psicologo.entity.ts
import { Column, Entity, OneToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import type { PersonaEntity } from "./persona.entity";

@Entity({ name: "psicologo" })
export class PsicologoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_psicologo" })
  id: string;

  @Column({ name: "especialidad" })
  especialidad: string;

  @Column({ name: "numero_licencia" })
  numeroLicencia: string;

  @OneToOne("PersonaEntity")
  @JoinColumn({ name: "id_persona" })
  persona: PersonaEntity;
}