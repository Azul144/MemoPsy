// src/lib/informes/imagenes.ts
// Imágenes adjuntas a la nota clínica: validación del archivo, forma en que se envían al navegador
// y lectura (ya descifradas) para armar los PDF.
//  - El psicólogo autor de la nota las sube, las ve todas y decide cuáles compartir.
//  - El paciente de la nota ve solo las compartidas, dentro de su informe de seguimiento.
import type { DataSource } from "typeorm"
import { InformeImagenEntity } from "@/entities"
import { descifrarBytes } from "@/lib/auth/cifrado"

export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024
export const MAX_IMAGENES_POR_NOTA = 20

export type TipoImagen = "image/jpeg" | "image/png"

// Se mira el contenido real del archivo (no la extensión ni lo que dice el navegador).
// Solo JPG y PNG: son los formatos que se pueden incluir en el PDF.
export function tipoDeImagen(datos: Buffer): TipoImagen | null {
  if (datos.length > 3 && datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) return "image/jpeg"
  if (datos.length > 8 && datos.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png"
  }
  return null
}

export function imagenParaEnviar(imagen: InformeImagenEntity, informeId: string | number) {
  return {
    id: String(imagen.id),
    nombre: imagen.nombre,
    descripcion: imagen.descripcion,
    compartida: !!imagen.compartida,
    fechaCreacion: new Date(imagen.fechaCreacion).toISOString(),
    url: `/api/informes/${informeId}/imagenes/${imagen.id}`,
  }
}

export type ImagenEnviada = ReturnType<typeof imagenParaEnviar>

export async function listarImagenes(db: DataSource, informeId: string | number, soloCompartidas: boolean) {
  return db.getRepository(InformeImagenEntity).find({
    where: { informe: { id: String(informeId) }, ...(soloCompartidas ? { compartida: true } : {}) },
    order: { orden: "ASC", id: "ASC" },
  })
}

export interface ImagenParaPdf {
  nombre: string
  descripcion: string | null
  tipoMime: TipoImagen
  bytes: Uint8Array
}

// Para los PDF: las imágenes con su contenido ya descifrado
export async function imagenesParaPdf(db: DataSource, informeId: string | number, soloCompartidas: boolean): Promise<ImagenParaPdf[]> {
  const consulta = db
    .getRepository(InformeImagenEntity)
    .createQueryBuilder("img")
    .addSelect("img.datos")
    .where("img.id_informe = :informeId", { informeId })
  if (soloCompartidas) consulta.andWhere("img.compartida = 1")
  const imagenes = await consulta.orderBy("img.orden", "ASC").addOrderBy("img.id", "ASC").getMany()

  const resultado: ImagenParaPdf[] = []
  for (const imagen of imagenes) {
    try {
      const bytes = descifrarBytes(imagen.datos)
      const tipo = tipoDeImagen(bytes)
      if (tipo) resultado.push({ nombre: imagen.nombre, descripcion: imagen.descripcion, tipoMime: tipo, bytes })
    } catch (error) {
      console.error(`No se pudo leer la imagen ${imagen.id} de la nota ${informeId}:`, error)
    }
  }
  return resultado
}
