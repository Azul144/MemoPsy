// src/app/api/sesiones/route.ts
// src/app/api/sesiones/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { esDiaHabilEnConsultorio, MENSAJE_DIA_NO_HABIL } from "@/lib/validaciones/dias-habiles"
import { alcanceSesiones, puedeVerSesion } from "@/lib/auth/alcance-sesiones"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { SesionEntity, PacienteTieneSesionEntity, PsicologoEntity, ModalidadEntity, EstadoEntity } from "@/entities"
import { PacienteTieneSesion } from "@/models/paciente-tiene-sesion.model"
import { Sesion } from "@/models/sesion.model"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos
    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || []
    if (!userPermissions.includes("Ver Sesiones")) {
      return NextResponse.json({ error: "Sin permisos para ver sesiones" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity)

    // Obtener todas las sesiones
    const sesiones = await sesionRepository.find({
      relations: ["psicologo", "psicologo.persona", "modalidad", "estado"],
      order: {
        fechaHoraInicio: "ASC",
      },
    })

    // Transformar datos usando los modelos de dominio
    const sesionesTransformadas = await Promise.all(
      sesiones.map(async (sesionEntity) => {
        // Validar que la entidad de sesión tenga las propiedades requeridas
        if (!sesionEntity || !sesionEntity.id) {
          console.error("SesionEntity inválida:", sesionEntity)
          return null
        }

        // Obtener pacientes asociados a esta sesión usando la tabla intermedia
        const pacienteTieneSesiones = await pacienteTieneSesionRepository.find({
          where: { sesionId: sesionEntity.id },
          relations: ["paciente", "paciente.persona", "paciente.obraSocial"],
        })

        // Transformar los pacientes asociados SIN usar PacienteTieneSesion.fromEntity()
        // ya que no necesitamos duplicar la información de sesión que ya tenemos
        const pacientesAsociados = pacienteTieneSesiones
          .map((ptsEntity) => {
            try {
              // Validar que ptsEntity tenga las propiedades necesarias
              if (!ptsEntity || !ptsEntity.paciente || !ptsEntity.paciente.id) {
                console.error("PacienteTieneSesionEntity inválida:", ptsEntity)
                return null
              }

              // Crear el paciente directamente sin usar fromEntity
              return {
                id: ptsEntity.paciente.id,
                persona: {
                  nombre: ptsEntity.paciente.persona?.nombre || 'N/A',
                  apellido: ptsEntity.paciente.persona?.apellido || 'N/A',
                },
              }
            } catch (error) {
              console.error("Error transformando paciente:", error, ptsEntity)
              return null
            }
          })
          .filter(Boolean) // Filtrar elementos null

        return {
          id: sesionEntity.id,
          fechaHoraInicio: sesionEntity.fechaHoraInicio?.toISOString() || null,
          fechaHoraFin: sesionEntity.fechaHoraFin?.toISOString() || null,
          psicologo: sesionEntity.psicologo
            ? {
                id: sesionEntity.psicologo.id,
                persona: {
                  nombre: sesionEntity.psicologo.persona?.nombre || 'N/A',
                  apellido: sesionEntity.psicologo.persona?.apellido || 'N/A',
                },
              }
            : null,
          modalidad: sesionEntity.modalidad
            ? {
                id: sesionEntity.modalidad.id,
                nombre: sesionEntity.modalidad.nombre,
              }
            : null,
          estado: sesionEntity.estado
            ? {
                id: sesionEntity.estado.id,
                nombre: sesionEntity.estado.nombre,
              }
            : null,
          pacientes: pacientesAsociados,
        }
      }),
    )

    // Filtrar sesiones null que pudieron resultar de validaciones fallidas
    // y dejar SOLO las que esta persona puede ver según su rol
    const alcance = alcanceSesiones(session.user)
    const sesionesValidas = sesionesTransformadas.filter(
      (sesion) => sesion !== null && puedeVerSesion(alcance, sesion),
    )

    return NextResponse.json(sesionesValidas)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos
    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || []
    if (!userPermissions.includes("Registrar Sesión")) {
      return NextResponse.json({ error: "Sin permisos para registrar sesiones" }, { status: 403 })
    }

    const body = await request.json()
    const { fechaHoraInicio, fechaHoraFin, psicologoId, modalidadId, estadoId, pacientesIds } = body

    // Validar que los campos requeridos estén presentes
    if (!psicologoId || !modalidadId || !estadoId) {
      return NextResponse.json(
        {
          error: "Datos incompletos",
          details: {
            psicologoId: psicologoId ? null : "El psicólogo es requerido",
            modalidadId: modalidadId ? null : "La modalidad es requerida",
            estadoId: estadoId ? null : "El estado es requerido",
          },
        },
        { status: 400 },
      )
    }

    // Solo de lunes a viernes
    const diaInicioHabil = esDiaHabilEnConsultorio(new Date(fechaHoraInicio))
    const diaFinHabil = esDiaHabilEnConsultorio(new Date(fechaHoraFin))
    if (!diaInicioHabil || !diaFinHabil) {
      return NextResponse.json(
        {
          error: MENSAJE_DIA_NO_HABIL,
          details: {
            fechaInicio: diaInicioHabil ? null : MENSAJE_DIA_NO_HABIL,
            fechaFin: diaFinHabil ? null : MENSAJE_DIA_NO_HABIL,
          },
        },
        { status: 400 },
      )
    }

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity)

    // Crear la sesión con valores explícitos (no DEFAULT)
    const nuevaSesion = sesionRepository.create({
      fechaHoraInicio: new Date(fechaHoraInicio),
      fechaHoraFin: new Date(fechaHoraFin),
      psicologo: { id: psicologoId } as PsicologoEntity,
      modalidad: { id: modalidadId } as ModalidadEntity,
      estado: { id: estadoId } as EstadoEntity,
    })

    const sesionGuardada = await sesionRepository.save(nuevaSesion)

    // Asociar pacientes si se proporcionaron
    if (pacientesIds && pacientesIds.length > 0) {
      const pacienteRelaciones = pacientesIds.map((pacienteId: string | number) => {
        return pacienteTieneSesionRepository.create({
          sesionId: sesionGuardada.id,
          pacienteId: String(pacienteId),
        })
      })

      await pacienteTieneSesionRepository.save(pacienteRelaciones)
    }

    return NextResponse.json(
      {
        message: "Sesión creada exitosamente",
        sesion: sesionGuardada,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
/*
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authConfig } from "@/lib/auth/auth-config"
import { initializeDatabase } from "@/lib/database"
import { SesionEntity, PacienteTieneSesionEntity, PsicologoEntity, ModalidadEntity, EstadoEntity } from "@/entities"
import { PacienteTieneSesion } from "@/models/paciente-tiene-sesion.model"
import { Sesion } from "@/models/sesion.model"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos
    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || []
    if (!userPermissions.includes("Ver Sesiones")) {
      return NextResponse.json({ error: "Sin permisos para ver sesiones" }, { status: 403 })
    }

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity)

    // Obtener todas las sesiones
    const sesiones = await sesionRepository.find({
      relations: ["psicologo", "psicologo.persona", "modalidad", "estado"],
      order: {
        fechaHoraInicio: "ASC",
      },
    })

    // Transformar datos usando los modelos de dominio
    const sesionesTransformadas = await Promise.all(
      sesiones.map(async (sesionEntity) => {
        //const sesion = Sesion.fromEntity(sesionEntity)

        // Obtener pacientes asociados a esta sesión usando la tabla intermedia
        const pacienteTieneSesiones = await pacienteTieneSesionRepository.find({
          where: { sesionId: sesionEntity.id },
          relations: ["paciente", "paciente.persona", "paciente.obraSocial"],
        })

        // Transformar usando el modelo PacienteTieneSesion
        const pacientesAsociados = pacienteTieneSesiones.map((ptsEntity) => {
          const pacienteTieneSesion = PacienteTieneSesion.fromEntity(ptsEntity)
          return {
            id: pacienteTieneSesion.paciente.id,
            persona: {
              nombre: pacienteTieneSesion.paciente.persona.nombre,
              apellido: pacienteTieneSesion.paciente.persona.apellido,
            },
          }
        })

        return {
          id: sesionEntity.id,
          fechaHoraInicio: sesionEntity.fechaHoraInicio.toISOString(),
          fechaHoraFin: sesionEntity.fechaHoraFin.toISOString(),
          psicologo: sesionEntity.psicologo
            ? {
                id: sesionEntity.psicologo.id,
                persona: {
                  nombre: sesionEntity.psicologo.persona.nombre,
                  apellido: sesionEntity.psicologo.persona.apellido,
                },
              }
            : null,
          modalidad: sesionEntity.modalidad
            ? {
                id: sesionEntity.modalidad.id,
                nombre: sesionEntity.modalidad.nombre,
              }
            : null,
          estado: sesionEntity.estado
            ? {
                id: sesionEntity.estado.id,
                nombre: sesionEntity.estado.nombre,
              }
            : null,
          pacientes: pacientesAsociados,
        }
      }),
    )

    return NextResponse.json(sesionesTransformadas)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar permisos
    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || []
    if (!userPermissions.includes("Registrar Sesión")) {
      return NextResponse.json({ error: "Sin permisos para registrar sesiones" }, { status: 403 })
    }

    const body = await request.json()
    const { fechaHoraInicio, fechaHoraFin, psicologoId, modalidadId, estadoId, pacientesIds } = body

    // Validar que los campos requeridos estén presentes
    if (!psicologoId || !modalidadId || !estadoId) {
      return NextResponse.json(
        {
          error: "Datos incompletos",
          details: {
            psicologoId: psicologoId ? null : "El psicólogo es requerido",
            modalidadId: modalidadId ? null : "La modalidad es requerida",
            estadoId: estadoId ? null : "El estado es requerido",
          },
        },
        { status: 400 },
      )
    }

    const dataSource = await initializeDatabase()
    const sesionRepository = dataSource.getRepository(SesionEntity)
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity)

    // Crear la sesión con valores explícitos (no DEFAULT)
    const nuevaSesion = sesionRepository.create({
      fechaHoraInicio: new Date(fechaHoraInicio),
      fechaHoraFin: new Date(fechaHoraFin),
      psicologo: { id: psicologoId } as PsicologoEntity,
      modalidad: { id: modalidadId } as ModalidadEntity,
      estado: { id: estadoId } as EstadoEntity,
    })

    const sesionGuardada = await sesionRepository.save(nuevaSesion)

    // Asociar pacientes si se proporcionaron
    if (pacientesIds && pacientesIds.length > 0) {
      const pacienteRelaciones = pacientesIds.map((pacienteId) => {
        return pacienteTieneSesionRepository.create({
          sesionId: sesionGuardada.id,
          pacienteId: pacienteId,
        })
      })

      await pacienteTieneSesionRepository.save(pacienteRelaciones)
    }

    return NextResponse.json(
      {
        message: "Sesión creada exitosamente",
        sesion: sesionGuardada,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

/*
import { NextRequest } from 'next/server';
import { SesionController } from '@/lib/controllers/sesion.controller';

export async function GET(request: NextRequest) {
  return SesionController.getAllSesiones(request);
}

export async function POST(request: NextRequest) {
  return SesionController.createSesion(request);
}
  */