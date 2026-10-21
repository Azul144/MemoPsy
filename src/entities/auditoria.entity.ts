// auditoria.entity.ts
// RF 1.4 - Un evento del registro de auditoría: quién hizo qué, sobre qué y cuándo.
import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "auditoria" })
export class AuditoriaEntity extends BaseEntity {
  @Column({ name: "fecha", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fecha: Date;

  @Column({ name: "usuario_id", type: "int", nullable: true })
  usuarioId: number | null;

  @Column({ name: "email", type: "varchar", length: 255, nullable: true })
  email: string | null;

  // LOGIN_OK, LOGIN_FALLIDO, LOGOUT, CREAR, EDITAR, ELIMINAR, VER, CAMBIAR_ESTADO, ...
  @Column({ name: "accion", type: "varchar", length: 40 })
  accion: string;

  // Autenticación, Usuarios, Perfiles, Sesiones, Informes
  @Column({ name: "modulo", type: "varchar", length: 40 })
  modulo: string;

  @Column({ name: "entidad_id", type: "varchar", length: 50, nullable: true })
  entidadId: string | null;

  // Descripción corta de la acción. Nunca contiene contenido clínico.
  @Column({ name: "detalle", type: "varchar", length: 500, nullable: true })
  detalle: string | null;

  @Column({ name: "ip", type: "varchar", length: 45, nullable: true })
  ip: string | null;
}
