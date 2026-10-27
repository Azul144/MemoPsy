// informe.entity.ts
import { Column, Entity, ManyToOne, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { PsicologoEntity } from "./psicologo.entity";
import { columnaCifrada } from "../lib/auth/columna-cifrada";

@Entity({ name: "informe" })
export class InformeEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_informe" })
  id: string;

  //@Column({ name: "id_psicologo" })
  //psicologoId: string;

  @Column({ name: "titulo" })
  titulo: string;

  // Cifrado en la base (RNF Seguridad)
  @Column({ name: "contenido", type: "text", transformer: columnaCifrada })
  contenido: string;

  // RF 2.1 - Etiquetas separadas por coma para categorizar y buscar
  @Column({ name: "etiquetas", type: "varchar", length: 255, nullable: true })
  etiquetas: string | null;

  @Column({ name: "fecha_creacion", type: "datetime" })
  fechaCreacion: Date;

  @Column({ name: "es_privado", type: "tinyint" })
  esPrivado: boolean;

  @ManyToOne(() => PsicologoEntity)
  @JoinColumn({ name: "id_psicologo" })
  psicologo: PsicologoEntity;

  /*
  @OneToMany(() => PacienteTieneInformeEntity, pacienteTieneInforme => pacienteTieneInforme.informe)
  pacienteTieneInforme: PacienteTieneInformeEntity[];
  */
}