// paciente.model.ts
import { Base } from './base-model';
import { Persona } from './persona.model';
import { ObraSocial } from './obra-social.model';
import { PacienteEntity } from '../entities/paciente.entity';

export class Paciente extends Base {
    private _persona: Persona;
    private _obraSocial: ObraSocial;
    
    constructor(data: {
        id?: string;
        persona: Persona;
        obraSocial: ObraSocial;
    }) {
        super({ id: data.id });
        this._persona = data.persona;
        this._obraSocial = data.obraSocial;
    }
    
    get persona(): Persona { return this._persona; }
    set persona(value: Persona) {
        if (!value) {
            throw new Error('La persona no puede ser nula');
        }
        this._persona = value;
    }
    get obraSocial(): ObraSocial { return this._obraSocial; }
    set obraSocial(value: ObraSocial) {
        if (!value) {
            throw new Error('La obra social no puede ser nula');
        }
        this._obraSocial = value;
    }

    // Sobrescribimos el método info de la clase Base (polimorfismo)
    override get info(): string {
        return `Paciente: ${this._persona.nombre} ${this._persona.apellido}, Obra Social: ${this._obraSocial.nombre}`;
    }
    
    // Método para convertir de entidad a modelo
    static fromEntity(entity: PacienteEntity): Paciente {
        return new Paciente({
        id: entity.id,
        persona: Persona.fromEntity(entity.persona),
        obraSocial: ObraSocial.fromEntity(entity.obraSocial),
        });
    }
    // Método para convertir de modelo a entidad
    toEntity(): Partial<PacienteEntity> {
        return {
            id: this.id,
            // No incluimos relaciones aquí
        };
    }

}