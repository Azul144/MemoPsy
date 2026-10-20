// domicilio.model.ts
import { Ciudad } from './ciudad.model';
import { Persona } from './persona.model';
import { Base } from './base-model';
import { DomicilioEntity } from '../entities/domicilio.entity';

export class Domicilio extends Base {
  private _numero: string;
  private _codigoPostal: string;
  private _calle: string;
  private _persona?: Persona;
  private _ciudad?: Ciudad;

  constructor(data: {
    id?: string;
    numero: string;
    codigoPostal: string;
    calle: string;
    persona?: Persona;
    ciudad?: Ciudad;
  }) {
    super({ id: data.id });
    this._numero = data.numero; // Usa el setter para validación
    this._codigoPostal = data.codigoPostal; // Usa el setter para validación
    this._calle = data.calle; // Usa el setter para validación
    this._persona = data.persona;
    this._ciudad = data.ciudad;
  }

  // Getters y Setters
  get numero(): string { return this._numero; }
  set numero(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('El número no puede estar vacío');
    }
    this._numero = value;
  }

  get codigoPostal(): string { return this._codigoPostal; }
  set codigoPostal(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('El código postal no puede estar vacío');
    }
    this._codigoPostal = value;
  }

  get calle(): string { return this._calle; }
  set calle(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('La calle no puede estar vacía');
    }
    this._calle = value;
  }

  get persona(): Persona | undefined { return this._persona; }
  set persona(value: Persona | undefined) {
    this._persona = value;
  }

  get ciudad(): Ciudad | undefined { return this._ciudad; }
  set ciudad(value: Ciudad | undefined) {
    this._ciudad = value;
  }

  // Sobrescribimos el método info de la clase Base (polimorfismo)
  override get info(): string {
      return `Número: ${this.numero}, Código Postal: ${this.codigoPostal}, Calle: ${this.calle}, Persona: ${this.persona ? this.persona.info : 'No asignada'}, Ciudad: ${this.ciudad ? this.ciudad.info : 'No asignada'}`;
  }
    // Método para convertir entre entidad y modelo

    // Método para convertir entre entidad y modelo
    static fromEntity(entity: DomicilioEntity): Domicilio {
      return new Domicilio({
        id: entity.id,
        numero: entity.numero,
        codigoPostal: entity.codigoPostal,
        calle: entity.calle,
        persona: entity.persona ? Persona.fromEntity(entity.persona) : undefined,
        ciudad: entity.ciudad ? Ciudad.fromEntity(entity.ciudad) : undefined
      });
    }
    
    toEntity(): Partial<DomicilioEntity> {
      return {
        id: this.id,
        numero: this.numero,
        codigoPostal: this.codigoPostal,
        calle: this.calle
        // No incluimos relaciones aquí
      };
    }   
}

/*
// domicilio.entity.ts
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { PersonaEntity } from "./persona.entity";
import { CiudadEntity } from "./ciudad.entity";

@Entity({ name: "domicilio" })
export class DomicilioEntity extends BaseEntity {
  //@Column({ name: "persona_id" })
  //personaId: string;

  @Column({ name: "numero" })
  numero: string;

  @Column({ name: "codigo_postal" })
  codigoPostal: string;

  @Column({ name: "calle" })
  calle: string;

  //@Column({ name: "ciudad_id" })
  //ciudadId: string;

  @ManyToOne(() => PersonaEntity)
  @JoinColumn({ name: "persona_id" })
  persona: PersonaEntity;

  @ManyToOne(() => CiudadEntity)
  @JoinColumn({ name: "ciudad_id" })
  ciudad: CiudadEntity;
}
*/