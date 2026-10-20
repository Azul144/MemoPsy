// ciudad.model.ts - Modelo de dominio
import { Pais } from './pais.model';
import { Base } from './base-model';
import { CiudadEntity } from '../entities/ciudad.entity';

export class Ciudad extends Base {
    private _nombre: string;
    private _pais?: Pais;
    
    constructor(data: {
      id?: string;
      nombre: string;
      pais?: Pais;
    }) {
      super({ id: data.id });
      this._nombre = data.nombre; // Usa el setter para validación
      this._pais = data.pais
    }
    // Getters y Setters
    
    get nombre(): string { return this._nombre; }
    set nombre(value: string) {
      if (!value || value.trim() === '') {
        throw new Error('El nombre no puede estar vacío');
      }
      this._nombre = value;
    }

    get pais(): Pais | undefined { return this._pais; }
    set pais(value: Pais | undefined) {
      this._pais = value;
    }

    // Sobrescribimos el método info de la clase Base (polimorfismo)
    override get info(): string {
        return `Nombre: ${this.nombre}, Pais: ${this.pais ? this.pais.info : 'No asignado'}`;
    }

    // Método para convertir entre entidad y modelo
    static fromEntity(entity: CiudadEntity): Ciudad {
      return new Ciudad({
        id: entity.id,
        nombre: entity.nombre,
        pais: entity.pais ? Pais.fromEntity(entity.pais) : undefined
      });
    }
    
    toEntity(): Partial<CiudadEntity> {
      return {
        id: this.id,
        nombre: this.nombre
        // No incluimos relaciones aquí
      };
    }    
}