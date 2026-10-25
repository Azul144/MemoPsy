// src/lib/controllers/permiso.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { PermisoService } from '@/services/permiso.service';
import { PermisoRepository } from '@/repositories/permiso.repository';
import { ModuloRepository } from '@/repositories/modulo.repository';
import { AccionRepository } from '@/repositories/accion.repository';
import { AppDataSource } from '@/lib/database';
// DTOs are used from @/dto/permiso.dto.ts by the service for request validation and by controller for type hints
import { CreatePermisoDto, UpdatePermisoDto } from '@/dto/permiso.dto';

// Initialize repositories and service
// All these repositories expect DataSource directly based on their constructors
const permisoRepository = new PermisoRepository(AppDataSource);
const moduloRepository = new ModuloRepository(AppDataSource);
const accionRepository = new AccionRepository(AppDataSource);

const permisoService = new PermisoService(permisoRepository, moduloRepository, accionRepository);

export class PermisoController {

  // GET /api/permisos - Obtener todos los permisos
  static async getAllPermisos(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Permisos' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      // PermisoService.findAll() does not currently accept a filter DTO.
      // const { searchParams } = new URL(request.url);
      // const filters: any = {}; 
      // if (searchParams.get('nombre')) { filters.nombre = searchParams.get('nombre'); }
      // if (searchParams.get('moduloId')) { filters.moduloId = searchParams.get('moduloId'); }
      // if (searchParams.get('accionId')) { filters.accionId = searchParams.get('accionId'); }
      
      const permisos = await permisoService.findAll(); // Service method is findAll()
      return NextResponse.json({ success: true, data: permisos });
    } catch (error: any) {
      console.error('Error al obtener permisos:', error);
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/permisos - Crear permiso
  static async createPermiso(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Permisos' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createPermisoDto: CreatePermisoDto = body; 
      const nuevoPermiso = await permisoService.create(createPermisoDto); // Service method is create(dto)
      return NextResponse.json({ success: true, data: nuevoPermiso }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear permiso:', error);
      // Service throws ConflictException (409), NotFoundException (404 for modulo/accion), BadRequestException (400)
      const statusCode = error.statusCode || 400; 
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/permisos/[id] - Obtener permiso por ID
  static async getPermisoById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Permisos' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      // The service's findById method in PermisoService is named findById.
      // Repository fetches relations, and service maps them to DTO.
      const permiso = await permisoService.findById(id); 
      // Service throws NotFoundException if not found, caught by generic handler
      return NextResponse.json({ success: true, data: permiso });
    } catch (error: any) {
      console.error('Error al obtener permiso:', error);
      // Service throws NotFoundException (404)
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/permisos/[id] - Actualizar permiso
  static async updatePermiso(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Permisos' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updatePermisoDto: UpdatePermisoDto = body;
      const permisoActualizado = await permisoService.update(id, updatePermisoDto); // Service method is update(id, dto)
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, data: permisoActualizado });
    } catch (error: any) {
      console.error('Error al actualizar permiso:', error);
      // Service throws NotFoundException (404), ConflictException (409), BadRequestException (400)
      const statusCode = error.statusCode || 400;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/permisos/[id] - Eliminar permiso
  static async deletePermiso(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Permisos' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      await permisoService.remove(id); // Service method is remove(id)
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, message: 'Permiso eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar permiso:', error);
      // Service throws NotFoundException (404)
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}