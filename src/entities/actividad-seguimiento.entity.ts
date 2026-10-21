// actividad-seguimiento.entity.ts
// RF 2.4 - Actividad acordada en sesión para hacer hasta la próxima, con la respuesta del paciente.
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base-entity";
import type { InformeSeguimientoEntity } from "./informe-seguimiento.entity";
import { columnaCifrada } from "../lib/auth/columna-cifrada";

export type RespuestaActividad = "HECHA" | "NO_PUDE";

@Entity({ name: "actividad_seguimiento" })
export class ActividadSeguimientoEntity extends BaseEntity {
  @ManyToOne("InformeSeguimientoEntity", "actividades", { onDelete: "CASCADE" })
  @JoinColumn({ name: "seguimiento_id" })
  seguimiento: InformeSeguimientoEntity;

  // Descripción y comentario se guardan cifrados; por eso la columna es TEXT (el texto cifrado ocupa más)
  @Column({ name: "descripcion", type: "text", transformer: columnaCifrada })
  descripcion: string;

  @Column({ name: "orden", type: "int", default: 0 })
  orden: number;

  // null = el paciente todavía no respondió
  @Column({ name: "respuesta", type: "varchar", length: 20, nullable: true })
  respuesta: RespuestaActividad | null;

  @Column({ name: "comentario", type: "text", nullable: true, transformer: columnaCifrada })
  comentario: string | null;

  @Column({ name: "fecha_respuesta", type: "datetime", nullable: true })
  fechaRespuesta: Date | null;
}
