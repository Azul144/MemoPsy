// perfil-tiene-permiso.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { PerfilEntity } from "./perfil.entity";
import { PermisoEntity } from "./permiso.entity";

@Entity({ name: "perfil_tiene_permiso" })
export class PerfilTienePermisoEntity {
  @PrimaryColumn({ name: "id_perfil" })
  perfilId: string;
    
  @PrimaryColumn({ name: "id_permiso" })
  permisoId: string;

  @ManyToOne(() => PerfilEntity)
  @JoinColumn({ name: "id_perfil" })
  perfil: PerfilEntity;

  @ManyToOne(() => PermisoEntity)
  @JoinColumn({ name: "id_permiso" })
  permiso: PermisoEntity;
}