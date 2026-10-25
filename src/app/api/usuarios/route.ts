// app/api/usuarios/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getRepository } from "@/lib/database"
import { PersonaEntity, UsuarioEntity, PsicologoEntity, PacienteEntity, ObraSocialEntity, UsuarioTienePerfilEntity } from "@/entities"
import * as bcrypt from "bcrypt";
import { AYUDA_CELULAR, normalizarCelular } from "@/lib/telefono"

import { getDataSource } from "@/lib/database" // Importar el DataSource

export async function GET() {
  try {
    const usuarioRepo = await getRepository(UsuarioEntity)

    // Obtener todos los usuarios con sus relaciones
    const usuarios = await usuarioRepo.find({
      relations: {
        persona: true,
      },
      order: {
        persona: {
          apellido: "ASC",
          nombre: "ASC",
        },
      },
    })

    // Obtener psicólogos y pacientes por separado para evitar problemas de relaciones
    const psicologoRepo = await getRepository(PsicologoEntity)
    const pacienteRepo = await getRepository(PacienteEntity)

    const psicologos = await psicologoRepo.find({
      relations: {
        persona: true,
      },
    })

    const pacientes = await pacienteRepo.find({
      relations: {
        persona: true,
        obraSocial: true,
      },
    })

    // Perfiles (roles) de cada usuario
    const asignaciones = await (await getRepository(UsuarioTienePerfilEntity)).find({ relations: { perfil: true } })
    const perfilesMap = new Map<string, { id: string; nombre: string; descripcion: string }[]>()
    asignaciones.forEach((a) => {
      if (!a.perfil) return
      const lista = perfilesMap.get(a.usuarioId) ?? []
      lista.push({ id: a.perfil.id, nombre: a.perfil.nombre, descripcion: a.perfil.descripcion })
      perfilesMap.set(a.usuarioId, lista)
    })

    // Crear mapas para búsqueda rápida
    const psicologoMap = new Map()
    psicologos.forEach((psi) => {
      if (psi.persona) {
        psicologoMap.set(psi.persona.id, psi)
      }
    })

    const pacienteMap = new Map()
    pacientes.forEach((pac) => {
      if (pac.persona) {
        pacienteMap.set(pac.persona.id, pac)
      }
    })

    // Enriquecer los datos de usuarios
    const usuariosEnriquecidos = usuarios.map((usuario) => {
      const psicologo = usuario.persona ? psicologoMap.get(usuario.persona.id) : null
      const paciente = usuario.persona ? pacienteMap.get(usuario.persona.id) : null

      return {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo,
        ultimoAcceso: usuario.ultimoAcceso,
        perfiles: perfilesMap.get(usuario.id) ?? [],
        persona: usuario.persona
          ? {
              id: usuario.persona.id,
              nombre: usuario.persona.nombre,
              apellido: usuario.persona.apellido,
              dni: usuario.persona.dni,
              fechaNacimiento: usuario.persona.fechaNacimiento,
              telefono: usuario.persona.telefono,
            }
          : null,
        psicologo: psicologo
          ? {
              id: psicologo.id,
              especialidad: psicologo.especialidad,
              numeroLicencia: psicologo.numeroLicencia,
            }
          : null,
        paciente: paciente
          ? {
              id: paciente.id,
              obraSocial: paciente.obraSocial
                ? {
                    id: paciente.obraSocial.id,
                    nombre: paciente.obraSocial.nombre,
                    activo: paciente.obraSocial.activo,
                  }
                : null,
            }
          : null,
      }
    })

    return NextResponse.json(usuariosEnriquecidos)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ message: "Error al cargar usuarios" }, { status: 500 })
  }
}

async function manejarPOST(request: NextRequest) {
  const dataSource = await getDataSource();
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const body = await request.json()
    const { persona, usuario, roles, psicologo, paciente } = body

    // Validaciones básicas
    if (!persona || !usuario) {
      // IMPORTANTE: Hacer rollback antes de devolver error
      await queryRunner.rollbackTransaction();
      return NextResponse.json(
        { message: "Datos incompletos", errors: { general: "Faltan datos requeridos" } },
        { status: 400 },
      )
    }

    // Todo usuario nuevo es psicólogo o paciente, nunca ambos ni ninguno
    if (Boolean(roles?.isPsicologo) === Boolean(roles?.isPaciente)) {
      await queryRunner.rollbackTransaction();
      return NextResponse.json(
        {
          message: "Debe seleccionar un rol",
          errors: { roleSelection: "Debe seleccionar si el usuario es Psicólogo o Paciente." },
        },
        { status: 400 },
      )
    }

    // Obtener repositorios
    const personaRepo = queryRunner.manager.getRepository(PersonaEntity)
    const usuarioRepo = queryRunner.manager.getRepository(UsuarioEntity)
    const psicologoRepo = queryRunner.manager.getRepository(PsicologoEntity)
    const pacienteRepo = queryRunner.manager.getRepository(PacienteEntity)
    const obraSocialRepo = queryRunner.manager.getRepository(ObraSocialEntity)

    // Validaciones de duplicados
    const [existingPersona, existingUser] = await Promise.all([
      personaRepo.findOne({ where: { dni: persona.dni } }),      // 🔍 Busca por DNI -> existingPersona
      usuarioRepo.findOne({ where: { email: usuario.email } }),  // 📧 Busca por EMAIL -> existingUser
    ]);

    if (existingPersona) {
      await queryRunner.rollbackTransaction();
      return NextResponse.json(
        { message: "El DNI ya está registrado", errors: { dni: "Este DNI ya está en uso" } },
        { status: 400 },
      )
    }

    if (existingUser) {
      await queryRunner.rollbackTransaction();
      return NextResponse.json(
        { message: "El email ya está registrado", errors: { email: "Este email ya está en uso" } },
        { status: 400 },
      )
    }

    // Celular opcional para los recordatorios por WhatsApp
    const telefono = normalizarCelular(persona.telefono)
    if (telefono === undefined) {
      await queryRunner.rollbackTransaction();
      return NextResponse.json(
        { message: "El celular no es válido", errors: { telefono: AYUDA_CELULAR } },
        { status: 400 },
      )
    }

    // Crear persona
    const nuevaPersona = personaRepo.create({
      nombre: persona.nombre,
      apellido: persona.apellido,
      dni: persona.dni,
      fechaNacimiento: new Date(persona.fechaNacimiento),
      telefono,
    })

    const personaGuardada = await personaRepo.save(nuevaPersona)

    // Crear usuario
    const hashedPassword = await bcrypt.hash(usuario.password, 12)
    const nuevoUsuario = usuarioRepo.create({
      email: usuario.email,
      password: hashedPassword,
      activo: usuario.activo,
      ultimoAcceso: new Date(usuario.ultimoAcceso),
      persona: personaGuardada,
    })

    // Guardar persona y usuario
    const usuarioGuardado = await usuarioRepo.save(nuevoUsuario)

    const resultados = {
      persona: personaGuardada,
      usuario: { ...usuarioGuardado, password: undefined },
      roles: [],
    }

    // Procesar rol de psicólogo
    if (roles.isPsicologo && psicologo) {
      const existingPsicologo = await psicologoRepo.findOne({
        where: { numeroLicencia: psicologo.numeroLicencia },
      })

      if (existingPsicologo) {
        // CORRECCIÓN: Rollback y retorno de error
        await queryRunner.rollbackTransaction();
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
        persona: personaGuardada,
      })

      const psicologoGuardado = await psicologoRepo.save(nuevoPsicologo)
    }

    // Procesar rol de paciente
    if (roles.isPaciente && paciente) {
      const obraSocial = await obraSocialRepo.findOne({
        where: { id: paciente.id_obra_social },
      })

      if (!obraSocial) {
        // CORRECCIÓN: Rollback y retorno de error
        await queryRunner.rollbackTransaction();
        return NextResponse.json(
          {
            message: "Obra social no encontrada",
            errors: { selectedObraSocialId: "La obra social seleccionada no existe" },
          },
          { status: 400 },
        )
      }

      const nuevoPaciente = pacienteRepo.create({
        persona: personaGuardada,
        obraSocial: obraSocial,
      })

      const pacienteGuardado = await pacienteRepo.save(nuevoPaciente)
    }

    // Confirmar transacción si todo está bien
    await queryRunner.commitTransaction();

    return NextResponse.json(
      {
        message: "Usuario registrado exitosamente",
        data: resultados,
      },
      { status: 201 },
    )
  } catch (error) {
    // Manejar errores inesperados
    await queryRunner.rollbackTransaction();
    console.error("Error al registrar usuario:", error);

    // Manejar errores de duplicados
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
    // Liberar recursos
    await queryRunner.release();
  }
}

// RF 1.4 - Registro de auditoría de esta ruta
export const POST = conAuditoria(manejarPOST, { modulo: "Usuarios", accion: "CREAR", detalle: "Alta de usuario" })
