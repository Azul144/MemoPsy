// permiso.entity.ts
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { ModuloEntity } from "./modulo.entity";
import { AccionEntity } from "./accion.entity";

@Entity({ name: "permiso" })
export class PermisoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_permiso" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;

  @Column({ name: "descripcion" })
  descripcion: string;

  @ManyToOne(() => ModuloEntity)
  @JoinColumn({ name: "id_modulo" })
  modulo: ModuloEntity;

  @ManyToOne(() => AccionEntity)
  @JoinColumn({ name: "id_accion" })
  accion: AccionEntity;
}