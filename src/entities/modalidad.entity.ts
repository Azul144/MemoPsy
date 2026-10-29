// modalidad.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "modalidad" })
export class ModalidadEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_modalidad" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;
}