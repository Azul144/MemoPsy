// src/app/api/informes/[id]/imagenes/[imagenId]/route.ts
// Una imagen de la nota clínica.
//  GET:    devuelve la imagen descifrada (autor; o paciente de la nota si está compartida).
//  PATCH:  el autor cambia la descripción o si se comparte con el paciente.
//  DELETE: el autor la borra.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { descifrarBytes } from "@/lib/auth/cifrado"
import { initializeDatabase } from "@/lib/database"
import { InformeImagenEntity } from "@/entities"
import { accesoAlInforme } from "@/lib/informes/seguimiento"
import { imagenParaEnviar } from "@/lib/informes/imagenes"

type Contexto = { params: Promise<{ id: string; imagenId: string }> }

async function cargar(id: string, imagenId: string, conDatos = false) {
  const session = await getServerSession(authConfig)
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const dataSource = await initializeDatabase()
  const acceso = await accesoAlInforme(dataSource, id, session.user)
  const consulta = dataSource
    .getRepository(InformeImagenEntity)
    .createQueryBuilder("img")
    .where("img.id = :imagenId AND img.id_informe = :id", { imagenId, id })
  if (conDatos) consulta.addSelect("img.datos")
  const imagen = acceso ? await consulta.getOne() : null
  if (!acceso || !imagen) {
    return { error: NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 }) }
  }
  return { dataSource, acceso, imagen }
}

async function manejarGET(_request: NextRequest, { params }: Contexto) {
  try {
    const { id, imagenId } = await params
    const r = await cargar(id, imagenId, true)
    if (r.error) return r.error
    const { acceso, imagen } = r
    const puedeVer = acceso.esAutor || (acceso.esPaciente && imagen.compartida)
    if (!puedeVer) {
      return NextResponse.json({ error: "No tenés acceso a esta imagen" }, { status: 403 })
    }

    return new NextResponse(new Uint8Array(descifrarBytes(imagen.datos)), {
      headers: {
        "Content-Type": imagen.tipoMime,
        "Content-Disposition": `inline; filename="${encodeURIComponent(imagen.nombre)}"`,
        // Dato sensible: que no quede guardado en cachés intermedias
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Error al leer la imagen de la nota:", error)
    return NextResponse.json({ error: "No se pudo leer la imagen" }, { status: 500 })
  }
}

const cambiosSchema = z.object({
  descripcion: z.string().trim().max(2000, "Máximo 2000 caracteres.").nullish(),
  compartida: z.boolean().optional(),
})

async function manejarPATCH(request: NextRequest, { params }: Contexto) {
  try {
    const { id, imagenId } = await params
    const r = await cargar(id, imagenId)
    if (r.error) return r.error
    const { dataSource, acceso, imagen } = r
    if (!acceso.esAutor) {
      return NextResponse.json({ error: "Solo el psicólogo autor puede modificar la imagen." }, { status: 403 })
    }

    const validacion = cambiosSchema.safeParse(await request.json().catch(() => null))
    if (!validacion.success) {
      return NextResponse.json({ error: validacion.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
    }
    const { descripcion, compartida } = validacion.data
    if (descripcion !== undefined) imagen.descripcion = descripcion || null
    if (compartida !== undefined) imagen.compartida = compartida
    await dataSource.getRepository(InformeImagenEntity).update(imagen.id, {
      descripcion: imagen.descripcion,
      compartida: imagen.compartida,
    })

    return NextResponse.json({ imagen: imagenParaEnviar(imagen, id) })
  } catch (error) {
    console.error("Error al modificar la imagen de la nota:", error)
    return NextResponse.json({ error: "No se pudo guardar el cambio" }, { status: 500 })
  }
}

async function manejarDELETE(_request: NextRequest, { params }: Contexto) {
  try {
    const { id, imagenId } = await params
    const r = await cargar(id, imagenId)
    if (r.error) return r.error
    const { dataSource, acceso, imagen } = r
    if (!acceso.esAutor) {
      return NextResponse.json({ error: "Solo el psicólogo autor puede borrar la imagen." }, { status: 403 })
    }
    await dataSource.getRepository(InformeImagenEntity).delete(imagen.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error al borrar la imagen de la nota:", error)
    return NextResponse.json({ error: "No se pudo borrar la imagen" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría. La lectura de cada imagen no se registra una por una:
// ya queda registrada la consulta de la nota y del listado de imágenes.
export const GET = manejarGET
export const PATCH = conAuditoria(manejarPATCH, {
  modulo: "Informes",
  accion: "EDITAR",
  detalle: (d) => (d?.imagen?.compartida ? "Imagen de la nota compartida con el paciente" : "Edición de imagen de una nota clínica"),
})
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Informes", accion: "ELIMINAR", detalle: "Baja de imagen de una nota clínica" })
