// src/lib/controllers/informe.controller.ts
// Controlador de las notas clínicas (informes) (patrón Repositorio, apartado 8.4.2 del TIF).
// Recibe el pedido desde la ruta de la API, controla la sesión y delega las reglas de negocio en InformeService.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth/auth-config';
import { InformeService } from '@/services/informe.service';
import { InformeRepository } from '@/repositories/informe.repository';
import { PsicologoRepository } from '@/repositories/psicologo.repository'; // For InformeService constructor
import { AppDataSource } from '@/lib/database';
import { CreateInformeDto, UpdateInformeDto, InformeQueryDto, InformeResponseDto } from '@/dto/informe.dto';

// Initialize repositories and service
const informeRepository = new InformeRepository(AppDataSource);
const psicologoRepository = new PsicologoRepository(AppDataSource); // InformeService needs this
const informeService = new InformeService(informeRepository, psicologoRepository);
//const psicologoService = new PsicologoRepository(AppDataSource); // For psicologoService in updateInforme

export class InformeController {

  // GET /api/informes - Obtener todos los informes
  static async getAllInformes(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      // Users with 'Ver' permission for 'Informes' module can see all non-private informes
      // or all informes if they have a specific "view all" role (not implemented here).
      // Individual psicologos will see their own informes regardless of this permission via a different route or filter.
      const hasGenericViewPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Informes' && permiso.accion.nombre === 'Ver'
      );

      const { searchParams } = new URL(request.url);
      const queryDto = new InformeQueryDto();

      if (searchParams.get('titulo')) queryDto.titulo = searchParams.get('titulo')!;
      if (searchParams.get('contenido')) queryDto.contenido = searchParams.get('contenido')!;
      if (searchParams.get('psicologoId')) queryDto.psicologoId = searchParams.get('psicologoId')!;
      if (searchParams.has('esPrivado')) queryDto.esPrivado = searchParams.get('esPrivado') === 'true';
      if (searchParams.get('fechaDesde')) queryDto.fechaDesde = searchParams.get('fechaDesde')!;
      if (searchParams.get('fechaHasta')) queryDto.fechaHasta = searchParams.get('fechaHasta')!;
      if (searchParams.get('nombrePsicologo')) queryDto.nombrePsicologo = searchParams.get('nombrePsicologo')!;
      if (searchParams.get('apellidoPsicologo')) queryDto.apellidoPsicologo = searchParams.get('apellidoPsicologo')!;
      if (searchParams.get('especialidadPsicologo')) queryDto.especialidadPsicologo = searchParams.get('especialidadPsicologo')!;
      if (searchParams.get('sortBy')) queryDto.sortBy = searchParams.get('sortBy') as InformeQueryDto['sortBy'];
      if (searchParams.get('sortOrder')) queryDto.sortOrder = searchParams.get('sortOrder') as InformeQueryDto['sortOrder'];
      if (searchParams.get('page')) queryDto.page = parseInt(searchParams.get('page')!, 10);
      if (searchParams.get('limit')) queryDto.limit = parseInt(searchParams.get('limit')!, 10);

      // Get the psychologist by persona ID
      const psicologo = await psicologoRepository.findByPersonaId(session.user.persona.id);
      if (!psicologo) {
        return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
      }

      // If user does not have generic 'Informes/Ver' permission, restrict to their own informes.
      // Also, non-admin users should not see private reports of others.
      if (!hasGenericViewPermission) {
        if (!psicologo.id) { // User is not a psicologo or psicologoId is not in session
             return NextResponse.json({ error: 'No tenés permisos para ver informes.' }, { status: 403 });
        }
        queryDto.psicologoId = psicologo.id; // Filter by psicologoId from session
        // Non-admins cannot see private reports of others, this is implicitly handled if psicologoId is set to self.
        // If they are querying for *another* psicologoId without generic view, it's forbidden.
        if (searchParams.get('psicologoId') && searchParams.get('psicologoId') !== psicologo.id) {
            return NextResponse.json({ error: 'No tenés permisos para ver informes de otros psicólogos.' }, { status: 403 });
        }
      } else {
        // User has 'Informes/Ver' (e.g., an admin). They can see all informes.
        // However, if they filter by esPrivado=false, they should only see public ones.
        // If esPrivado is not specified in query, they see all (public and private of others).
        // If esPrivado is true, they see private ones.
      }
      
      const informesResult = await informeService.findAll(queryDto);
      return NextResponse.json({ success: true, data: informesResult });
    } catch (error: any) {
      console.error('Error al obtener informes:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // POST /api/informes - Crear informe
  static async createInforme(request: NextRequest) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) { // Ensure user is a psicologo
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      // Get the psychologist by persona ID
      const psicologo = await psicologoRepository.findByPersonaId(session.user.persona.id);
      if (!psicologo) {
        return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
      }
      
      const hasPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Informes' && permiso.accion.nombre === 'Crear'
      );
      if (!hasPermission) {
        return NextResponse.json({ error: 'No tenés permisos para crear informes' }, { status: 403 });
      }

      const body = await request.json();
      
      // Auto-fill psicologoId from session if not provided or if user is not admin trying to set it for someone else
      // For simplicity, if a non-admin user creates an informe, it's for themselves.
      // Admins with "Crear" might be able to specify psicologoId. This depends on policy.
      // Current DTO requires psicologoId.
      if (!body.psicologoId) {
        body.psicologoId = psicologo.id; // Use the psicologoId from the session's psicologo
      } else if (body.psicologoId !== psicologo.id) {
        // Check if user is an admin or has special permission to create for others
        const canCreateForOthers = session.user.permisos?.some(
            (p: any) => p.modulo.nombre === 'Informes' && p.accion.nombre === 'CrearParaOtros' // Example permission
        );
        if (!canCreateForOthers) {
            return NextResponse.json({ error: 'No podés crear informes para otros psicólogos.' }, { status: 403 });
        }
      }

      const createInformeDto: CreateInformeDto = body;
      const nuevoInforme = await informeService.create(createInformeDto);
      return NextResponse.json({ success: true, data: nuevoInforme }, { status: 201 });
    } catch (error: any) {
      console.error('Error al crear informe:', error);
      let statusCode = 400;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('El psicólogo especificado no existe')) statusCode = 404; // Not found for psicologoId
      else if (error.message?.toLowerCase().includes('unique constraint') || error.message?.toLowerCase().includes('ya existe')) statusCode = 409;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // GET /api/informes/[id] - Obtener informe por ID
  static async getInformeById(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      // Get the psychologist by persona ID
      const psicologo = await psicologoRepository.findByPersonaId(session.user.persona.id);
      if (!psicologo) {
        return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
      }

      const { id } = params;
      const informe : InformeResponseDto = await informeService.findById(id); // Service throws if not found
      
      // informe.psicologo will be populated by the service's mapToResponseDto
      const isOwnInforme = psicologo.id && informe.psicologo?.id === psicologo.id;

      const hasGenericViewPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Informes' && permiso.accion.nombre === 'Ver'
      );

      if (!hasGenericViewPermission && !isOwnInforme) {
         return NextResponse.json({ error: 'No tenés permisos para ver este informe' }, { status: 403 });
      }
      
      // If it's not their own informe, and it's private, they need special permission or role (e.g. admin)
      if (!isOwnInforme && informe.esPrivado && !hasGenericViewPermission) { // Re-check, hasGenericViewPermission might be too broad for private
        const canViewPrivateAll = session.user.permisos?.some( (p:any) => p.modulo.nombre === 'Informes' && p.accion.nombre === 'VerPrivadosTodos');
        if (!canViewPrivateAll) {
            return NextResponse.json({ error: 'No tenés permisos para ver este informe privado' }, { status: 403 });
        }
      }
          
      return NextResponse.json({ success: true, data: informe });
    } catch (error: any) {
      console.error('Error al obtener informe:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Informe no encontrado')) statusCode = 404;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // PUT /api/informes/[id] - Actualizar informe
  static async updateInforme(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      
      if (!session?.user) { //|| !session.user.psicologoId
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      // Get the psychologist by persona ID
      const psicologo = await psicologoRepository.findByPersonaId(session.user.persona.id);
      if (!psicologo) {
        return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
      }

      const { id } = params;
      const informeToUpdate : InformeResponseDto = await informeService.findById(id); // Service throws if not found

      const isOwnInforme = informeToUpdate.psicologo?.id === psicologo.id;
      const hasGenericEditPermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Informes' && permiso.accion.nombre === 'Editar'
      );

      if (!hasGenericEditPermission && !isOwnInforme) {
        return NextResponse.json({ error: 'No tenés permisos para actualizar este informe' }, { status: 403 });
      }

      const body = await request.json();
      const updateInformeDto: UpdateInformeDto = body;

      // If psicologoId is being changed, ensure user has permission to do so (e.g. admin)
      if (updateInformeDto.psicologoId && updateInformeDto.psicologoId !== informeToUpdate.psicologo?.id) {
        const canChangeOwner = session.user.permisos?.some(
            (p: any) => p.modulo.nombre === 'Informes' && p.accion.nombre === 'CambiarPropietario' // Example permission
        );
        if (!canChangeOwner) {
            return NextResponse.json({ error: 'No tenés permisos para cambiar el psicólogo de este informe.' }, { status: 403 });
        }
      }
      
      const informeActualizado = await informeService.update(id, updateInformeDto);
      return NextResponse.json({ success: true, data: informeActualizado });
    } catch (error: any) {
      console.error('Error al actualizar informe:', error);
      let statusCode = 400;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Informe no encontrado')) statusCode = 404;
      else if (error.message?.includes('El psicólogo especificado no existe')) statusCode = 404;
      else if (error.message?.toLowerCase().includes('unique constraint') || error.message?.toLowerCase().includes('ya existe')) statusCode = 409;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }

  // DELETE /api/informes/[id] - Eliminar informe
  static async deleteInforme(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const session = await getServerSession(authConfig);
      if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      // Get the psychologist by persona ID
      const psicologo = await psicologoRepository.findByPersonaId(session.user.persona.id);
      if (!psicologo) {
        return NextResponse.json({ error: 'No es un psicólogo autorizado' }, { status: 401 });
      }

      const { id } = params;
      const informeToDelete : InformeResponseDto = await informeService.findById(id); // Service throws if not found
      
      const isOwnInforme = informeToDelete.psicologo?.id === psicologo.id;
      const hasGenericDeletePermission = session.user.permisos?.some(
        (permiso: any) => permiso.modulo.nombre === 'Informes' && permiso.accion.nombre === 'Eliminar'
      );
      
      if (!hasGenericDeletePermission && !isOwnInforme) {
        return NextResponse.json({ error: 'No tenés permisos para eliminar este informe' }, { status: 403 });
      }

      await informeService.delete(id); 
      return NextResponse.json({ success: true, message: 'Informe eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar informe:', error);
      let statusCode = 500;
      if (error.message?.includes('No autorizado')) statusCode = 401;
      else if (error.message?.includes('No tenés permisos')) statusCode = 403;
      else if (error.message?.includes('Informe no encontrado')) statusCode = 404;
      return NextResponse.json({ success: false, error: error.message || 'Error interno del servidor' }, { status: statusCode });
    }
  }
}