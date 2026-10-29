// src/lib/controllers/accion.controller.ts
// Controlador de las acciones (patrón Repositorio, apartado 8.4.2 del TIF).
// Recibe el pedido desde la ruta de la API, controla la sesión y delega las reglas de negocio en AccionService.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { AccionService } from '@/services/accion.service';
import { AccionRepository } from '@/repositories/accion.repository';
import { AppDataSource } from '@/lib/database';
import { CreateAccionDto, UpdateAccionDto } from '@/dto/accion.dto'; // Using existing DTOs

// Initialize repository and service
const accionRepository = new AccionRepository(AppDataSource);
const accionService = new AccionService(accionRepository);

export class AccionController {

  // GET /api/acciones - Obtener todas las acciones
  static async getAllAcciones() {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Acciones' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      // AccionService.findAll() does not currently accept filters.
      
      const acciones = await accionService.findAll(); // Changed from getAllAcciones(filters)
      return NextResponse.json({ success: true, data: acciones });
    } catch (error: any) {
      console.error('Error al obtener acciones:', error);
      let statusCode = 500;
      if (error.message.includes('No autorizado')) statusCode = 401;
      if (error.message.includes('No tenés permisos')) statusCode = 403;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/acciones - Crear acción
  static async createAccion(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Acciones' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createAccionDto: CreateAccionDto = body; // Use DTO
      const nuevaAccion = await accionService.create(createAccionDto); // Changed from createAccion
      return NextResponse.json({ success: true, data: nuevaAccion }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear acción:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message.includes('No autorizado')) statusCode = 401;
      else if (error.message.includes('No tenés permisos')) statusCode = 403;
      else if (error.message.includes('Ya existe una acción con el nombre')) statusCode = 409; // Conflict
      else if (error.message.includes('El nombre no puede estar vacío')) statusCode = 400; // Bad Request from model validation
      
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/acciones/[id] - Obtener acción por ID
  static async getAccionById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Acciones' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const accion = await accionService.findOne(id); // Changed from getAccionById
      if (!accion) { // Service throws NotFoundException, so this might not be hit often here
        return NextResponse.json({ success: false, error: 'Acción no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: accion });
    } catch (error: any) {
      console.error('Error al obtener acción:', error);
      let statusCode = 500;
      if (error.message.includes('No autorizado')) statusCode = 401;
      else if (error.message.includes('No tenés permisos')) statusCode = 403;
      else if (error.message.includes('no encontrada')) statusCode = 404; // From NotFoundException
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/acciones/[id] - Actualizar acción
  static async updateAccion(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Acciones' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updateAccionDto: UpdateAccionDto = body; // Use DTO
      const accionActualizada = await accionService.update(id, updateAccionDto); // Changed from updateAccion
      // Service throws NotFoundException if not found, so this check might not be hit.
      if (!accionActualizada) { 
        return NextResponse.json({ success: false, error: 'Acción no encontrada para actualizar' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: accionActualizada });
    } catch (error: any) {
      console.error('Error al actualizar acción:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message.includes('No autorizado')) statusCode = 401;
      else if (error.message.includes('No tenés permisos')) statusCode = 403;
      else if (error.message.includes('no encontrada')) statusCode = 404; // From NotFoundException
      else if (error.message.includes('Ya existe otra acción con el nombre')) statusCode = 409; // Conflict
      else if (error.message.includes('El nombre no puede estar vacío')) statusCode = 400; // Bad Request from model validation
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/acciones/[id] - Eliminar acción
  static async deleteAccion(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Acciones' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      await accionService.remove(id); // Changed from deleteAccion. Service throws NotFoundException.
      return NextResponse.json({ success: true, message: 'Acción eliminada correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar acción:', error);
      let statusCode = 500;
      if (error.message.includes('No autorizado')) statusCode = 401;
      else if (error.message.includes('No tenés permisos')) statusCode = 403;
      else if (error.message.includes('no encontrada')) statusCode = 404; // From NotFoundException
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}