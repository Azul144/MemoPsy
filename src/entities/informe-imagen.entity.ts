// informe-imagen.entity.ts
// Imagen adjunta a una nota clínica (dibujos de técnicas proyectivas, fotos de producciones del
// paciente, material de apoyo). El contenido y la descripción se guardan cifrados.
// Privada del psicólogo salvo que la marque "compartida": entonces el paciente la ve en su informe de seguimiento.
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "./base-entity";
import { InformeEntity } from "./informe.entity";
import { columnaCifrada } from "../lib/auth/columna-cifrada";

@Entity({ name: "informe_imagen" })
export class InformeImagenEntity extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "int", name: "id_informe_imagen" })
  id: string;

  @ManyToOne(() => InformeEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "id_informe" })
  informe: InformeEntity;

  @Column({ name: "nombre", type: "varchar", length: 255 })
  nombre: string;

  @Column({ name: "tipo_mime", type: "varchar", length: 50 })
  tipoMime: string;

  @Column({ name: "descripcion", type: "text", nullable: true, transformer: columnaCifrada })
  descripcion: string | null;

  // Cifrado con cifrarBytes(); no se carga en los listados (select: false)
  @Column({ name: "datos", type: "longblob", select: false })
  datos: Buffer;

  @Column({ name: "compartida", type: "tinyint", default: 0 })
  compartida: boolean;

  @Column({ name: "orden", type: "int", default: 0 })
  orden: number;

  @Column({ name: "fecha_creacion", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  fechaCreacion: Date;
}
