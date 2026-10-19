// usuario.model.ts
import { Persona } from "./persona.model";
import { Base } from "./base-model";
import { UsuarioEntity } from "../entities/usuario.entity";

export class Usuario extends Base {
    private _email: string;
    private _password: string;
    private _activo: boolean;
    private _ultimoAcceso: Date;
    private _persona?: Persona;
    
    constructor(data: {
        id?: string;
        email: string;
        password: string;
        activo: boolean;
        ultimoAcceso: Date;
        persona?: Persona;
    }) {
        super({ id: data.id });
        this._email = data.email; // Usa el setter para validación
        this._password = data.password; // Usa el setter para validación
        this._activo = data.activo; // Usa el setter para validación
        this._ultimoAcceso = data.ultimoAcceso; // Usa el setter para validación
        this._persona = data.persona;
    }
    
    // Getters y Setters
    get email(): string { return this._email; }
    set email(value: string) {
        if (!value || value.trim() === '') {
        throw new Error('El email no puede estar vacío');
        }
        this._email = value;
    }
    
    get password(): string { return this._password; }
    set password(value: string) {
        if (!value || value.trim() === '') {
        throw new Error('La contraseña no puede estar vacía');
        }
        this._password = value;
    }
    

    get activo(): boolean { return this._activo; }
    set activo(value: boolean) { this._activo = value; }
    
    get ultimoAcceso(): Date { return this._ultimoAcceso; }
    set ultimoAcceso(value: Date) { this._ultimoAcceso = value; }
    
    get persona(): Persona | undefined { return this._persona; }
    set persona(value: Persona | undefined) { this._persona = value; }
    
    // Sobrescribimos el método info de la clase Base (polimorfismo)
    override get info(): string {
        return `Email: ${this.email}, Activo: ${this.activo}, Último Acceso: ${this.ultimoAcceso}`;
    }
    
    // Método para convertir entre entidad y modelo
    static fromEntity(entity: UsuarioEntity): Usuario {
        return new Usuario({
        id: entity.id,
        email: entity.email,
        password: entity.password,
        activo: entity.activo,
        ultimoAcceso: entity.ultimoAcceso,
        persona: Persona.fromEntity(entity.persona),
        });
    }
    
    toEntity(): Partial<UsuarioEntity> {
        return {
        id: this.id,
        email: this.email,
        password: this.password,
        activo: this.activo,
        ultimoAcceso: this.ultimoAcceso,
        };
    }
}

/*
// usuario.entity.ts
import { Column, Entity, OneToOne, JoinColumn, OneToMany } from "typeorm";
import { BaseEntity } from "./base-entity";
import type { PersonaEntity } from "./persona.entity";

@Entity({ name: "usuario" })
export class UsuarioEntity extends BaseEntity {
  @Column({ name: "email" })
  email: string;

  @Column({ name: "password" })
  password: string;

  @Column({ name: "activo", type: "tinyint" })
  activo: boolean;

  @Column({ name: "ultimo_acceso", type: "datetime" })
  ultimoAcceso: Date;

  @OneToOne("PersonaEntity")
  @JoinColumn({ name: "persona_id" })
  persona: PersonaEntity;
}
*/