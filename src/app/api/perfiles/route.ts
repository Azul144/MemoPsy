// src/app/api/perfiles/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { Perfil, PerfilTienePermiso, Permiso } from "@/models"

// GET /api/perfiles - Obtener lista de perfiles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Ver Perfiles")) {
      return NextResponse.json({ message: "No tienes permiso para ver perfiles" }, { status: 403 })
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Obtener todos los perfiles
    const perfilesEntities = await dataSource.getRepository("PerfilEntity").find()

    // Para cada perfil, obtener sus permisos y contar usuarios
    const perfilesCompletos = await Promise.all(
      perfilesEntities.map(async (perfilEntity: any) => {
        const perfil = Perfil.fromEntity(perfilEntity)

        // Obtener relaciones PerfilTienePermiso para este perfil
        const perfilTienePermisosEntities = await dataSource
          .getRepository("PerfilTienePermisoEntity")
          .createQueryBuilder("ptp")
          .leftJoinAndSelect("ptp.permiso", "permiso")
          .leftJoinAndSelect("permiso.modulo", "modulo")
          .where("ptp.perfilId = :perfilId", { perfilId: perfil.id })
          .getMany()

        // Convertir permisos a formato esperado
        const permisos = perfilTienePermisosEntities.map((ptp: any) => ({
          id: ptp.permiso.id,
          nombre: ptp.permiso.nombre,
          modulo: ptp.permiso.modulo?.nombre || "General",
        }))

        // Contar usuarios asignados a este perfil
        const usuariosCount = await dataSource.getRepository("UsuarioTienePerfilEntity").count({
          where: { perfilId: perfil.id },
        })

        return {
          id: perfil.id,
          nombre: perfil.nombre,
          descripcion: perfil.descripcion,
          fechaCreacion: perfilEntity.fechaCreacion || new Date(),
          permisos,
          usuariosCount,
        }
      }),
    )

    return NextResponse.json(perfilesCompletos)
  } catch (error) {
    console.error("Error en GET /api/perfiles:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/perfiles - Crear nuevo perfil
// POST /api/perfiles - Crear nuevo perfil (VERSIÓN CORREGIDA)
// POST /api/perfiles - Crear nuevo perfil
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Registrar Perfil")) {
      return NextResponse.json({ message: "No tienes permiso para registrar perfiles" }, { status: 403 })
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

    // Verificar que el nombre no exista
    const perfilExistente = await dataSource.getRepository("PerfilEntity").findOne({
      where: { nombre: nombre.trim() },
    })

    if (perfilExistente) {
      return NextResponse.json(
        {
          message: "El nombre del perfil ya existe",
          errors: { nombre: "Este nombre de perfil ya está en uso" },
        },
        { status: 409 },
      )
    }

    try {
      // Crear el perfil usando el modelo (sin ID para que TypeORM genere uno nuevo)
      const nuevoPerfil = new Perfil({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      })

      // Crear el objeto para guardar sin ID
      const perfilParaGuardar = {
        nombre: nuevoPerfil.nombre,
        descripcion: nuevoPerfil.descripcion,
      }

      console.log("Datos del perfil a guardar:", perfilParaGuardar)

      // 1. Guardar el perfil en la base de datos
      const perfilGuardado = await dataSource.getRepository("PerfilEntity").save(perfilParaGuardar)
      console.log("Perfil guardado inicialmente:", perfilGuardado)

      // 2. Recuperar el perfil completo de la base de datos para asegurar que tenemos el ID
      const perfilRecuperado = await dataSource.getRepository("PerfilEntity").findOne({
        where: { nombre: perfilGuardado.nombre },
      })

      if (!perfilRecuperado || !perfilRecuperado.id) {
        throw new Error("No se pudo recuperar el perfil guardado con su ID")
      }

      console.log("Perfil recuperado con ID:", perfilRecuperado.id)

      // 3. Ahora asignar permisos usando el ID recuperado
      let permisosAsignados = 0
      if (permisos && Array.isArray(permisos) && permisos.length > 0) {
        console.log("Permisos a asignar:", permisos)
        console.log("ID del perfil para asignar permisos:", perfilRecuperado.id)

        for (const permisoId of permisos) {
          try {
            console.log(`Procesando permiso: ${permisoId}`)

            // Verificar que el permiso existe
            const permisoEntity = await dataSource.getRepository("PermisoEntity").findOne({
              where: { id: permisoId },
            })

            if (permisoEntity) {
              console.log(`Permiso encontrado: ${permisoEntity.id}`)

              // Crear la relación usando el ID recuperado del perfil
              const relacionData = {
                perfilId: perfilRecuperado.id,
                permisoId: permisoId,
              }

              console.log(`Guardando relación:`, relacionData)

              const relacionGuardada = await dataSource.getRepository("PerfilTienePermisoEntity").save(relacionData)

              console.log("Relación guardada exitosamente:", relacionGuardada)
              permisosAsignados++
            } else {
              console.log(`Permiso ${permisoId} no encontrado`)
            }
          } catch (error) {
            console.error(`Error al asignar permiso ${permisoId}:`, error)
            console.error("Stack trace:", (error as Error)?.stack)
          }
        }
      }

      return NextResponse.json(
        {
          message: "Perfil creado exitosamente",
          data: {
            id: perfilRecuperado.id,
            nombre: perfilRecuperado.nombre,
            descripcion: perfilRecuperado.descripcion,
            fechaCreacion: perfilRecuperado.fechaCreacion,
            permisosAsignados: permisosAsignados,
          },
        },
        { status: 201 },
      )
    } catch (validationError: any) {
      console.error("Error de validación:", validationError)
      return NextResponse.json(
        {
          message: "Error de validación del modelo",
          error: validationError.message,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error en POST /api/perfiles:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}


/*
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { Perfil } from "@/models/perfil.model"

// GET /api/perfiles - Obtener lista de perfiles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Ver Perfiles")) {
      return NextResponse.json({ message: "No tienes permiso para ver perfiles" }, { status: 403 })
    }

    // Inicializar base de datos
    const dataSource = await initializeDatabase()

    // Obtener todos los perfiles
    const perfilesEntities = await dataSource.getRepository("PerfilEntity").find()

    // Para cada perfil, obtener sus permisos y contar usuarios
    const perfilesCompletos = await Promise.all(
      perfilesEntities.map(async (perfilEntity: any) => {
        const perfil = Perfil.fromEntity(perfilEntity)

        // Obtener relaciones PerfilTienePermiso para este perfil
        const perfilTienePermisosEntities = await dataSource
          .getRepository("PerfilTienePermisoEntity")
          .createQueryBuilder("ptp")
          .leftJoinAndSelect("ptp.permiso", "permiso")
          .leftJoinAndSelect("permiso.modulo", "modulo")
          .where("ptp.perfilId = :perfilId", { perfilId: perfil.id })
          .getMany()

        // Convertir permisos a formato esperado
        const permisos = perfilTienePermisosEntities.map((ptp: any) => ({
          id: ptp.permiso.id,
          nombre: ptp.permiso.nombre,
          modulo: ptp.permiso.modulo?.nombre || "General",
        }))

        // Contar usuarios asignados a este perfil
        const usuariosCount = await dataSource.getRepository("UsuarioTienePerfilEntity").count({
          where: { perfilId: perfil.id },
        })

        return {
          id: perfil.id,
          nombre: perfil.nombre,
          descripcion: perfil.descripcion,
          fechaCreacion: perfilEntity.fechaCreacion || new Date(),
          permisos,
          usuariosCount,
        }
      }),
    )

    return NextResponse.json(perfilesCompletos)
  } catch (error) {
    console.error("Error en GET /api/perfiles:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/perfiles - Crear nuevo perfil
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.permisos) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const userPermissions = session.user.permisos.map((p: any) => p.nombre)
    if (!userPermissions.includes("Registrar Perfil")) {
      return NextResponse.json({ message: "No tienes permiso para registrar perfiles" }, { status: 403 })
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

    // Verificar que el nombre no exista
    const perfilExistente = await dataSource.getRepository("PerfilEntity").findOne({
      where: { nombre: nombre.trim() },
    })

    if (perfilExistente) {
      return NextResponse.json(
        {
          message: "El nombre del perfil ya existe",
          errors: { nombre: "Este nombre de perfil ya está en uso" },
        },
        { status: 409 },
      )
    }

    try {
      // Crear el perfil usando el modelo
      const nuevoPerfil = new Perfil({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
      })

      // Guardar en la base de datos
      const perfilEntity = await dataSource.getRepository("PerfilEntity").save(nuevoPerfil.toEntity())

      // Asignar permisos si se proporcionaron
      let permisosAsignados = 0
      if (permisos && Array.isArray(permisos) && permisos.length > 0) {
        for (const permisoId of permisos) {
          try {
            // Verificar que el permiso existe
            const permisoEntity = await dataSource.getRepository("PermisoEntity").findOne({
              where: { id: permisoId },
            })

            if (permisoEntity) {
              // Crear la relación directamente en la tabla
              await dataSource.getRepository("PerfilTienePermisoEntity").save({
                perfilId: perfilEntity.id,
                permisoId: permisoId,
              })
              permisosAsignados++
            }
          } catch (error) {
            console.error(`Error al asignar permiso ${permisoId}:`, error)
          }
        }
      }

      return NextResponse.json(
        {
          message: "Perfil creado exitosamente",
          data: {
            id: perfilEntity.id,
            nombre: perfilEntity.nombre,
            descripcion: perfilEntity.descripcion,
            fechaCreacion: perfilEntity.fechaCreacion,
            permisosAsignados: permisosAsignados,
          },
        },
        { status: 201 },
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
    console.error("Error en POST /api/perfiles:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

/*import { NextRequest } from 'next/server';
import { PerfilController } from '@/lib/controllers/perfil.controller'; // Adjust path if needed

export async function GET(request: NextRequest) {
  return PerfilController.getAllPerfiles(request);
}

export async function POST(request: NextRequest) {
  return PerfilController.createPerfil(request);
}*/