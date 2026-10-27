// sesion.entity.ts
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { PsicologoEntity } from "./psicologo.entity";
import { ModalidadEntity } from "./modalidad.entity";
import { EstadoEntity } from "./estado.entity";
import { MedioDePagoEntity } from "./medio-de-pago.entity";

@Entity({ name: "sesion" })
export class SesionEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_sesion" })
  id: string;

  @Column({ name: "fecha_hora_inicio", type: "datetime" })
  fechaHoraInicio: Date;

  @Column({ name: "fecha_hora_fin", type: "datetime" })
  fechaHoraFin: Date;

  @ManyToOne(() => PsicologoEntity)
  @JoinColumn({ name: "id_psicologo" })
  psicologo: PsicologoEntity;

  @ManyToOne(() => ModalidadEntity)
  @JoinColumn({ name: "id_modalidad" })
  modalidad: ModalidadEntity;

  @ManyToOne(() => EstadoEntity)
  @JoinColumn({ name: "id_estado" })
  estado: EstadoEntity;

  // RF 3.4 - Enlace de Google Meet para sesiones remotas
  @Column({ name: "enlace_videollamada", type: "varchar", length: 255, nullable: true })
  enlaceVideollamada: string | null;

  // RF 3.5 - Pago de la sesión ("Pendiente" o "Pagado")
  @Column({ name: "estado_pago", type: "varchar", length: 20, default: "Pendiente" })
  estadoPago: string;

  @ManyToOne(() => MedioDePagoEntity, { nullable: true })
  @JoinColumn({ name: "id_medio_de_pago" })
  medioDePago: MedioDePagoEntity | null;

  @Column({ name: "monto", type: "decimal", precision: 10, scale: 2, nullable: true })
  monto: string | null;

  @Column({ name: "fecha_pago", type: "datetime", nullable: true })
  fechaPago: Date | null;
}