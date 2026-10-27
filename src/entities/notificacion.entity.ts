// notificacion.entity.ts
// RF 3.2 / RF 3.3 - Un aviso dentro de la plataforma para un usuario (cambio de turno o recordatorio).
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "notificacion" })
export class NotificacionEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_notificacion" })
  id: string;

  // Destinatario del aviso
  @Column({ name: "id_usuario", type: "int" })
  usuarioId: number;

  @Column({ name: "id_sesion", type: "int", nullable: true })
  sesionId: number | null;

  // REPROGRAMACION, CANCELACION, RECORDATORIO
  @Column({ name: "tipo", type: "varchar", length: 30 })
  tipo: string;

  @Column({ name: "titulo", type: "varchar", length: 120 })
  titulo: string;

  // Solo fecha, hora y con quién es el turno. Nunca contenido clínico.
  @Column({ name: "mensaje", type: "varchar", length: 500 })
  mensaje: string;

  @Column({ name: "leida", type: "tinyint", default: 0 })
  leida: boolean;

  @Column({ name: "fecha", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fecha: Date;
}
