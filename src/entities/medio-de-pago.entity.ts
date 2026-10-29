// medio-de-pago.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "medio_de_pago" })
export class MedioDePagoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_medio_de_pago" })
  id: string;

  @Column({ name: "descripcion" })
  descripcion: string;
}