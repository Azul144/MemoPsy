import { Persona } from './persona.model';
import { Base } from './base-model';
import { PsicologoEntity } from '../entities/psicologo.entity';

// psicologo.model.ts - Modelo de dominio
export class Psicologo extends Base {
    private _especialidad: string;
    private _numeroLicencia: string;
    private _persona?: Persona;
    
    constructor(data: {
      id?: string;
      especialidad: string;
      numeroLicencia: string;
      persona?: Persona;
    }) {
      //this._id = data.id || '';
      super({ id: data.id });
      this._especialidad = data.especialidad; // Usa el setter para validación
      this._numeroLicencia = data.numeroLicencia; // Usa el setter para validación
      this._persona = data.persona;
    }
    // Getters y Setters
    
    get especialidad(): string { return this._especialidad; }
    set especialidad(value: string) {
      if (!value || value.trim() === '') {
        throw new Error('La especialidad no puede estar vacía');
      }
      this._especialidad = value;
    }
    
    get numeroLicencia(): string { return this._numeroLicencia; }
    set numeroLicencia(value: string) {
      if (!value || value.trim() === '') {
        throw new Error('El número de licencia no puede estar vacío');
      }
      this._numeroLicencia = value;
    }
    
    get persona(): Persona | undefined { return this._persona; }
    set persona(value: Persona | undefined) {
      if (value && !(value instanceof Persona)) {
        throw new Error('El valor debe ser una instancia de Persona');
      }
      this._persona = value;
    }

    // Sobrescribimos el método info de la clase Base (polimorfismo)
    override get info(): string {
      return `Psicólogo: ${this._especialidad}, Licencia: ${this._numeroLicencia}`;
    }
    
    public obtenerNombreCompleto(): string {
      if (this._persona) {
        return `${this._persona.nombre} ${this._persona.apellido}`;
      }
      return 'Nombre no disponible';
    }

    // Método para convertir entre entidad y modelo
    static fromEntity(entity: PsicologoEntity): Psicologo {
      return new Psicologo({
        id: entity.id,
        especialidad: entity.especialidad,
        numeroLicencia: entity.numeroLicencia,
        persona: Persona.fromEntity(entity.persona)
      });
    }
    
    toEntity(): Partial<PsicologoEntity> {
      return {
        id: this.id,
        especialidad: this._especialidad,
        numeroLicencia: this._numeroLicencia
        // No incluimos relaciones aquí
      };
    }
  }