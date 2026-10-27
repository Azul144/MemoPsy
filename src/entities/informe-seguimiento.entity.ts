// informe-seguimiento.entity.ts
// RF 2.4 - Informe de seguimiento para el paciente, generado a partir de una nota clínica.
// Solo contiene lo que el psicólogo decide compartir; la nota clínica sigue siendo privada.
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { InformeEntity } from "./informe.entity";
import type { ActividadSeguimientoEntity } from "./actividad-seguimiento.entity";
import { columnaCifrada } from "../lib/auth/columna-cifrada";

@Entity({ name: "informe_seguimiento" })
export class InformeSeguimientoEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_informe_seguimiento" })
  id: string;

  @OneToOne(() => InformeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "id_informe" })
  informe: InformeEntity;

  // Lo que se trabajó en la sesión, en lenguaje simple (resumen, pautas y avances se guardan cifrados)
  @Column({ name: "resumen", type: "text", transformer: columnaCifrada })
  resumen: string;

  @Column({ name: "pautas", type: "text", nullable: true, transformer: columnaCifrada })
  pautas: string | null;

  // Devolución del psicólogo: avances y logros
  @Column({ name: "avances", type: "text", nullable: true, transformer: columnaCifrada })
  avances: string | null;

  @Column({ name: "fecha_creacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaCreacion: Date;

  @Column({ name: "fecha_actualizacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaActualizacion: Date;

  @OneToMany("ActividadSeguimientoEntity", "seguimiento")
  actividades: ActividadSeguimientoEntity[];
}
