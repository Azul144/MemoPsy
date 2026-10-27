// perfil.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";

@Entity({ name: "perfil" })
export class PerfilEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_perfil" })
  id: string;

  @Column({ name: "nombre" })
  nombre: string;

  @Column({ name: "descripcion" })
  descripcion: string;

  /*
  @OneToMany(() => UsuarioTienePerfilEntity, usuarioTienePerfil => usuarioTienePerfil.perfil)
  usuarios: UsuarioTienePerfilEntity[];

  @OneToMany(() => PerfilTienePermisoEntity, perfilTienePermiso => perfilTienePermiso.perfil)
  permisos: PerfilTienePermisoEntity[];
  */
}