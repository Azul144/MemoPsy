// usuario.entity.ts
import { Column, Entity, OneToOne, JoinColumn, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import type { PersonaEntity } from "./persona.entity";

@Entity({ name: "usuario" })
export class UsuarioEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_usuario" })
  id: string;

  @Column({ name: "email" })
  email: string;

  @Column({ name: "password" })
  password: string;

  @Column({ name: "activo", type: "tinyint" })
  activo: boolean;

  @Column({ name: "ultimo_acceso", type: "datetime" })
  ultimoAcceso: Date;

  @OneToOne("PersonaEntity")
  @JoinColumn({ name: "id_persona" })
  persona: PersonaEntity;

  @Column({ name: "mfa_habilitado", type: "tinyint", default: 0 })
  mfaHabilitado: boolean;

  @Column({ name: "mfa_secreto", type: "varchar", length: 255, nullable: true, select: false })
  mfaSecreto: string | null;

  @Column({ name: "mfa_codigos_recuperacion", type: "text", nullable: true, select: false })
  mfaCodigosRecuperacion: string | null;

  @Column({ name: "intentos_fallidos", type: "int", default: 0 })
  intentosFallidos: number;

  @Column({ name: "bloqueado_hasta", type: "datetime", nullable: true })
  bloqueadoHasta: Date | null;

  @Column({ name: "reset_token_hash", type: "char", length: 64, nullable: true, select: false })
  resetTokenHash: string | null;

  @Column({ name: "reset_expira", type: "datetime", nullable: true })
  resetExpira: Date | null;
}
