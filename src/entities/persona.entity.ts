// persona.entity.ts
import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "persona" })
export class PersonaEntity extends BaseEntity {
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