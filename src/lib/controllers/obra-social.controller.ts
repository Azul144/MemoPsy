// src/lib/controllers/obra-social.controller.ts
// Controlador de las obras sociales (patrón Repositorio, apartado 8.4.2 del TIF).
// Recibe el pedido desde la ruta de la API, controla la sesión y delega las reglas de negocio en ObraSocialService.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { ObraSocialService } from '@/services/obra-social.service';
import { ObraSocialRepository } from '@/repositories/obra-social.repository';
import { AppDataSource } from '@/lib/database';
import { ObraSocialEntity } from '@/entities/obra-social.entity';
import { CreateObraSocialDto, UpdateObraSocialDto, ObraSocialFiltersDto } from '@/dto/obra-social.dto';

// Initialize repository and service
const typeOrmObraSocialRepository = AppDataSource.getRepository(ObraSocialEntity);
const obraSocialRepository = new ObraSocialRepository(typeOrmObraSocialRepository);
const obraSocialService = new ObraSocialService(obraSocialRepository);

export class ObraSocialController {

  // GET /api/obras-sociales - Obtener todas las obras sociales
  static async getAllObrasSociales(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'ObrasSociales' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const filters: ObraSocialFiltersDto = {}; 
      if (searchParams.get('nombre')) { 
        filters.nombre = searchParams.get('nombre')!; 
      }
      if (searchParams.has('activo')) {
        filters.activo = searchParams.get('activo') === 'true';
      }
      
      const obrasSociales = await obraSocialService.getAllObrasSociales(filters);
      return NextResponse.json({ success: true, data: obrasSociales });
    } catch (error: any) {
      console.error('Error al obtener obras sociales:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/obras-sociales - Crear obra social
  static async createObraSocial(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'ObrasSociales' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createObraSocialDto: CreateObraSocialDto = body; 
      const nuevaObraSocial = await obraSocialService.createObraSocial(createObraSocialDto);
      return NextResponse.json({ success: true, data: nuevaObraSocial }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear obra social:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Ya existe una obra social con el nombre')) statusCode = 409; // Conflict
      // Add other specific error message checks if needed, e.g., for validation errors from model
      
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/obras-sociales/[id] - Obtener obra social por ID
  static async getObraSocialById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'ObrasSociales' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const obraSocial = await obraSocialService.getObraSocialById(id);
      if (!obraSocial) { // Service returns null if not found
        return NextResponse.json({ success: false, error: 'Obra Social no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: obraSocial });
    } catch (error: any) {
      console.error('Error al obtener obra social:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      // The service itself doesn't throw a specific "not found" error, it returns null.
      // So, the 404 is handled by the explicit check above.
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/obras-sociales/[id] - Actualizar obra social
  static async updateObraSocial(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'ObrasSociales' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updateObraSocialDto: UpdateObraSocialDto = body;
      const obraSocialActualizada = await obraSocialService.updateObraSocial(id, updateObraSocialDto);
      if (!obraSocialActualizada) { // Service returns null or throws if not found/failed
         return NextResponse.json({ success: false, error: 'Obra Social no encontrada para actualizar o error en actualización' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: obraSocialActualizada });
    } catch (error: any) {
      console.error('Error al actualizar obra social:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('No se encontró una obra social con el ID')) statusCode = 404;
      else if (error.message?.includes('Ya existe una obra social con el nombre')) statusCode = 409; // Conflict
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/obras-sociales/[id] - Eliminar obra social
  static async deleteObraSocial(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'ObrasSociales' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const deleted = await obraSocialService.deleteObraSocial(id); 
      if (!deleted) { // Service returns false or throws if not found/failed
        return NextResponse.json({ success: false, error: 'Obra Social no encontrada para eliminar o error en eliminación' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Obra Social eliminada correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar obra social:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('No se encontró una obra social con el ID')) statusCode = 404;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}