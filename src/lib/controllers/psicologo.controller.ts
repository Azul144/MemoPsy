// src/lib/controllers/psicologo.controller.ts
// Controlador de los psicólogos (patrón Repositorio, apartado 8.4.2 del TIF).
// Recibe el pedido desde la ruta de la API, controla la sesión y delega las reglas de negocio en PsicologoService.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { PsicologoService } from '@/services/psicologo.service';
import { PsicologoRepository } from '@/repositories/psicologo.repository';
import { PersonaRepository } from '@/repositories/persona.repository'; // Required by PsicologoService
import { AppDataSource } from '@/lib/database';
import { 
  CreatePsicologoDto, 
  UpdatePsicologoDto, 
  PsicologoQueryDto,
  CreatePsicologoWithPersonaDto
} from '@/dto/psicologo.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

// Initialize services and repositories
const personaRepository = new PersonaRepository(AppDataSource); // Dependency for PsicologoService
const psicologoRepository = new PsicologoRepository(AppDataSource);
const psicologoService = new PsicologoService(psicologoRepository, personaRepository);

export class PsicologoController {

  // POST /api/psicologos - Create a new psicologo (assuming personaId is provided)
  static async createPsicologo(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check (adjust as needed)

      const body = await request.json();
      const createPsicologoDto = plainToClass(CreatePsicologoDto, body);

      const errors = await validate(createPsicologoDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }

      const nuevoPsicologo = await psicologoService.create(createPsicologoDto);
      return NextResponse.json({ success: true, data: nuevoPsicologo, message: 'Psicólogo creado exitosamente' }, { status: 201 });

    } catch (error: any) {
      console.error('Error al crear psicólogo:', error);
      if (error.message?.includes('La persona especificada no existe')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('Ya existe un psicólogo con este número de licencia') || error.message?.includes('Esta persona ya está asignada a otro psicólogo')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 400 } // Default to 400 for creation errors
      );
    }
  }
  
  // POST /api/psicologos/with-persona - Create a new psicologo and a new persona simultaneously
  static async createPsicologoWithPersona(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check (adjust as needed)

      const body = await request.json();
      // Ensure nested persona data is correctly transformed and validated
      const createPsicologoWithPersonaDto = plainToClass(CreatePsicologoWithPersonaDto, body, { enableImplicitConversion: true });
      
      const errors = await validate(createPsicologoWithPersonaDto, { validationError: { target: false } });
      if (errors.length > 0) {
        const errorMessages = errors.map(err => {
          if (err.children && err.children.length > 0) { // Handle nested errors (for persona)
            return err.children.map(childErr => Object.values(childErr.constraints || {})).flat();
          }
          return Object.values(err.constraints || {}).flat();
        }).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }

      const nuevoPsicologo = await psicologoService.createWithPersona(createPsicologoWithPersonaDto);
      return NextResponse.json({ success: true, data: nuevoPsicologo, message: 'Psicólogo y persona creados exitosamente' }, { status: 201 });

    } catch (error: any) {
      console.error('Error al crear psicólogo con persona:', error);
      if (error.message?.includes('Ya existe un psicólogo con este número de licencia')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict
      }
      // Catch DNI conflict from persona creation if applicable
      if (error.message?.includes('Ya existe una persona con el DNI')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 400 } 
      );
    }
  }

  // GET /api/psicologos - Get all psicologos with filters and pagination
  static async getAllPsicologos(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check

      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());
      // Parse page and limit to numbers, provide defaults, but do not mutate queryParams type
      const page = parseInt(queryParams.page || '1', 10);
      const limit = parseInt(queryParams.limit || '10', 10);

      const queryDto = plainToClass(
        PsicologoQueryDto,
        { ...queryParams, page, limit },
        { enableImplicitConversion: true }
      );

      const errors = await validate(queryDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Filtros inválidos', details: errorMessages }, { status: 400 });
      }
      
      const paginatedResult = await psicologoService.findAll(queryDto);
      return NextResponse.json({ success: true, ...paginatedResult });

    } catch (error: any) {
      console.error('Error al obtener psicólogos:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }

  // GET /api/psicologos/[id] - Get a psicologo by ID
  static async getPsicologoById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }
      
      const { id } = params;
      if (!id || typeof id !== 'string') { 
          return NextResponse.json({ success: false, error: 'ID de psicólogo inválido' }, { status: 400 });
      }

      // Example permission check (adjust as needed)

      const psicologo = await psicologoService.findById(id);
      return NextResponse.json({ success: true, data: psicologo });

    } catch (error: any) {
      console.error('Error al obtener psicólogo por ID:', error);
      if (error.message?.includes('Psicólogo no encontrado')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }

  // PUT /api/psicologos/[id] - Update a psicologo
  static async updatePsicologo(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
      if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de psicólogo inválido' }, { status: 400 });
      }

      // Example permission check

      const body = await request.json();
      const updatePsicologoDto = plainToClass(UpdatePsicologoDto, body);

      const errors = await validate(updatePsicologoDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }
      
      if (Object.keys(updatePsicologoDto).length === 0) {
        return NextResponse.json({ success: false, error: 'No se proporcionaron datos para actualizar' }, { status: 400 });
      }

      const psicologoActualizado = await psicologoService.update(id, updatePsicologoDto);
      return NextResponse.json({ success: true, data: psicologoActualizado, message: 'Psicólogo actualizado exitosamente' });

    } catch (error: any) {
      console.error('Error al actualizar psicólogo:', error);
      if (error.message?.includes('Psicólogo no encontrado') || error.message?.includes('La persona especificada no existe')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('Ya existe un psicólogo con este número de licencia') || error.message?.includes('Esta persona ya está asignada a otro psicólogo')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 400 } // Default to 400 for update errors
      );
    }
  }

  // DELETE /api/psicologos/[id] - Delete a psicologo
  static async deletePsicologo(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
       if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de psicólogo inválido' }, { status: 400 });
      }

      // Example permission check
      
      // Optional: Check if psicologo can be deleted (e.g., no active sessions)

      await psicologoService.delete(id);
      return NextResponse.json({ success: true, message: 'Psicólogo eliminado exitosamente' });

    } catch (error: any) {
      console.error('Error al eliminar psicólogo:', error);
      if (error.message?.includes('Psicólogo no encontrado')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      // Handle other specific deletion constraints if necessary
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }
}