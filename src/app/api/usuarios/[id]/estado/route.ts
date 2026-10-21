import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getRepository } from "@/lib/database"
import { UsuarioEntity } from "@/entities"

async function manejarPATCH(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const { id } = params
    const body = await request.json()
    const { activo } = body

    if (typeof activo !== "boolean") {
      return NextResponse.json({ message: "El campo 'activo' debe ser un booleano" }, { status: 400 })
    }

    const usuarioRepo = await getRepository(UsuarioEntity)

    // Verificar que el usuario existe
    const usuario = await usuarioRepo.findOne({
      where: { id },
      relations: { persona: true },
    })

    if (!usuario) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    // Actualizar el estado
    await usuarioRepo.update(id, { activo })

    // Obtener el usuario actualizado
    const usuarioActualizado = await usuarioRepo.findOne({
      where: { id },
      relations: { persona: true },
    })

    return NextResponse.json({
      message: `Usuario ${activo ? "activado" : "desactivado"} correctamente`,
      usuario: {
        id: usuarioActualizado?.id,
        email: usuarioActualizado?.email,
        activo: usuarioActualizado?.activo,
        persona: usuarioActualizado?.persona
          ? {
              nombre: usuarioActualizado.persona.nombre,
              apellido: usuarioActualizado.persona.apellido,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Error al cambiar estado del usuario:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PATCH = conAuditoria(manejarPATCH, { modulo: "Usuarios", accion: "CAMBIAR_ESTADO", detalle: "Activación o desactivación de la cuenta" })
