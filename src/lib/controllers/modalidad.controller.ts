// src/lib/controllers/modalidad.controller.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { ModalidadService } from '@/services/modalidad.service';
import { ModalidadRepository } from '@/repositories/modalidad.repository';
import { initializeDatabase } from '@/lib/database';
import { ModalidadEntity } from '@/entities/modalidad.entity';
import { CreateModalidadDto, UpdateModalidadDto } from '@/dto/modalidad.dto';

// Crea el servicio en el momento de usarlo, con la base ya conectada
async function obtenerServicio() {
  const dataSource = await initializeDatabase();
  return new ModalidadService(new ModalidadRepository(dataSource));
}

export class ModalidadController {

  // GET /api/modalidades - Obtener todas las modalidades
  static async getAllModalidades(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modalidades' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      // ModalidadService.getAllModalidades() does not currently accept filters.
      // const { searchParams } = new URL(request.url);
      // const filters: any = {}; 
      // if (searchParams.get('nombre')) { filters.nombre = searchParams.get('nombre'); }
      
      const modalidades = await (await obtenerServicio()).getAllModalidades();
      return NextResponse.json({ success: true, data: modalidades });
    } catch (error: any) {
      console.error('Error al obtener modalidades:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/modalidades - Crear modalidad
  static async createModalidad(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modalidades' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const body = await request.json();
      const createModalidadDto: CreateModalidadDto = body; 
      const nuevaModalidad = await (await obtenerServicio()).createModalidad(createModalidadDto);
      return NextResponse.json({ success: true, data: nuevaModalidad }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear modalidad:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Ya existe una modalidad con este nombre')) statusCode = 409; // Conflict
      else if (error.message?.toLowerCase().includes('errores de validación')) statusCode = 400; // Validation from DTO
      else if (error.message?.toLowerCase().includes('el nombre es requerido')) statusCode = 400;
      
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/modalidades/[id] - Obtener modalidad por ID
  static async getModalidadById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modalidades' && permiso.accion.nombre === 'Ver'
      );
      if (!hasPermission) {
         return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const modalidad = await (await obtenerServicio()).getModalidadById(id);
      // Service method throws error if not found
      return NextResponse.json({ success: true, data: modalidad });
    } catch (error: any) {
      console.error('Error al obtener modalidad:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Modalidad no encontrada')) statusCode = 404;
      else if (error.message?.includes('El ID es requerido')) statusCode = 400;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/modalidades/[id] - Actualizar modalidad
  static async updateModalidad(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modalidades' && permiso.accion.nombre === 'Editar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      const body = await request.json();
      const updateModalidadDto: UpdateModalidadDto = body;
      const modalidadActualizada = await (await obtenerServicio()).updateModalidad(id, updateModalidadDto);
      // Service method throws error if not found
      return NextResponse.json({ success: true, data: modalidadActualizada });
    } catch (error: any) {
      console.error('Error al actualizar modalidad:', error);
      let statusCode = 400; // Default to Bad Request
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Modalidad no encontrada')) statusCode = 404;
      else if (error.message?.includes('Ya existe una modalidad con este nombre')) statusCode = 409; // Conflict
      else if (error.message?.toLowerCase().includes('errores de validación')) statusCode = 400;
      else if (error.message?.includes('El ID es requerido')) statusCode = 400;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/modalidades/[id] - Eliminar modalidad
  static async deleteModalidad(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Modalidades' && permiso.accion.nombre === 'Eliminar'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 });
      }

      const { id } = params;
      await (await obtenerServicio()).deleteModalidad(id); 
      return NextResponse.json({ success: true, message: 'Modalidad eliminada correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar modalidad:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Modalidad no encontrada')) statusCode = 404;
      else if (error.message?.includes('El ID es requerido')) statusCode = 400;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}