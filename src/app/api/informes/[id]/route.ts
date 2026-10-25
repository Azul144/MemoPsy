// src/app/api/informes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { conAuditoria } from "@/lib/auditoria/con-auditoria"
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/auth-config'; // Assuming authConfig is in lib
import { initializeDatabase } from '@/lib/database'; // Assuming db-initializer is in lib
import { InformeEntity } from '@/entities/informe.entity';
import { PacienteTieneInformeEntity } from '@/entities/paciente-tiene-informe.entity';
import { PsicologoEntity } from '@/entities/psicologo.entity';
import { PacienteEntity } from '@/entities/paciente.entity';
import { AppDataSource } from '@/lib/database';
import { In } from 'typeorm';

async function manejarGET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id: informeId } = params;
    if (!informeId) {
      return NextResponse.json({ message: 'ID del informe no proporcionado' }, { status: 400 });
    }

    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
    const informeRepository = AppDataSource.getRepository(InformeEntity);
    const pacienteTieneInformeRepository = AppDataSource.getRepository(PacienteTieneInformeEntity);

    const informe = await informeRepository.findOne({
      where: { id: informeId },
      relations: ["psicologo", "psicologo.persona"],
    });

    if (!informe) {
      return NextResponse.json({ message: "Informe no encontrado" }, { status: 404 });
    }

    const pacienteTieneInformes = await pacienteTieneInformeRepository.find({
      where: { informe: { id: informe.id } }, // Corrected to pass informe object
      relations: ["paciente", "paciente.persona"],
    });

    const pacientes = pacienteTieneInformes.map(pti => ({
      id: pti.paciente.id,
      nombre: pti.paciente.persona.nombre,
      apellido: pti.paciente.persona.apellido,
      dni: pti.paciente.persona.dni, // Ensure 'dni' exists on 'persona'
    }));

    const { user } = session;
    // Assuming session.user.permisos is an array of strings directly based on previous files
    // If it's an array of objects like { nombre: 'Permiso' }, adjust accordingly.
    // For now, assuming array of strings as in other route files.
    const userPermissions = user.permisos || [];

    const hasPermission = userPermissions.some((permiso) => permiso.nombre === "Ver Informes");
    if (!hasPermission) {
      return NextResponse.json({ message: "No tiene permisos para ver informes" }, { status: 403 });
    }

    // Psicologo Access: Owns the report
    if (user.psicologoId && informe.psicologo?.id === user.psicologoId) {
      const psicologoResponse = informe.psicologo ? {
        id: informe.psicologo.id,
        nombre: `${informe.psicologo.persona.nombre} ${informe.psicologo.persona.apellido}`
      } : null;
      return NextResponse.json({ ...informe, psicologo: psicologoResponse, pacientes });
    }

    // Paciente Access: Is associated with the report and it's not private
    if (user.pacienteId) {
      const isAssociated = pacientes.some(p => p.id === user.pacienteId);
      if (isAssociated) {
        if (!informe.esPrivado) {
          const psicologoResponse = informe.psicologo ? {
            id: informe.psicologo.id,
            nombre: `${informe.psicologo.persona.nombre} ${informe.psicologo.persona.apellido}`
          } : null;
          return NextResponse.json({ ...informe, psicologo: psicologoResponse, pacientes });
        } else {
          return NextResponse.json({ message: "Este informe es privado y no puede ser accedido por el paciente" }, { status: 403 });
        }
      }
    }
    
    // Admin/General Access with "Ver Informes" but not owner or associated paciente
    // This part depends on how broadly "Ver Informes" should apply for specific reports.
    // If "Ver Informes" allows viewing *any* report (potentially dangerous for privacy if not further restricted),
    // then another check or different permission might be needed (e.g., "Ver Todos los Informes").
    // Current logic: If not owner or correctly associated patient, deny access even with "Ver Informes".
    // This is a safer default. If wider access is needed, this block should be adjusted.
    // For example, an admin might have a specific role or different permission string.
    // For now, if it reaches here, it means the user has "Ver Informes" but isn't the psicologo owner or an authorized paciente.
    // A more specific check for an admin role could be added here if `session.user.roles` includes 'admin' for example.
    // if (user.roles?.includes('Administrador')) { // Example, if roles are part of session
    //   return NextResponse.json({ ...informe, pacientes });
    // }


    return NextResponse.json({ message: "Acceso denegado a este informe específico" }, { status: 403 });

  } catch (error) {
    console.error(`Error en GET /api/informes/${params.id}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}


async function manejarPUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user || !session.user.psicologoId) { // Check for psicologoId directly
      return NextResponse.json({ message: 'No autorizado o rol no válido' }, { status: 401 });
    }

    const hasPermission = session.user.permisos?.some((permiso) => permiso.nombre === 'Editar Informe');
    if (!hasPermission) {
      return NextResponse.json({ message: 'Acceso denegado: Permiso "Editar Informe" requerido' }, { status: 403 });
    }

    const { id: informeId } = params;
    if (!informeId) {
      return NextResponse.json({ message: 'ID del informe no proporcionado en la URL' }, { status: 400 });
    }

    const body = await request.json();
    // RF 2.4 - La nota clínica es siempre privada del psicólogo: lo que se comparte con el
    // paciente va en el informe de seguimiento. Se ignora cualquier otro valor que llegue.
    const { titulo, contenido, pacientesIds, etiquetas } = body;
    const esPrivado = true;

    if (!titulo || !contenido) {
      return NextResponse.json({ message: 'Datos incompletos o inválidos: titulo y contenido son requeridos.' }, { status: 400 });
    }
    if (pacientesIds && (!Array.isArray(pacientesIds) || !pacientesIds.every(id => typeof id === 'string'))) {
        return NextResponse.json({ message: 'pacientesIds debe ser un array de strings.' }, { status: 400 });
    }

    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
    const informeRepository = AppDataSource.getRepository(InformeEntity);
    const pacienteTieneInformeRepository = AppDataSource.getRepository(PacienteTieneInformeEntity);
    const pacienteRepository = AppDataSource.getRepository(PacienteEntity);

    const informeExistente = await informeRepository.findOne({
        where: { id: informeId },
        relations: ['psicologo'] 
    });

    if (!informeExistente) {
      return NextResponse.json({ message: 'Informe no encontrado' }, { status: 404 });
    }

    if (informeExistente.psicologo?.id !== session.user.psicologoId) {
        return NextResponse.json({ message: 'No autorizado para editar este informe. Pertenece a otro psicólogo.' }, { status: 403 });
    }

    informeExistente.titulo = titulo;
    informeExistente.contenido = contenido;
    informeExistente.etiquetas = typeof etiquetas === 'string' && etiquetas.trim() ? etiquetas.trim() : null;
    informeExistente.esPrivado = esPrivado;
    // Add a fechaModificacion if your BaseEntity or InformeEntity supports it
    // informeExistente.fechaModificacion = new Date();

    const informeActualizado = await informeRepository.save(informeExistente);

    // Handle updates to pacientesIds
    // First, remove existing PacienteTieneInformeEntity entries for this informe
    await pacienteTieneInformeRepository.delete({ informe: { id: informeActualizado.id } });

    if (pacientesIds && Array.isArray(pacientesIds) && pacientesIds.length > 0) {
        const existingPacientes = await pacienteRepository.findBy({ id: In(pacientesIds) });
        if(existingPacientes.length !== pacientesIds.length){
            const notFoundIds = pacientesIds.filter(id => !existingPacientes.some(p => p.id === id));
            // Note: The informe itself IS updated. This error means patient associations failed.
            // Depending on desired transactional behavior, this might need adjustment.
            return NextResponse.json({ 
                message: `Pacientes con IDs ${notFoundIds.join(', ')} no encontrados. El informe fue actualizado, pero las asociaciones de pacientes fallaron.`,
                data: informeActualizado // Send updated informe data anyway or handle as a full rollback
            }, { status: 400 });
        }
        
        const nuevasPtiEntities = pacientesIds.map(pacienteId =>
          pacienteTieneInformeRepository.create({
            informe: informeActualizado, // Link to the updated informe
            paciente: { id: pacienteId } as PacienteEntity, // Assign by ID reference
          })
        );
        await pacienteTieneInformeRepository.save(nuevasPtiEntities);
    }
    
    // Refetch to include all relations for the response
    const informeCompletoConRelaciones = await informeRepository.findOne({
        where: { id: informeActualizado.id },
        relations: ['psicologo', 'psicologo.persona']
    });

    const pacientesDelInformeActualizado = await pacienteTieneInformeRepository.find({
        where: { informe: { id: informeActualizado.id } },
        relations: ['paciente', 'paciente.persona']
    });

    const responseData = {
        ...informeCompletoConRelaciones,
        psicologo: informeCompletoConRelaciones?.psicologo ? {
            id: informeCompletoConRelaciones.psicologo.id,
            nombre: `${informeCompletoConRelaciones.psicologo.persona.nombre} ${informeCompletoConRelaciones.psicologo.persona.apellido}`
        } : undefined,
        pacientes: pacientesDelInformeActualizado.map(pti => ({
            id: pti.paciente.id,
            nombre: `${pti.paciente.persona.nombre} ${pti.paciente.persona.apellido}`,
            dni: pti.paciente.persona.dni 
        }))
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`Error en PUT /api/informes/${params.id}:`, error);
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('UQ_')) { // Check for unique constraint errors
        return NextResponse.json({ message: 'Error: Conflicto de datos. Ya existe un recurso con alguna de esta información única.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

// export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
//   // ... implementation ...
// }


// RF 1.4 - Registro de auditoría de esta ruta
export const GET = conAuditoria(manejarGET, { modulo: "Informes", accion: "VER", detalle: "Consulta de una nota clínica" })
export const PUT = conAuditoria(manejarPUT, { modulo: "Informes", accion: "EDITAR", detalle: "Edición de nota clínica" })
