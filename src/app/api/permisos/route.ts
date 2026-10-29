// src/app/api/permisos/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { Permiso } from "@/models/permiso.model"

// GET /api/permisos - Obtener lista de permisos disponibles
export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Registrar Perfil") && !userPermissions.includes("Editar Perfil")) {
      return NextResponse.json({ message: "No tenés permiso para ver permisos" }, { status: 403 })
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Obtener todos los permisos con sus relaciones
    const permisosEntities = await dataSource
      .getRepository("PermisoEntity")
      .createQueryBuilder("permiso")
      .leftJoinAndSelect("permiso.modulo", "modulo")
      .leftJoinAndSelect("permiso.accion", "accion")
      .getMany()

    // Convertir a modelos y formatear para la respuesta
    const permisosFormateados = permisosEntities
      .map((permisoEntity: any) => {
        try {
          const permiso = Permiso.fromEntity(permisoEntity)
          return {
            id: permiso.id,
            nombre: permiso.nombre,
            descripcion: permiso.descripcion,
            modulo: permiso.modulo?.nombre || "General",
          }
        } catch (validationError) {
          console.error("Error al crear permiso desde entidad:", validationError)
          return null
        }
      })
      .filter(Boolean) // Filtrar los nulos en caso de error

    return NextResponse.json(permisosFormateados)
  } catch (error) {
    console.error("Error en GET /api/permisos:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

