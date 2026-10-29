// src/app/api/perfiles/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { PerfilEntity } from "@/entities"
import { getServerSession } from "next-auth"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { Perfil } from "@/models/perfil.model"

// GET /api/perfiles/[id] - Obtener perfil específico
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  await paramsPromise;
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Ver Perfiles")) {
      return NextResponse.json({ message: "No tenés permiso para ver perfiles" }, { status: 403 })
    }

    // const perfilId = params.id; // Old way
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const perfilId = segments[segments.length - 1];

    if (!perfilId || perfilId === '[id]') {
      console.error(`Error extracting perfilId from GET pathname: ${pathname}. Extracted: ${perfilId}`);
      return NextResponse.json({ message: "Error crítico: No se pudo extraer el ID del perfil de la URL." }, { status: 500 });
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Buscar el perfil
    const perfilEntity = await dataSource.getRepository(PerfilEntity).findOne({
      where: { id: perfilId },
    })

    if (!perfilEntity) {
      return NextResponse.json({ message: "Perfil no encontrado" }, { status: 404 })
    }

    const perfil = Perfil.fromEntity(perfilEntity)

    // Obtener permisos del perfil
    const perfilTienePermisosEntities = await dataSource
      .getRepository("PerfilTienePermisoEntity")
      .createQueryBuilder("ptp")
      .leftJoinAndSelect("ptp.permiso", "permiso")
      .leftJoinAndSelect("permiso.modulo", "modulo")
      .where("ptp.perfilId = :perfilId", { perfilId: perfil.id })
      .getMany()

    const permisos = perfilTienePermisosEntities.map((ptp: any) => ({
      id: ptp.permiso.id,
      nombre: ptp.permiso.nombre,
      descripcion: ptp.permiso.descripcion,
      modulo: ptp.permiso.modulo?.nombre || "General",
    }))

    // Contar usuarios asignados
    const usuariosCount = await dataSource.getRepository("UsuarioTienePerfilEntity").count({
      where: { perfilId: perfil.id },
    })

    const perfilCompleto = {
      id: perfil.id,
      nombre: perfil.nombre,
      descripcion: perfil.descripcion,
      permisos,
      usuariosCount,
    }

    return NextResponse.json(perfilCompleto)
  } catch (error) {
    console.error("Error en GET /api/perfiles/[id]:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/perfiles/[id] - Eliminar perfil
async function manejarDELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  await paramsPromise;
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Eliminar Perfil")) {
      return NextResponse.json({ message: "No tenés permiso para eliminar perfiles" }, { status: 403 })
    }

    // const perfilId = params.id; // Old way
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const perfilId = segments[segments.length - 1];

    if (!perfilId || perfilId === '[id]') {
      console.error(`Error extracting perfilId from DELETE pathname: ${pathname}. Extracted: ${perfilId}`);
      return NextResponse.json({ message: "Error crítico: No se pudo extraer el ID del perfil de la URL." }, { status: 500 });
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Verificar que el perfil existe
    const perfilEntity = await dataSource.getRepository(PerfilEntity).findOne({
      where: { id: perfilId },
    })

    if (!perfilEntity) {
      return NextResponse.json({ message: "Perfil no encontrado" }, { status: 404 })
    }

    // Verificar que no hay usuarios asignados a este perfil
    const usuariosCount = await dataSource.getRepository("UsuarioTienePerfilEntity").count({
      where: { perfilId: perfilId },
    })

    if (usuariosCount > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar el perfil porque tiene ${usuariosCount} usuario(s) asignado(s). Primero debe reasignar o eliminar estos usuarios.`,
        },
        { status: 400 },
      )
    }

    // Eliminar primero las relaciones de permisos
    await dataSource.getRepository("PerfilTienePermisoEntity").delete({ perfilId: perfilId })

    // Eliminar el perfil
    await dataSource.getRepository(PerfilEntity).delete({ id: perfilId })

    return NextResponse.json({ message: "Perfil eliminado exitosamente" }, { status: 200 })
  } catch (error) {
    console.error("Error en DELETE /api/perfiles/[id]:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT /api/perfiles/[id] - Actualizar perfil
async function manejarPUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  await paramsPromise;
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Editar Perfil")) {
      return NextResponse.json({ message: "No tenés permiso para editar perfiles" }, { status: 403 })
    }

    // const perfilId = params.id; // Old way
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const perfilId = segments[segments.length - 1];

    if (!perfilId || perfilId === '[id]') {
      console.error(`Error extracting perfilId from PUT pathname: ${pathname}. Extracted: ${perfilId}`);
      return NextResponse.json({ message: "Error crítico: No se pudo extraer el ID del perfil de la URL." }, { status: 500 });
    }

    const body = await request.json()
    const { nombre, descripcion, permisos } = body

    // Validaciones
    const errors: any = {}

    if (!nombre || nombre.trim().length < 3) {
      errors.nombre = "El nombre debe tener al menos 3 caracteres"
    }

    if (!descripcion || descripcion.trim().length < 10) {
      errors.descripcion = "La descripción debe tener al menos 10 caracteres"
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: "Datos de entrada inválidos", errors }, { status: 400 })
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Verificar que el perfil existe
    const perfilExistente = await dataSource.getRepository(PerfilEntity).findOne({
      where: { id: perfilId },
    })

    if (!perfilExistente) {
      return NextResponse.json({ message: "Perfil no encontrado" }, { status: 404 })
    }

    // Verificar que el nombre no esté en uso por otro perfil
    const perfilConMismoNombre = await dataSource.getRepository(PerfilEntity).findOne({
      where: { nombre: nombre.trim() },
    })

    if (perfilConMismoNombre && String(perfilConMismoNombre.id) !== String(perfilId)) { // Adjusted comparison
      return NextResponse.json(
        {
          message: "El nombre del perfil ya existe",
          errors: { nombre: "Este nombre de perfil ya está en uso por otro perfil" },
        },
        { status: 409 },
      )
    }

    try {
      // Validar datos con el modelo
      const perfilActualizado = new Perfil({
        id: perfilId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      })

      // Actualizar el perfil
      await dataSource.getRepository(PerfilEntity).update(perfilId, {
        nombre: perfilActualizado.nombre,
        descripcion: perfilActualizado.descripcion,
      })

      // Si se proporcionaron permisos, actualizar las asignaciones
      let permisosActualizados = 0
      if (permisos && Array.isArray(permisos)) {
        // Eliminar permisos actuales
        await dataSource.getRepository("PerfilTienePermisoEntity").delete({ perfilId: perfilId })

        // Asignar nuevos permisos
        for (const permisoId of permisos) {
          try {
            // Verificar que el permiso existe
            const permisoEntity = await dataSource.getRepository("PermisoEntity").findOne({
              where: { id: permisoId },
            })

            if (permisoEntity) {
              // Guardar directamente la relación con las claves primarias compuestas
              await dataSource.getRepository("PerfilTienePermisoEntity").save({
                perfilId: perfilId,
                permisoId: permisoId,
              })
              permisosActualizados++
              console.log(`Permiso ${permisoId} asignado al perfil ${perfilId}`)
            } else {
              console.log(`Permiso ${permisoId} no encontrado`)
            }
          } catch (error) {
            console.error(`Error al asignar permiso ${permisoId}:`, error)
          }
        }
      }

      // Obtener el perfil actualizado
      const perfilFinal = await dataSource.getRepository(PerfilEntity).findOne({
        where: { id: perfilId },
      })
      if (!perfilFinal) {
        return NextResponse.json({ message: "Perfil no encontrado" }, { status: 404 })
      }

      return NextResponse.json(
        {
          message: "Perfil actualizado exitosamente",
          data: {
            id: perfilFinal.id,
            nombre: perfilFinal.nombre,
            descripcion: perfilFinal.descripcion,
            permisosActualizados: permisosActualizados,
          },
        },
        { status: 200 },
      )
    } catch (validationError: any) {
      return NextResponse.json(
        {
          message: "Error de validación del modelo",
          error: validationError.message,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error en PUT /api/perfiles/[id]:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Perfiles", accion: "EDITAR", detalle: "Edición de perfil y sus permisos" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Perfiles", accion: "ELIMINAR", detalle: "Baja de perfil" })
