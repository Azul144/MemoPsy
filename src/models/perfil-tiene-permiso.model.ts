// perfil-tiene-permiso.model.ts
import { Permiso } from './permiso.model';
import { Perfil } from './perfil.model';
import { PerfilTienePermisoEntity } from '../entities/perfil-tiene-permiso.entity';

export class PerfilTienePermiso {
    private _perfilId: string;
    private _permisoId: string;
    private _perfil: Perfil;
    private _permiso: Permiso;
    
    constructor(data: {
        id?: string;
        perfilId: string;
        permisoId: string;
        perfil: Perfil;
        permiso: Permiso;
    }) {
        this._perfilId = data.perfilId;
        this._permisoId = data.permisoId;
        this._perfil = data.perfil;
        this._permiso = data.permiso;
    }

    get perfilId(): string { return this._perfilId; }
    set perfilId(value: string) {
        if (!value || value.trim() === '') {
            throw new Error('El ID del perfil no puede estar vacío');
        }
        this._perfilId = value;
    }

    get permisoId(): string { return this._permisoId; }
    set permisoId(value: string) {
        if (!value || value.trim() === '') {
            throw new Error('El ID del permiso no puede estar vacío');
        }
        this._permisoId = value;
    }
    
    get perfil(): Perfil { return this._perfil; }
    set perfil(value: Perfil) {
        if (!value) {
        throw new Error('El perfil no puede ser nulo');
        }
        this._perfil = value;
    }
    
    get permiso(): Permiso { return this._permiso; }
    set permiso(value: Permiso) {
        if (!value) {
        throw new Error('El permiso no puede ser nulo');
        }
        this._permiso = value;
    }
    
    // Método para convertir a la entidad
    toEntity(): Partial<PerfilTienePermisoEntity> {
        return {
        perfilId: this.perfil.id,
        permisoId: this.permiso.id,
        };
    }
    
    // Método para convertir de entidad a modelo
    static fromEntity(entity: PerfilTienePermisoEntity): PerfilTienePermiso {
        return new PerfilTienePermiso({
        perfilId: entity.perfilId,
        permisoId: entity.permisoId,
        perfil: Perfil.fromEntity(entity.perfil),
        permiso: Permiso.fromEntity(entity.permiso),
        });
    }
}

/*
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
*/