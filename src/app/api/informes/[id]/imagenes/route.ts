// src/app/api/informes/[id]/imagenes/route.ts
// Imágenes de una nota clínica.
//  GET:  el psicólogo autor ve todas; el paciente de la nota, solo las compartidas.
//  POST: el psicólogo autor sube una imagen (formulario con "archivo", "descripcion" y "compartida").
// El archivo se guarda cifrado en la base; no queda nada en el disco del servidor.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { cifrarBytes } from "@/lib/auth/cifrado"
import { initializeDatabase } from "@/lib/database"
import { InformeImagenEntity } from "@/entities"
import { accesoAlInforme } from "@/lib/informes/seguimiento"
import {
  MAX_BYTES_IMAGEN,
  MAX_IMAGENES_POR_NOTA,
  imagenParaEnviar,
  listarImagenes,
  tipoDeImagen,
} from "@/lib/informes/imagenes"

type Contexto = { params: Promise<{ id: string }> }

async function manejarGET(_request: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const acceso = await accesoAlInforme(dataSource, id, session.user)
    if (!acceso) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 })
    }
    if (!acceso.esAutor && !acceso.esPaciente) {
      return NextResponse.json({ error: "No tenés acceso a estas imágenes" }, { status: 403 })
    }

    const imagenes = await listarImagenes(dataSource, id, !acceso.esAutor)
    return NextResponse.json({ imagenes: imagenes.map((img) => imagenParaEnviar(img, id)) })
  } catch (error) {
    console.error("Error al listar las imágenes de la nota:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function manejarPOST(request: NextRequest, { params }: Contexto) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dataSource = await initializeDatabase()
    const acceso = await accesoAlInforme(dataSource, id, session.user)
    if (!acceso) {
      return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 })
    }
    if (!acceso.esAutor) {
      return NextResponse.json({ error: "Solo el psicólogo autor puede agregar imágenes a la nota." }, { status: 403 })
    }

    let formulario: FormData
    try {
      formulario = await request.formData()
    } catch {
      return NextResponse.json({ error: "No se recibió la imagen." }, { status: 400 })
    }
    const archivo = formulario.get("archivo")
    if (!(archivo instanceof Blob) || archivo.size === 0) {
      return NextResponse.json({ error: "No se recibió la imagen." }, { status: 400 })
    }
    if (archivo.size > MAX_BYTES_IMAGEN) {
      return NextResponse.json({ error: "La imagen supera los 5 MB." }, { status: 400 })
    }

    const datos = Buffer.from(await archivo.arrayBuffer())
    const tipo = tipoDeImagen(datos)
    if (!tipo) {
      return NextResponse.json({ error: "El archivo no es una imagen JPG o PNG." }, { status: 400 })
    }

    const repositorio = dataSource.getRepository(InformeImagenEntity)
    const cantidad = await repositorio.count({ where: { informe: { id: String(id) } } })
    if (cantidad >= MAX_IMAGENES_POR_NOTA) {
      return NextResponse.json({ error: `Cada nota admite hasta ${MAX_IMAGENES_POR_NOTA} imágenes.` }, { status: 400 })
    }

    const nombreRecibido = typeof (archivo as File).name === "string" ? (archivo as File).name : ""
    const nombre = (nombreRecibido.trim() || `imagen-${cantidad + 1}`).slice(0, 255)
    const descripcion = String(formulario.get("descripcion") ?? "").trim().slice(0, 2000) || null
    const compartida = formulario.get("compartida") === "true"

    const guardada = await repositorio.save(
      repositorio.create({
        informe: acceso.informe,
        nombre,
        tipoMime: tipo,
        descripcion,
        datos: cifrarBytes(datos),
        compartida,
        orden: cantidad,
      }),
    )

    return NextResponse.json({ imagen: imagenParaEnviar(guardada, id) }, { status: 201 })
  } catch (error) {
    console.error("Error al subir la imagen de la nota:", error)
    return NextResponse.json({ error: "No se pudo guardar la imagen." }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const GET = conAuditoria(manejarGET, { modulo: "Informes", accion: "VER", detalle: "Consulta de las imágenes de una nota" })
export const POST = conAuditoria(manejarPOST, { modulo: "Informes", accion: "CREAR", detalle: "Alta de imagen en una nota clínica" })
