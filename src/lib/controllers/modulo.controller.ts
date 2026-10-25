// src/lib/controllers/modulo.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { ModuloService } from '@/services/modulo.service';
import { ModuloRepository } from '@/repositories/modulo.repository';
import { AppDataSource } from '@/lib/database';
// DTOs are correctly imported from @/dto/modulo.dto.ts by the service
import { CreateModuloDto, UpdateModuloDto } from '@/dto/modulo.dto';

// Initialize repository and service
// ModuloRepository constructor expects DataSource directly
const moduloRepository = new ModuloRepository(AppDataSource);
const moduloService = new ModuloService(moduloRepository);

export class ModuloController {

  // GET /api/modulos - Obtener todos los modulos
  static async getAllModulos(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modulos' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      // ModuloService.findAll() does not currently accept filters.
      // const { searchParams } = new URL(request.url);
      // const filters: any = {}; 
      // if (searchParams.get('nombre')) { filters.nombre = searchParams.get('nombre'); }
      
      const modulos = await moduloService.findAll(); // Service method is findAll() and takes no filters
      return NextResponse.json({ success: true, data: modulos });
    } catch (error: any) {
      console.error('Error al obtener modulos:', error);
      // Service throws custom exceptions which might have status code, or check message
      let statusCode = error.statusCode || 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/modulos - Crear modulo
  static async createModulo(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modulos' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createModuloDto: CreateModuloDto = body; // Use DTO
      const nuevoModulo = await moduloService.create(createModuloDto); // Service method is create(dto)
      return NextResponse.json({ success: true, data: nuevoModulo }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear modulo:', error);
      let statusCode = error.statusCode || 400; // Default to Bad Request for service errors
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // ConflictException from service has statusCode 409
      // BadRequestException from service has statusCode 400
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/modulos/[id] - Obtener modulo por ID
  static async getModuloById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modulos' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const modulo = await moduloService.findOne(id); // Service method is findOne(id)
      // Service throws NotFoundException if not found, which should be caught by generic error handler
      return NextResponse.json({ success: true, data: modulo });
    } catch (error: any) {
      console.error('Error al obtener modulo:', error);
      let statusCode = error.statusCode || 500; 
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // NotFoundException from service has statusCode 404
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/modulos/[id] - Actualizar modulo
  static async updateModulo(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modulos' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updateModuloDto: UpdateModuloDto = body; // Use DTO
      const moduloActualizado = await moduloService.update(id, updateModuloDto); // Service method is update(id, dto)
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, data: moduloActualizado });
    } catch (error: any) {
      console.error('Error al actualizar modulo:', error);
      let statusCode = error.statusCode || 400;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // NotFoundException (404), ConflictException (409), BadRequestException (400) handled by error.statusCode
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/modulos/[id] - Eliminar modulo
  static async deleteModulo(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modulos' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      await moduloService.remove(id); // Service method is remove(id)
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, message: 'Modulo eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar modulo:', error);
      let statusCode = error.statusCode || 500;
       if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // NotFoundException (404) handled by error.statusCode
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}