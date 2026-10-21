// app/api/usuarios/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getRepository, getDataSource } from "@/lib/database"
import {
  PersonaEntity,
  UsuarioEntity,
  PsicologoEntity,
  PacienteEntity,
  ObraSocialEntity,
  PerfilEntity,
  UsuarioTienePerfilEntity,
} from "@/entities"

// Helper function para manejar fechas
function formatDateToISO(date: any): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  if (typeof date === "string") return new Date(date).toISOString()
  return new Date(date).toISOString()
}

// GET - Obtener usuario por ID con todos sus datos
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const { id } = params
    const usuarioRepo = await getRepository(UsuarioEntity)

    const usuario = await usuarioRepo.findOne({
      where: { id },
      relations: {
        persona: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener datos específicos de psicólogo si existe
    let psicologoData = null
    if (usuario.persona) {
      const psicologoRepo = await getRepository(PsicologoEntity)
      const psicologo = await psicologoRepo.findOne({
        where: { persona: { id: usuario.persona.id } },
        relations: { persona: true },
      })

      if (psicologo) {
        psicologoData = {
          id: psicologo.id,
          especialidad: psicologo.especialidad,
          numeroLicencia: psicologo.numeroLicencia,
        }
      }
    }

    // Obtener datos específicos de paciente si existe
    let pacienteData = null
    if (usuario.persona) {
      const pacienteRepo = await getRepository(PacienteEntity)
      const paciente = await pacienteRepo.findOne({
        where: { persona: { id: usuario.persona.id } },
        relations: { persona: true, obraSocial: true },
      })

      if (paciente) {
        pacienteData = {
          id: paciente.id,
          obraSocial: paciente.obraSocial
            ? {
                id: paciente.obraSocial.id,
                nombre: paciente.obraSocial.nombre,
              }
            : null,
        }
      }
    }

    // Obtener perfiles del usuario
    const usuarioPerfilRepo = await getRepository(UsuarioTienePerfilEntity)
    const usuarioPerfiles = await usuarioPerfilRepo.find({
      where: { usuarioId: usuario.id },
      relations: { perfil: true },
    })

    const perfiles = usuarioPerfiles.map((up) => ({
      id: up.perfil.id,
      nombre: up.perfil.nombre,
      descripcion: up.perfil.descripcion,
    }))

    const response = {
      id: usuario.id,
      email: usuario.email,
      activo: usuario.activo,
      persona: {
        id: usuario.persona.id,
        nombre: usuario.persona.nombre,
        apellido: usuario.persona.apellido,
        dni: usuario.persona.dni,
        fechaNacimiento: formatDateToISO(usuario.persona.fechaNacimiento),
      },
      psicologo: psicologoData,
      paciente: pacienteData,
      perfiles: perfiles,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json({ message: "Error al cargar usuario" }, { status: 500 })
  }
}

// PUT - Actualizar usuario completo
async function manejarPUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const dataSource = await getDataSource()
  const queryRunner = dataSource.createQueryRunner()

  try {
    await queryRunner.connect()
    await queryRunner.startTransaction()

    const { id } = params
    const body = await request.json()
    const { persona, activo, psicologo, paciente, perfiles } = body

    // Validaciones básicas
    if (!persona) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json(
        { message: "Datos de persona requeridos", errors: { general: "Faltan datos de persona" } },
        { status: 400 },
      )
    }

    // Obtener repositorios
    const usuarioRepo = queryRunner.manager.getRepository(UsuarioEntity)
    const personaRepo = queryRunner.manager.getRepository(PersonaEntity)
    const psicologoRepo = queryRunner.manager.getRepository(PsicologoEntity)
    const pacienteRepo = queryRunner.manager.getRepository(PacienteEntity)
    const obraSocialRepo = queryRunner.manager.getRepository(ObraSocialEntity)
    const perfilRepo = queryRunner.manager.getRepository(PerfilEntity)
    const usuarioPerfilRepo = queryRunner.manager.getRepository(UsuarioTienePerfilEntity)

    // Buscar usuario existente
    const usuarioExistente = await usuarioRepo.findOne({
      where: { id },
      relations: { persona: true },
    })

    if (!usuarioExistente) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar DNI duplicado (excluyendo el usuario actual)
    const existingPersona = await personaRepo.findOne({
      where: { dni: persona.dni },
    })

    if (existingPersona && existingPersona.id !== usuarioExistente.persona.id) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json(
        { message: "El DNI ya está registrado", errors: { dni: "Este DNI ya está en uso" } },
        { status: 400 },
      )
    }

    // Actualizar datos de persona
    await personaRepo.update(usuarioExistente.persona.id, {
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      fechaNacimiento: new Date(persona.fechaNacimiento),
    })

    // Actualizar datos de usuario
    await usuarioRepo.update(id, {
      activo: activo,
    })

    // Extraer roles del body
    const roles = body.roles || { isPsicologo: false, isPaciente: false }

    // Limpiar roles existentes
    const psicologoExistente = await psicologoRepo.findOne({
      where: { persona: { id: usuarioExistente.persona.id } },
    })
    if (psicologoExistente && !roles.isPsicologo) {
      await psicologoRepo.remove(psicologoExistente)
    }

    const pacienteExistente = await pacienteRepo.findOne({
      where: { persona: { id: usuarioExistente.persona.id } },
    })
    if (pacienteExistente && !roles.isPaciente) {
      await pacienteRepo.remove(pacienteExistente)
    }

    // Procesar rol de psicólogo
    if (roles.isPsicologo && psicologo) {
      // Si ya existe un psicólogo para esta persona, actualizarlo
      if (psicologoExistente) {
        await psicologoRepo.update(psicologoExistente.id, {
          especialidad: psicologo.especialidad,
          numeroLicencia: psicologo.numeroLicencia,
        })
      } else {
        // Verificar número de licencia único
        const existingPsicologo = await psicologoRepo.findOne({
          where: { numeroLicencia: psicologo.numeroLicencia },
        })

        if (existingPsicologo) {
          await queryRunner.rollbackTransaction()
          return NextResponse.json(
            {
              message: "El número de licencia ya está registrado",
              errors: { numeroLicencia: "Este número de licencia ya está en uso" },
            },
            { status: 400 },
          )
        }

        const nuevoPsicologo = psicologoRepo.create({
          especialidad: psicologo.especialidad,
          numeroLicencia: psicologo.numeroLicencia,
          persona: usuarioExistente.persona,
        })

        await psicologoRepo.save(nuevoPsicologo)
      }
    }

    // Procesar rol de paciente
    if (roles.isPaciente && paciente && paciente.idObraSocial) {
      // Si ya existe un paciente para esta persona, actualizarlo
      if (pacienteExistente) {
        const obraSocial = await obraSocialRepo.findOne({
          where: { id: paciente.idObraSocial },
        })

        if (!obraSocial) {
          await queryRunner.rollbackTransaction()
          return NextResponse.json(
            {
              message: "Obra social no encontrada",
              errors: { selectedObraSocialId: "La obra social seleccionada no existe" },
            },
            { status: 400 },
          )
        }

        await pacienteRepo.update(pacienteExistente.id, {
          obraSocial: obraSocial,
        })
      } else {
        const obraSocial = await obraSocialRepo.findOne({
          where: { id: paciente.idObraSocial },
        })

        if (!obraSocial) {
          await queryRunner.rollbackTransaction()
          return NextResponse.json(
            {
              message: "Obra social no encontrada",
              errors: { selectedObraSocialId: "La obra social seleccionada no existe" },
            },
            { status: 400 },
          )
        }

        const nuevoPaciente = pacienteRepo.create({
          persona: usuarioExistente.persona,
          obraSocial: obraSocial,
        })

        await pacienteRepo.save(nuevoPaciente)
      }
    }

    // Actualizar perfiles del usuario
    if (perfiles && Array.isArray(perfiles)) {
      // Eliminar perfiles existentes
      await usuarioPerfilRepo.delete({ usuarioId: id })

      // Agregar nuevos perfiles
      for (const perfilId of perfiles) {
        const perfil = await perfilRepo.findOne({ where: { id: perfilId } })
        if (perfil) {
          const usuarioPerfil = usuarioPerfilRepo.create({
            usuarioId: id,
            perfilId: perfilId,
            usuario: usuarioExistente,
            perfil: perfil,
          })
          await usuarioPerfilRepo.save(usuarioPerfil)
        }
      }
    }

    await queryRunner.commitTransaction()

    return NextResponse.json(
      {
        message: "Usuario actualizado exitosamente",
        data: { id: id },
      },
      { status: 200 },
    )
  } catch (error) {
    await queryRunner.rollbackTransaction()
    console.error("Error al actualizar usuario:", error)

    if (error instanceof Error) {
      if (error.message.includes("Duplicate entry")) {
        return NextResponse.json(
          { message: "Datos duplicados", errors: { general: "Ya existe un registro con estos datos" } },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      { message: "Error interno del servidor", errors: { general: "Ocurrió un error inesperado" } },
      { status: 500 },
    )
  } finally {
    await queryRunner.release()
  }
}

// DELETE - Eliminar usuario (opcional)
async function manejarDELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const { id } = params
    const usuarioRepo = await getRepository(UsuarioEntity)

    const usuario = await usuarioRepo.findOne({ where: { id } })
    if (!usuario) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    await usuarioRepo.remove(usuario)

    return NextResponse.json({ message: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ message: "Error al eliminar usuario" }, { status: 500 })
  }
}


/*
import { type NextRequest, NextResponse } from "next/server"
import { getRepository, getDataSource } from "@/lib/database"
import {
  PersonaEntity,
  UsuarioEntity,
  PsicologoEntity,
  PacienteEntity,
  ObraSocialEntity,
  PerfilEntity,
  UsuarioTienePerfilEntity,
} from "@/entities"

// Helper function para manejar fechas
function formatDateToISO(date: any): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  if (typeof date === "string") return new Date(date).toISOString()
  return new Date(date).toISOString()
}

// GET - Obtener usuario por ID con todos sus datos
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const { id } = params
    const usuarioRepo = await getRepository(UsuarioEntity)

    const usuario = await usuarioRepo.findOne({
      where: { id },
      relations: {
        persona: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener datos específicos de psicólogo si existe
    let psicologoData = null
    if (usuario.persona) {
      const psicologoRepo = await getRepository(PsicologoEntity)
      const psicologo = await psicologoRepo.findOne({
        where: { persona: { id: usuario.persona.id } },
        relations: { persona: true },
      })

      if (psicologo) {
        psicologoData = {
          id: psicologo.id,
          especialidad: psicologo.especialidad,
          numeroLicencia: psicologo.numeroLicencia,
        }
      }
    }

    // Obtener datos específicos de paciente si existe
    let pacienteData = null
    if (usuario.persona) {
      const pacienteRepo = await getRepository(PacienteEntity)
      const paciente = await pacienteRepo.findOne({
        where: { persona: { id: usuario.persona.id } },
        relations: { persona: true, obraSocial: true },
      })

      if (paciente) {
        pacienteData = {
          id: paciente.id,
          obraSocial: paciente.obraSocial
            ? {
                id: paciente.obraSocial.id,
                nombre: paciente.obraSocial.nombre,
              }
            : null,
        }
      }
    }

    // Obtener perfiles del usuario
    const usuarioPerfilRepo = await getRepository(UsuarioTienePerfilEntity)
    const usuarioPerfiles = await usuarioPerfilRepo.find({
      where: { usuarioId: usuario.id },
      relations: { perfil: true },
    })

    const perfiles = usuarioPerfiles.map((up) => ({
      id: up.perfil.id,
      nombre: up.perfil.nombre,
      descripcion: up.perfil.descripcion,
    }))

    const response = {
      id: usuario.id,
      email: usuario.email,
      activo: usuario.activo,
      persona: {
        id: usuario.persona.id,
        nombre: usuario.persona.nombre,
        apellido: usuario.persona.apellido,
        dni: usuario.persona.dni,
        fechaNacimiento: formatDateToISO(usuario.persona.fechaNacimiento),
      },
      psicologo: psicologoData,
      paciente: pacienteData,
      perfiles: perfiles,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    return NextResponse.json({ message: "Error al cargar usuario" }, { status: 500 })
  }
}

// PUT - Actualizar usuario completo
export async function PUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const dataSource = await getDataSource()
  const queryRunner = dataSource.createQueryRunner()

  try {
    await queryRunner.connect()
    await queryRunner.startTransaction()

    const { id } = params
    const body = await request.json()
    const { persona, activo, psicologo, paciente, perfiles } = body

    // Validaciones básicas
    if (!persona) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json(
        { message: "Datos de persona requeridos", errors: { general: "Faltan datos de persona" } },
        { status: 400 },
      )
    }

    // Obtener repositorios
    const usuarioRepo = queryRunner.manager.getRepository(UsuarioEntity)
    const personaRepo = queryRunner.manager.getRepository(PersonaEntity)
    const psicologoRepo = queryRunner.manager.getRepository(PsicologoEntity)
    const pacienteRepo = queryRunner.manager.getRepository(PacienteEntity)
    const obraSocialRepo = queryRunner.manager.getRepository(ObraSocialEntity)
    const perfilRepo = queryRunner.manager.getRepository(PerfilEntity)
    const usuarioPerfilRepo = queryRunner.manager.getRepository(UsuarioTienePerfilEntity)

    // Buscar usuario existente
    const usuarioExistente = await usuarioRepo.findOne({
      where: { id },
      relations: { persona: true },
    })

    if (!usuarioExistente) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar DNI duplicado (excluyendo el usuario actual)
    const existingPersona = await personaRepo.findOne({
      where: { dni: persona.dni },
    })

    if (existingPersona && existingPersona.id !== usuarioExistente.persona.id) {
      await queryRunner.rollbackTransaction()
      return NextResponse.json(
        { message: "El DNI ya está registrado", errors: { dni: "Este DNI ya está en uso" } },
        { status: 400 },
      )
    }

    // Actualizar datos de persona
    await personaRepo.update(usuarioExistente.persona.id, {
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      fechaNacimiento: new Date(persona.fechaNacimiento),
    })

    // Actualizar datos de usuario
    await usuarioRepo.update(id, {
      activo: activo,
    })

    // Limpiar roles existentes
    const psicologoExistente = await psicologoRepo.findOne({
      where: { persona: { id: usuarioExistente.persona.id } },
    })
    if (psicologoExistente) {
      await psicologoRepo.remove(psicologoExistente)
    }

    const pacienteExistente = await pacienteRepo.findOne({
      where: { persona: { id: usuarioExistente.persona.id } },
    })
    if (pacienteExistente) {
      await pacienteRepo.remove(pacienteExistente)
    }

    // Crear nuevo rol de psicólogo si aplica
    if (psicologo) {
      // Verificar número de licencia único
      const existingPsicologo = await psicologoRepo.findOne({
        where: { numeroLicencia: psicologo.numeroLicencia },
      })

      if (existingPsicologo) {
        await queryRunner.rollbackTransaction()
        return NextResponse.json(
          {
            message: "El número de licencia ya está registrado",
            errors: { numeroLicencia: "Este número de licencia ya está en uso" },
          },
          { status: 400 },
        )
      }

      const nuevoPsicologo = psicologoRepo.create({
        especialidad: psicologo.especialidad,
        numeroLicencia: psicologo.numeroLicencia,
        persona: usuarioExistente.persona,
      })

      await psicologoRepo.save(nuevoPsicologo)
    }

    // Crear nuevo rol de paciente si aplica
    if (paciente && paciente.idObraSocial) {
      const obraSocial = await obraSocialRepo.findOne({
        where: { id: paciente.idObraSocial },
      })

      if (!obraSocial) {
        await queryRunner.rollbackTransaction()
        return NextResponse.json(
          {
            message: "Obra social no encontrada",
            errors: { selectedObraSocialId: "La obra social seleccionada no existe" },
          },
          { status: 400 },
        )
      }

      const nuevoPaciente = pacienteRepo.create({
        persona: usuarioExistente.persona,
        obraSocial: obraSocial,
      })

      await pacienteRepo.save(nuevoPaciente)
    }

    // Actualizar perfiles del usuario
    if (perfiles && Array.isArray(perfiles)) {
      // Eliminar perfiles existentes
      await usuarioPerfilRepo.delete({ usuarioId: id })

      // Agregar nuevos perfiles
      for (const perfilId of perfiles) {
        const perfil = await perfilRepo.findOne({ where: { id: perfilId } })
        if (perfil) {
          const usuarioPerfil = usuarioPerfilRepo.create({
            usuarioId: id,
            perfilId: perfilId,
            usuario: usuarioExistente,
            perfil: perfil,
          })
          await usuarioPerfilRepo.save(usuarioPerfil)
        }
      }
    }

    await queryRunner.commitTransaction()

    return NextResponse.json(
      {
        message: "Usuario actualizado exitosamente",
        data: { id: id },
      },
      { status: 200 },
    )
  } catch (error) {
    await queryRunner.rollbackTransaction()
    console.error("Error al actualizar usuario:", error)

    if (error instanceof Error) {
      if (error.message.includes("Duplicate entry")) {
        return NextResponse.json(
          { message: "Datos duplicados", errors: { general: "Ya existe un registro con estos datos" } },
          { status: 400 },
        )
      }
    }

    return NextResponse.json(
      { message: "Error interno del servidor", errors: { general: "Ocurrió un error inesperado" } },
      { status: 500 },
    )
  } finally {
    await queryRunner.release()
  }
}

// DELETE - Eliminar usuario (opcional)
export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const { id } = params
    const usuarioRepo = await getRepository(UsuarioEntity)

    const usuario = await usuarioRepo.findOne({ where: { id } })
    if (!usuario) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 })
    }

    await usuarioRepo.remove(usuario)

    return NextResponse.json({ message: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ message: "Error al eliminar usuario" }, { status: 500 })
  }
}*/

// RF 1.4 - Registro de auditoría de esta ruta
export const PUT = conAuditoria(manejarPUT, { modulo: "Usuarios", accion: "EDITAR", detalle: "Edición de datos del usuario" })
export const DELETE = conAuditoria(manejarDELETE, { modulo: "Usuarios", accion: "ELIMINAR", detalle: "Baja de usuario" })
