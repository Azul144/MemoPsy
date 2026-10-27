// modulo.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "modulo" })
export class ModuloEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_modulo" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;
}
