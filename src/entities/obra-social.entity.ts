// obra-social.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "obra_social" })
export class ObraSocialEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_obra_social" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;

  @Column({ name: "activo", type: "tinyint" })
  activo: boolean;
}