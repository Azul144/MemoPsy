// src/lib/controllers/perfil.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { PerfilService } from '@/services/perfil.service';
import { PerfilRepository } from '@/repositories/perfil.repository';
import { AppDataSource } from '@/lib/database';
// PerfilEntity is not directly used here as DTOs are specific and service handles entity mapping
// import { PerfilEntity } from '@/entities/perfil.entity'; 
import { CreatePerfilDto, UpdatePerfilDto } from '@/dto/perfil.dto'; // Using existing DTOs

// Initialize repository and service
// PerfilRepository constructor expects DataSource directly
const perfilRepository = new PerfilRepository(AppDataSource);
const perfilService = new PerfilService(perfilRepository);

export class PerfilController {

  // GET /api/perfiles - Obtener todos los perfiles
  static async getAllPerfiles(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Perfiles' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      // PerfilService.findAll() does not currently accept a filter DTO in its signature.
      // const { searchParams } = new URL(request.url);
      // const filters: any = {}; 
      // if (searchParams.get('nombre')) { filters.nombre = searchParams.get('nombre'); }
      
      const perfiles = await perfilService.findAll(); 
      return NextResponse.json({ success: true, data: perfiles });
    } catch (error: any) {
      console.error('Error al obtener perfiles:', error);
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/perfiles - Crear perfil
  static async createPerfil(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Perfiles' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createPerfilDto: CreatePerfilDto = body; // DTOs do not include permisoIds
      const nuevoPerfil = await perfilService.create(createPerfilDto);
      return NextResponse.json({ success: true, data: nuevoPerfil }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear perfil:', error);
      // Service throws ConflictException (409) or BadRequestException (400)
      const statusCode = error.statusCode || 400; 
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/perfiles/[id] - Obtener perfil por ID
  static async getPerfilById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Perfiles' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      // The service's findById method in PerfilService is named findById, not findOne.
      // It currently does not fetch associated permissions by default.
      const perfil = await perfilService.findById(id); 
      // Service throws NotFoundException if not found, caught by generic handler
      return NextResponse.json({ success: true, data: perfil });
    } catch (error: any) {
      console.error('Error al obtener perfil:', error);
      // Service throws NotFoundException (404)
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/perfiles/[id] - Actualizar perfil
  static async updatePerfil(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Perfiles' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updatePerfilDto: UpdatePerfilDto = body; // DTOs do not include permisoIds
      const perfilActualizado = await perfilService.update(id, updatePerfilDto);
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, data: perfilActualizado });
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      // Service throws NotFoundException (404), ConflictException (409), BadRequestException (400)
      const statusCode = error.statusCode || 400;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/perfiles/[id] - Eliminar perfil
  static async deletePerfil(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Perfiles' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      await perfilService.remove(id); 
      // Service throws NotFoundException if not found
      return NextResponse.json({ success: true, message: 'Perfil eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar perfil:', error);
      // Service throws NotFoundException (404)
      const statusCode = error.statusCode || 500;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}