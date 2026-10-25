// lib/controllers/persona.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config'; // Assuming this path is correct
import { PersonaService } from '@/services/persona.service';
import { PersonaRepository } from '@/repositories/persona.repository';
import { AppDataSource } from '@/lib/database'; // Assuming this path is correct
import { 
  CreatePersonaDto, 
  UpdatePersonaDto, 
  PersonaFiltersDto 
} from '@/dto/persona.dto';
import { validate } from 'class-validator'; // For DTO validation
import { plainToClass } from 'class-transformer'; // For DTO transformation

// Initialize service and repository
// Note: In a real-world scenario with dependency injection, these would be provided.
const personaRepository = new PersonaRepository(AppDataSource);
const personaService = new PersonaService(personaRepository);

export class PersonaController {

  // GET /api/personas - Get all personas with optional filters
  static async getAllPersonas(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check (adjust module and action names as needed)
      // const hasPermission = session.user.permisos?.some(
      //   p => p.modulo.nombre === 'Personas' && p.accion.nombre === 'Ver'
      // );
      // if (!hasPermission) {
      //   return NextResponse.json({ success: false, error: 'No tenés permisos para ver personas' }, { status: 403 });
      // }

      const { searchParams } = new URL(request.url);
      const filters = plainToClass(PersonaFiltersDto, Object.fromEntries(searchParams.entries()));
      
      // Validate filters DTO (optional, but good practice)
      const filterErrors = await validate(filters);
      if (filterErrors.length > 0) {
        return NextResponse.json({ success: false, error: 'Filtros inválidos', details: filterErrors }, { status: 400 });
      }

      // Use pagination if available in service, or simple getAll
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);

      if (searchParams.has('page') || searchParams.has('limit')) {
         const result = await personaService.getPersonasWithPagination(page, limit, filters);
         return NextResponse.json({ success: true, data: result.personas, pagination: result.pagination });
      } else {
        const personas = await personaService.getAllPersonas(filters);
        return NextResponse.json({ success: true, data: personas });
      }

    } catch (error: any) {
      console.error('Error al obtener personas:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: error.message.includes('No se encontró') ? 404 : 500 }
      );
    }
  }

  // POST /api/personas - Create a new persona
  static async createPersona(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(
      //   p => p.modulo.nombre === 'Personas' && p.accion.nombre === 'Crear'
      // );
      // if (!hasPermission) {
      //   return NextResponse.json({ success: false, error: 'No tenés permisos para crear personas' }, { status: 403 });
      // }

      const body = await request.json();
      const createPersonaDto = plainToClass(CreatePersonaDto, body);

      const errors = await validate(createPersonaDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }

      const nuevaPersona = await personaService.createPersona(createPersonaDto);
      return NextResponse.json({ success: true, data: nuevaPersona, message: 'Persona creada exitosamente' }, { status: 201 });

    } catch (error: any) {
      console.error('Error al crear persona:', error);
      // Check for specific error messages from service (e.g., duplicate DNI)
      if (error.message.includes('Ya existe una persona con el DNI')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 }); // 409 Conflict
      }
      if (error.message.includes('La fecha de nacimiento no puede ser futura')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 400 } // Default to 400 for creation errors
      );
    }
  }

  // GET /api/personas/[id] - Get a persona by ID
  static async getPersonaById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }
      
      const { id } = params;
      if (!id || typeof id !== 'string') { // Basic check for UUID format can be added
          return NextResponse.json({ success: false, error: 'ID de persona inválido' }, { status: 400 });
      }

      // Example permission check (users might be able to see their own persona data or need specific permission)
      // const canViewOwn = session.user.personaId === id; // Hypothetical field
      // const hasGeneralViewPermission = session.user.permisos?.some(
      //   p => p.modulo.nombre === 'Personas' && p.accion.nombre === 'Ver'
      // );
      // if (!canViewOwn && !hasGeneralViewPermission) {
      //   return NextResponse.json({ success: false, error: 'No tenés permisos para ver esta persona' }, { status: 403 });
      // }

      const persona = await personaService.getPersonaById(id);
      if (!persona) {
        return NextResponse.json({ success: false, error: 'Persona no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: persona });

    } catch (error: any) {
      console.error('Error al obtener persona por ID:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }

  // PUT /api/personas/[id] - Update a persona
  static async updatePersona(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
       if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de persona inválido' }, { status: 400 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(
      //   p => p.modulo.nombre === 'Personas' && p.accion.nombre === 'Editar'
      // );
      // if (!hasPermission) {
      //   return NextResponse.json({ success: false, error: 'No tenés permisos para editar personas' }, { status: 403 });
      // }

      const body = await request.json();
      const updatePersonaDto = plainToClass(UpdatePersonaDto, body);

      const errors = await validate(updatePersonaDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(err => Object.values(err.constraints || {})).flat();
        return NextResponse.json({ success: false, error: 'Datos de entrada inválidos', details: errorMessages }, { status: 400 });
      }
      
      if (Object.keys(updatePersonaDto).length === 0) {
        return NextResponse.json({ success: false, error: 'No se proporcionaron datos para actualizar' }, { status: 400 });
      }

      const personaActualizada = await personaService.updatePersona(id, updatePersonaDto);
      if (!personaActualizada) {
        return NextResponse.json({ success: false, error: 'Persona no encontrada o no se pudo actualizar' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: personaActualizada, message: 'Persona actualizada exitosamente' });

    } catch (error: any) {
      console.error('Error al actualizar persona:', error);
      if (error.message.includes('No se encontró una persona con el ID')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      if (error.message.includes('Ya existe una persona con el DNI')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }
      if (error.message.includes('La fecha de nacimiento no puede ser futura')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 400 } // Default to 400 for update errors
      );
    }
  }

  // DELETE /api/personas/[id] - Delete a persona
  static async deletePersona(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
      }

      const { id } = params;
       if (!id || typeof id !== 'string') {
          return NextResponse.json({ success: false, error: 'ID de persona inválido' }, { status: 400 });
      }

      // Example permission check
      // const hasPermission = session.user.permisos?.some(
      //   p => p.modulo.nombre === 'Personas' && p.accion.nombre === 'Eliminar'
      // );
      // if (!hasPermission) {
      //   return NextResponse.json({ success: false, error: 'No tenés permisos para eliminar personas' }, { status: 403 });
      // }

      const fueEliminada = await personaService.deletePersona(id);
      if (!fueEliminada) {
        // This might happen if the service's deletePersona throws an error for "not found" before returning false
        return NextResponse.json({ success: false, error: 'Persona no encontrada o no se pudo eliminar' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Persona eliminada exitosamente' });

    } catch (error: any) {
      console.error('Error al eliminar persona:', error);
      if (error.message.includes('No se encontró una persona con el ID')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }
}