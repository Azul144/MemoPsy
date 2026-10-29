// estado.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "estado" })
export class EstadoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_estado" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;
}