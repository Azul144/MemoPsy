// detalle-factura.model.ts - Modelo de dominio
import { Base } from './base-model';
import { Sesion } from './sesion.model';
import { Factura } from './factura.model';
import { DetalleFacturaEntity } from '../entities/detalle-factura.entity';

export class DetalleFactura extends Base {
    private _precio: number;
    private _sesion?: Sesion;
    private _factura?: Factura;

    constructor(data: {
      id?: string;
      precio: number;
      sesion?: Sesion;
      factura?: Factura;
    }) {
      super({ id: data.id });
      this._precio = data.precio
      this._sesion = data.sesion;
      this._factura = data.factura;
    }
    // Getters y Setters
    get precio(): number { return this._precio; }
    set precio(value: number) {
      if (value <= 0) {
        throw new Error('El precio debe ser mayor que cero');
      }
      this._precio = value;
    }

    get sesion(): Sesion | undefined { return this._sesion; }
    set sesion(value: Sesion | undefined) {
      this._sesion = value;
    }

    get factura(): Factura | undefined { return this._factura; }
    set factura(value: Factura | undefined) {
      this._factura = value;
    }

    // Sobrescribimos el método info de la clase Base (polimorfismo)
    override get info(): string {
      return `Precio: ${this.precio}, Sesion: ${this.sesion ? this.sesion.info : 'No asignado'}`;
    }

    // Método para convertir entre entidad y modelo
    static fromEntity(entity: DetalleFacturaEntity): DetalleFactura {
      return new DetalleFactura({
        id: entity.id,
        precio: entity.precio,
        sesion: entity.sesion ? Sesion.fromEntity(entity.sesion) : undefined,
        factura: entity.factura ? Factura.fromEntity(entity.factura) : undefined // Asignamos la relación
      });
    }
    
    toEntity(): Partial<DetalleFacturaEntity> {
      return {
        id: this.id,
        precio: this.precio
        // No incluimos relaciones aquí
      };
    }    
}

/*
// detalle-factura.entity
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { SesionEntity } from "./sesion.entity";
import { FacturaEntity } from "./factura.entity";

@Entity({ name: "detalle_factura" })
export class DetalleFacturaEntity extends BaseEntity {
  @Column({ name: "precio", type: "decimal", precision: 10, scale: 2 })
  precio: number;

  //@Column({ name: "sesion_id" })
  //sesionId: string;

  //@Column({ name: "factura_id" })
  //facturaId: string;

  @ManyToOne(() => SesionEntity)
  @JoinColumn({ name: "sesion_id" })
  sesion: SesionEntity;

  @ManyToOne(() => FacturaEntity)
  @JoinColumn({ name: "factura_id" })
  factura: FacturaEntity;
}
*/