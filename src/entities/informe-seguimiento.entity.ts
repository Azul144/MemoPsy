// informe-seguimiento.entity.ts
// RF 2.4 - Informe de seguimiento para el paciente, generado a partir de una nota clínica.
// Solo contiene lo que el psicólogo decide compartir; la nota clínica sigue siendo privada.
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { BaseEntity } from "./base-entity";
import { InformeEntity } from "./informe.entity";
import type { ActividadSeguimientoEntity } from "./actividad-seguimiento.entity";

@Entity({ name: "informe_seguimiento" })
export class InformeSeguimientoEntity extends BaseEntity {
  @OneToOne(() => InformeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "informe_id" })
  informe: InformeEntity;

  // Lo que se trabajó en la sesión, en lenguaje simple
  @Column({ name: "resumen", type: "text" })
  resumen: string;

  @Column({ name: "pautas", type: "text", nullable: true })
  pautas: string | null;

  // Devolución del psicólogo: avances y logros
  @Column({ name: "avances", type: "text", nullable: true })
  avances: string | null;

  @Column({ name: "fecha_creacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaCreacion: Date;

  @Column({ name: "fecha_actualizacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaActualizacion: Date;

  @OneToMany("ActividadSeguimientoEntity", "seguimiento")
  actividades: ActividadSeguimientoEntity[];
}
