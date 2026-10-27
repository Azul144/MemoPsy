// usuario-tiene-perfil.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { UsuarioEntity } from "./usuario.entity";
import { PerfilEntity } from "./perfil.entity";

@Entity({ name: "usuario_tiene_perfil" })
export class UsuarioTienePerfilEntity {
  @PrimaryColumn({ name: "id_usuario" })
  usuarioId: string;

  @PrimaryColumn({ name: "id_perfil" })
  perfilId: string;

  @ManyToOne(() => UsuarioEntity)
  @JoinColumn({ name: "id_usuario" })
  usuario: UsuarioEntity;

  @ManyToOne(() => PerfilEntity)
  @JoinColumn({ name: "id_perfil" })
  perfil: PerfilEntity;
}