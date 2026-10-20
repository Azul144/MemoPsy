// sesion.entity.ts
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { PsicologoEntity } from "./psicologo.entity";
import { ModalidadEntity } from "./modalidad.entity";
import { EstadoEntity } from "./estado.entity";
import { MedioDePagoEntity } from "./medio-de-pago.entity";

@Entity({ name: "sesion" })
export class SesionEntity extends BaseEntity {
  @Column({ name: "fecha_hora_inicio", type: "datetime" })
  fechaHoraInicio: Date;

  @Column({ name: "fecha_hora_fin", type: "datetime" })
  fechaHoraFin: Date;

  @ManyToOne(() => PsicologoEntity)
  @JoinColumn({ name: "psicologo_id" })
  psicologo: PsicologoEntity;

  @ManyToOne(() => ModalidadEntity)
  @JoinColumn({ name: "modalidad_id" })
  modalidad: ModalidadEntity;

  @ManyToOne(() => EstadoEntity)
  @JoinColumn({ name: "estado_id" })
  estado: EstadoEntity;

  // RF 3.4 - Enlace de Google Meet para sesiones remotas
  @Column({ name: "enlace_videollamada", type: "varchar", length: 255, nullable: true })
  enlaceVideollamada: string | null;

  // RF 3.5 - Pago de la sesión ("Pendiente" o "Pagado")
  @Column({ name: "estado_pago", type: "varchar", length: 20, default: "Pendiente" })
  estadoPago: string;

  @ManyToOne(() => MedioDePagoEntity, { nullable: true })
  @JoinColumn({ name: "medio_de_pago_id" })
  medioDePago: MedioDePagoEntity | null;

  @Column({ name: "monto", type: "decimal", precision: 10, scale: 2, nullable: true })
  monto: string | null;

  @Column({ name: "fecha_pago", type: "datetime", nullable: true })
  fechaPago: Date | null;
}