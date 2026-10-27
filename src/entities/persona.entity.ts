// persona.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "persona" })
export class PersonaEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_persona" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;

  @Column({ name: "apellido" })
  apellido: string;

  @Column({ name: "dni" })
  dni: string;

  @Column({ name: "fecha_nacimiento", type: "date" })
  fechaNacimiento: Date;

  // Celular para los recordatorios por WhatsApp, en formato internacional sin "+" (5493704123456)
  @Column({ name: "telefono", type: "varchar", length: 20, nullable: true })
  telefono?: string | null;
}