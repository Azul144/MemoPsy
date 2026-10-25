// src/lib/controllers/paciente.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { PacienteService } from '@/services/paciente.service';
import { PacienteRepository } from '@/repositories/paciente.repository';
import { PersonaRepository } from '@/repositories/persona.repository';
import { ObraSocialRepository } from '@/repositories/obra-social.repository';
import { AppDataSource } from '@/lib/database';
import { ObraSocialEntity } from '@/entities/obra-social.entity'; // For ObraSocialRepository
import { CreatePacienteDto, UpdatePacienteDto, PacienteFiltersDto } from '@/dto/paciente.dto';

// Initialize repositories and service
const pacienteRepository = new PacienteRepository(AppDataSource); // Constructor takes DataSource
const personaRepository = new PersonaRepository(AppDataSource);   // Constructor takes DataSource
const typeOrmObraSocialRepository = AppDataSource.getRepository(ObraSocialEntity);
const obraSocialRepository = new ObraSocialRepository(typeOrmObraSocialRepository); // Constructor takes Repository<Entity>

const pacienteService = new PacienteService(pacienteRepository, personaRepository, obraSocialRepository);

export class PacienteController {

  // GET /api/pacientes - Obtener todos los pacientes
  static async getAllPacientes(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Pacientes' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        // Consider if a psicologo should see a filtered list by default (complex for this generic endpoint)
        return NextResponse.json({ error: 'No tenés permisos para ver la lista completa de pacientes.' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const filters: PacienteFiltersDto = {}; 
      if (searchParams.get('personaId')) filters.personaId = searchParams.get('personaId')!;
      if (searchParams.get('obraSocialId')) filters.obraSocialId = searchParams.get('obraSocialId')!;
      if (searchParams.get('nombrePersona')) filters.nombrePersona = searchParams.get('nombrePersona')!;
      if (searchParams.get('apellidoPersona')) filters.apellidoPersona = searchParams.get('apellidoPersona')!;
      if (searchParams.get('dniPersona')) filters.dniPersona = searchParams.get('dniPersona')!;
      if (searchParams.get('nombreObraSocial')) filters.nombreObraSocial = searchParams.get('nombreObraSocial')!;
      // PacienteFiltersDto in the file doesn't have 'codigoObraSocial', so it's omitted.
      
      const pacientes = await pacienteService.getAllPacientes(filters);
      return NextResponse.json({ success: true, data: pacientes });
    } catch (error: any) {
      console.error('Error al obtener pacientes:', error);
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/pacientes - Crear paciente
  static async createPaciente(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Pacientes' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para crear pacientes' }, { status: 403 });
      }

      const body = await request.json();
      const createPacienteDto: CreatePacienteDto = body; 
      // CreatePacienteDto expects personaId and obraSocialId. Persona must be created separately.
      const nuevoPaciente = await pacienteService.createPaciente(createPacienteDto);
      return NextResponse.json({ success: true, data: nuevoPaciente }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear paciente:', error);
      let statusCode = 400;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('No se encontró una persona con el ID') || error.message?.includes('No se encontró una obra social con el ID')) statusCode = 404;
      else if (error.message?.includes('Esta persona ya está registrada como paciente')) statusCode = 409;
      
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/pacientes/[id] - Obtener paciente por ID
  static async getPacienteById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      
      const { id } = params;
      const paciente = await pacienteService.getPacienteById(id);
      
      if (!paciente) {
        return NextResponse.json({ success: false, error: 'Paciente no encontrado' }, { status: 404 });
      }

      const hasGenericViewPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Pacientes' && permiso.accion.nombre === 'Ver'
      );

      // Get the patient by persona ID
      //const paciente = await pacienteService.findByPersonaId(session.user.persona.id);
      //if (!paciente) {
      //  return NextResponse.json({ error: 'No es un paciente autorizado' }, { status: 401 });
      //}

        // Check if the user is a psicologo and has access to the patient
        // const psicologo = await psicologoService.findByPersonaId(session.user.persona.id);
        // if (!psicologo) {
        //   return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
        // }
        // const isAssignedPsicologo = paciente.psicologoId === psicologo.id; // Assuming paciente has psicologoId
        // const isAssignedPsicologo = paciente.psicologoId === psicologo.id; // Assuming paciente has psicologoId
        // Check if the user is the patient themselves
        // const isSelf = paciente.id === session.user.pacienteId; // Assuming paciente has id and session has pacienteId

      const userPaciente = await pacienteService.getPacienteByPersonaId(session.user.persona.id); 
      const isSelf = userPaciente && userPaciente.id === id; 
      // isAssignedPsicologo is complex without direct link or session role indicating psicologoId and their patients.
      // For now, generic permission or being the patient themselves.

      if (!hasGenericViewPermission && !isSelf) {
         return NextResponse.json({ error: 'No tenés permisos para ver este paciente' }, { status: 403 });
      }
          
      return NextResponse.json({ success: true, data: paciente });
    } catch (error: any) {
      console.error('Error al obtener paciente:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // PacienteService.getPacienteById returns null if not found, handled above.
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/pacientes/[id] - Actualizar paciente
  static async updatePaciente(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
      
      const hasGenericEditPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Pacientes' && permiso.accion.nombre === 'Editar'
      );
      const userPaciente = await pacienteService.getPacienteByPersonaId(session.user.persona.id); 
      const isSelf = userPaciente && userPaciente.id === id; 
      
      //const isSelf = session.user.pacienteId && session.user.pacienteId === id;
      // Add isAssignedPsicologo if feasible later

      if (!hasGenericEditPermission && !isSelf) {
        return NextResponse.json({ error: 'No tenés permisos para actualizar este paciente' }, { status: 403 });
      }

      const body = await request.json();
      const updatePacienteDto: UpdatePacienteDto = body;
      const pacienteActualizado = await pacienteService.updatePaciente(id, updatePacienteDto);
      
      if (!pacienteActualizado) { // Service returns null or throws if not found/failed
         return NextResponse.json({ success: false, error: 'Paciente no encontrado para actualizar o error en la actualización.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: pacienteActualizado });
    } catch (error: any) {
      console.error('Error al actualizar paciente:', error);
      let statusCode = 400;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('No se encontró un paciente con el ID')) statusCode = 404;
      else if (error.message?.includes('No se encontró una persona con el ID') || error.message?.includes('No se encontró una obra social con el ID')) statusCode = 404; // For linked entities
      else if (error.message?.includes('Esta persona ya está registrada como paciente')) statusCode = 409; // For unique constraints on update
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/pacientes/[id] - Eliminar paciente
  static async deletePaciente(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Pacientes' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para eliminar pacientes' }, { status: 403 });
      }

      const { id } = params;
      const deleted = await pacienteService.deletePaciente(id); 
      if (!deleted) { // Service returns false or throws if not found/failed
        return NextResponse.json({ success: false, error: 'Paciente no encontrado para eliminar o error en la eliminación.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Paciente eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar paciente:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('No se encontró un paciente con el ID')) statusCode = 404;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}
