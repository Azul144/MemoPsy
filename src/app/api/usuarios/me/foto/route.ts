// src/app/api/usuarios/me/foto/route.ts
// RF 1.3 - Foto de perfil de la cuenta propia. Cada usuario ve, cambia o quita solo la suya.
//  GET:    devuelve la foto descifrada (404 si no tiene: el sistema muestra las iniciales).
//  PUT:    guarda una foto nueva (formulario con "archivo"). El navegador ya la recortó y achicó.
//  DELETE: quita la foto.
// La foto se guarda cifrada en la base; no queda ningún archivo en el servidor.
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { authConfig } from "@/lib/auth/auth-config"
import { cifrarBytes, descifrarBytes } from "@/lib/auth/cifrado"
import { initializeDatabase } from "@/lib/database"
import { PersonaEntity, UsuarioEntity } from "@/entities"
import { tipoDeImagen } from "@/lib/informes/imagenes"

// La foto llega ya achicada (unos 256 px): 1 MB alcanza de sobra
const MAX_BYTES_FOTO = 1024 * 1024

async function personaDeLaSesion() {
  const session = await getServerSession(authConfig)
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  const dataSource = await initializeDatabase()
  const usuario = await dataSource
    .getRepository(UsuarioEntity)
    .findOne({ where: { id: session.user.id }, relations: ["persona"] })
  if (!usuario?.persona) return { error: NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 }) }
  return { dataSource, personaId: usuario.persona.id }
}

export async function GET() {
  try {
    const r = await personaDeLaSesion()
    if (r.error) return r.error
    const persona = await r.dataSource
      .getRepository(PersonaEntity)
      .createQueryBuilder("p")
      .addSelect("p.foto")
      .where("p.id = :id", { id: r.personaId })
      .getOne()
    if (!persona?.foto) return NextResponse.json({ error: "Sin foto" }, { status: 404 })

    const bytes = descifrarBytes(persona.foto)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": tipoDeImagen(bytes) ?? "image/jpeg",
        // Dato personal: que no quede en cachés compartidas
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Error al leer la foto de perfil:", error)
    return NextResponse.json({ error: "No se pudo leer la foto" }, { status: 500 })
  }
}

async function manejarPUT(request: NextRequest) {
  try {
    const r = await personaDeLaSesion()
    if (r.error) return r.error

    let formulario: FormData
    try {
      formulario = await request.formData()
    } catch {
      return NextResponse.json({ error: "No se recibió la foto." }, { status: 400 })
    }
    const archivo = formulario.get("archivo")
    if (!(archivo instanceof Blob) || archivo.size === 0) {
      return NextResponse.json({ error: "No se recibió la foto." }, { status: 400 })
    }
    if (archivo.size > MAX_BYTES_FOTO) {
      return NextResponse.json({ error: "La foto es demasiado grande." }, { status: 400 })
    }
    const datos = Buffer.from(await archivo.arrayBuffer())
    if (!tipoDeImagen(datos)) {
      return NextResponse.json({ error: "El archivo no es una imagen JPG o PNG." }, { status: 400 })
    }

    const fotoActualizada = new Date()
    await r.dataSource.getRepository(PersonaEntity).update(r.personaId, { foto: cifrarBytes(datos), fotoActualizada })
    return NextResponse.json({ fotoActualizada: fotoActualizada.toISOString() })
  } catch (error) {
    console.error("Error al guardar la foto de perfil:", error)
    return NextResponse.json({ error: "No se pudo guardar la foto." }, { status: 500 })
  }
}

async function manejarDELETE() {
  try {
    const r = await personaDeLaSesion()
    if (r.error) return r.error
    await r.dataSource.getRepository(PersonaEntity).update(r.personaId, { foto: null, fotoActualizada: null })
    return NextResponse.json({ fotoActualizada: null })
  } catch (error) {
    console.error("Error al quitar la foto de perfil:", error)
    return NextResponse.json({ error: "No se pudo quitar la foto." }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "EDITAR", detalle: "Cambio de la foto de perfil propia" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Usuarios", accion: "EDITAR", detalle: "Baja de la foto de perfil propia" })
