// accion.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "accion" })
export class AccionEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_accion" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;
}