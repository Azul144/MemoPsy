// usuario-tiene-perfil.model.ts
import { Usuario } from "./usuario.model";
import { Perfil } from "./perfil.model";
import { UsuarioTienePerfilEntity } from "../entities/usuario-tiene-perfil.entity";

export class UsuarioTienePerfil {
    private _usuario: Usuario;
    private _perfil: Perfil;
    private _usuarioId: string;
    private _perfilId: string;
    constructor(data: {
        usuarioId?: string;
        perfilId?: string;
        usuario: Usuario;
        perfil: Perfil;
    }) {
        this._usuarioId = data.usuarioId || data.usuario.id;
        this._perfilId = data.perfilId || data.perfil.id;
        this._usuario = data.usuario;
        this._perfil = data.perfil;
    }
    // Getters y Setters
    get usuarioId(): string { return this._usuarioId; }
    set usuarioId(value: string) {
        if (!value || value.trim() === '') {
            throw new Error('El ID del usuario no puede estar vacío');
        }
        this._usuarioId = value;
    }
    get perfilId(): string { return this._perfilId; }
    set perfilId(value: string) {
        if (!value || value.trim() === '') {
            throw new Error('El ID del perfil no puede estar vacío');
        }
        this._perfilId = value;
    }
    get usuario(): Usuario { return this._usuario; }
    set usuario(value: Usuario) {
        if (!value) {
            throw new Error('El usuario no puede estar vacío');
        }
        this._usuario = value;
    }
    get perfil(): Perfil { return this._perfil; }
    set perfil(value: Perfil) {
        if (!value) {
            throw new Error('El perfil no puede estar vacío');
        }
        this._perfil = value;
    }
    // Métodos para convertir entre entidad y modelo
    static fromEntity(entity: UsuarioTienePerfilEntity): UsuarioTienePerfil {
        return new UsuarioTienePerfil({
            usuarioId: entity.usuarioId,
            perfilId: entity.perfilId,
            usuario: Usuario.fromEntity(entity.usuario),
            perfil: Perfil.fromEntity(entity.perfil)
        });
    }
    toEntity(): Partial<UsuarioTienePerfilEntity> {
        return {
            usuarioId: this.usuarioId,
            perfilId: this.perfilId,
        };
    }
}

