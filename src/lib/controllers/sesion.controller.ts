// lib/controllers/sesion.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { AppDataSource } from '@/lib/database';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

// Service Imports
import { SesionService } from '@/services/sesion.service';
import { PsicologoService } from '@/services/psicologo.service';
import { ModalidadService } from '@/services/modalidad.service';
import { EstadoService } from '@/services/estado.service';

// Repository Imports
import { SesionRepository } from '@/repositories/sesion.repository';
import { PsicologoRepository } from '@/repositories/psicologo.repository';
import { PersonaRepository } from '@/repositories/persona.repository'; // Dependency for PsicologoService
import { ModalidadRepository } from '@/repositories/modalidad.repository';
import { EstadoRepository } from '@/repositories/estado.repository';

// DTO Imports
import { 
  CreateSesionDto, 
  UpdateSesionDto, 
  SesionQueryDto 
} from '@/dto/sesion.dto';

// Instantiate Repositories
const personaRepository = new PersonaRepository(AppDataSource);
const psicologoRepository = new PsicologoRepository(AppDataSource);
const modalidadRepository = new ModalidadRepository(AppDataSource);
const estadoRepository = new EstadoRepository(AppDataSource);
const sesionRepository = new SesionRepository(AppDataSource);

// Instantiate Services
// These services might have their own dependencies not shown here if they were more complex
const psicologoService = new PsicologoService(psicologoRepository, personaRepository);
const modalidadService = new ModalidadService(modalidadRepository); // Assuming ModalidadService constructor
const estadoService = new EstadoService(estadoRepository);       // Assuming EstadoService constructor
const sesionService = new SesionService(sesionRepository, psicologoService, modalidadService, estadoService);

export class SesionController {

  // POST /api/sesiones - Create a new sesion
  static async createSesion(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(p => p.modulo.nombre === 'Sesiones' && p.accion.nombre === 'Crear');
      // if (!hasPermission) return NextResponse.json({ success: false, error: 'No tenés permisos' }, { status: 403 });

      const body = await request.json();
      const createSesionDto = plainToClass(CreateSesionDto, body);

      const errors = await validate(createSesionDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }

      const nuevaSesion = await sesionService.createSesion(createSesionDto);
      return NextResponse.json({ success: true, data: nuevaSesion, message: 'Sesión creada exitosamente' }, { status: 201 });

    } catch (error: any) {
      console.error('Error al crear sesión:', error);
      if (error.message?.includes('El psicólogo ya tiene una sesión programada en ese horario')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict
      }
      if (error.message?.includes('no existe') || error.message?.includes('especificado no existe')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 }); // Related entity not found
      }
      if (error.message?.includes('Errores de validación') || error.message?.includes('debe ser anterior') || error.message?.includes('no son válidas')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }

  // GET /api/sesiones - Get all sesiones with filters and pagination
  static async getAllSesiones(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(p => p.modulo.nombre === 'Sesiones' && p.accion.nombre === 'Ver');
      // if (!hasPermission) return NextResponse.json({ success: false, error: 'No tenés permisos' }, { status: 403 });

      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());
      // Parse page and limit to numbers, provide defaults
      const page = parseInt(queryParams.page || '1', 10);
      const limit = parseInt(queryParams.limit || '10', 10);
      //queryParams.page = parseInt(queryParams.page || '1', 10);
      //queryParams.limit = parseInt(queryParams.limit || '10', 10);
      
      const queryDto = plainToClass(SesionQueryDto, { ...queryParams, page, limit }, { enableImplicitConversion: true });
      
      const errors = await validate(queryDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Filtros inválidos', details: errorMessages }, { status: 400 });
      }
      
      const paginatedResult = await sesionService.getAllSesiones(queryDto);
      return NextResponse.json({ success: true, ...paginatedResult });

    } catch (error: any) {
      console.error('Error al obtener sesiones:', error);
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }

  // GET /api/sesiones/[id] - Get a sesion by ID
  static async getSesionById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }
      
      const { id } = params;
      if (!id || typeof id !== 'string') { 
          return NextResponse.json({ success: false, error: 'ID de sesión inválido' }, { status: 400 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(p => p.modulo.nombre === 'Sesiones' && p.accion.nombre === 'Ver');
      // if (!hasPermission) { ... }

      const sesion = await sesionService.getSesionById(id);
      return NextResponse.json({ success: true, data: sesion });

    } catch (error: any) {
      console.error('Error al obtener sesión por ID:', error);
      if (error.message?.includes('Sesión no encontrada')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('El ID es requerido')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }

  // PUT /api/sesiones/[id] - Update a sesion
  static async updateSesion(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
      if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de sesión inválido' }, { status: 400 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(p => p.modulo.nombre === 'Sesiones' && p.accion.nombre === 'Editar');
      // if (!hasPermission) { ... }

      const body = await request.json();
      const updateSesionDto = plainToClass(UpdateSesionDto, body);
      
      const errors = await validate(updateSesionDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }
      
      if (Object.keys(updateSesionDto).length === 0) {
        return NextResponse.json({ success: false, error: 'No se proporcionaron datos para actualizar' }, { status: 400 });
      }

      const sesionActualizada = await sesionService.updateSesion(id, updateSesionDto);
      return NextResponse.json({ success: true, data: sesionActualizada, message: 'Sesión actualizada exitosamente' });

    } catch (error: any) {
      console.error('Error al actualizar sesión:', error);
      if (error.message?.includes('Sesión no encontrada') || error.message?.includes('no existe') || error.message?.includes('especificado no existe')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('El psicólogo ya tiene una sesión programada en ese horario')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // Conflict
      }
      if (error.message?.includes('Errores de validación') || error.message?.includes('debe ser anterior') || error.message?.includes('no son válidas') || error.message?.includes('El ID es requerido')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }

  // DELETE /api/sesiones/[id] - Delete a sesion (soft delete)
  static async deleteSesion(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
       if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de sesión inválido' }, { status: 400 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(p => p.modulo.nombre === 'Sesiones' && p.accion.nombre === 'Eliminar');
      // if (!hasPermission) { ... }

      await sesionService.deleteSesion(id);
      return NextResponse.json({ success: true, message: 'Sesión eliminada exitosamente' });

    } catch (error: any) {
      console.error('Error al eliminar sesión:', error);
      if (error.message?.includes('Sesión no encontrada')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('El ID es requerido')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }
  
  // GET /api/sesiones/psicologo/[psicologoId] - Get sesiones by psicologoId
  static async getSesionesByPsicologo(request: NextRequest, { params }: { params: { psicologoId: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { psicologoId } = params;
      if (!psicologoId || typeof psicologoId !== 'string') {
        return NextResponse.json({ success: false, error: 'ID de psicólogo inválido' }, { status: 400 });
      }
      
      // Permission check: users might only see their own sessions or need specific role
      // if (session.user.role !== 'admin' && session.user.psicologoId !== psicologoId) {
      //    return NextResponse.json({ success: false, error: 'No autorizado para ver estas sesiones' }, { status: 403 });
      // }

      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());
      const page = parseInt(queryParams.page || '1', 10);
      const limit = parseInt(queryParams.limit || '10', 10);
      //queryParams.page = parseInt(queryParams.page || '1', 10);
      //queryParams.limit = parseInt(queryParams.limit || '10', 10);
      
      const queryDto = plainToClass(SesionQueryDto, { ...queryParams, page, limit }, { enableImplicitConversion: true });
      
      const errors = await validate(queryDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Filtros inválidos', details: errorMessages }, { status: 400 });
      }

      const paginatedResult = await sesionService.getSesionesByPsicologo(psicologoId, queryDto);
      return NextResponse.json({ success: true, ...paginatedResult });

    } catch (error: any) {
      console.error('Error al obtener sesiones por psicólogo:', error);
      if (error.message?.includes('El psicólogo especificado no existe')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message?.includes('El ID del psicólogo es requerido')) {
         return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
  }
}