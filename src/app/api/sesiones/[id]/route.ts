// src/app/api/sesiones/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/lib/auth/auth-config";
import { initializeDatabase } from "@/lib/database";
import { SesionEntity, PacienteTieneSesionEntity, PsicologoEntity, ModalidadEntity, EstadoEntity } from "@/entities";
import { ZodError, z } from "zod";

// Zod schema for validation
const updateSesionSchema = z.object({
  fechaHoraInicio: z.string().datetime({ message: "Invalid datetime string for fechaHoraInicio" }),
  fechaHoraFin: z.string().datetime({ message: "Invalid datetime string for fechaHoraFin" }),
  psicologoId: z.number().int().positive({ message: "Invalid psicologoId" }), // ✅ Acepta enteros positivos
  modalidadId: z.number().int().positive({ message: "Invalid modalidadId" }), // ✅ Acepta enteros positivos
  estadoId: z.number().int().positive({ message: "Invalid estadoId" }), // ✅ Acepta enteros positivos
  pacientesIds: z.array(z.number().int().positive({ message: "Invalid pacienteId" })).optional(), // ✅ Array de enteros positivos
});

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const session = await getServerSession(authConfig);
    const { id } = params;

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || [];
    if (!userPermissions.includes("Ver Sesiones")) { // Or a more specific permission if available
      return NextResponse.json({ error: "Sin permisos para ver la sesión" }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: "ID de sesión es requerido" }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const sesionRepository = dataSource.getRepository(SesionEntity);
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity);

    const sesionEntity = await sesionRepository.findOne({
      where: { id },
      relations: ["psicologo", "psicologo.persona", "modalidad", "estado"],
    });

    if (!sesionEntity) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    // Transform similar to the GET all route
    const pacienteTieneSesiones = await pacienteTieneSesionRepository.find({
        where: { sesionId: sesionEntity.id },
        relations: ["paciente", "paciente.persona"],
    });

    const pacientesAsociados = pacienteTieneSesiones
        .map((ptsEntity) => {
            if (!ptsEntity || !ptsEntity.paciente || !ptsEntity.paciente.id) return null;
            return {
                id: ptsEntity.paciente.id,
                persona: {
                    nombre: ptsEntity.paciente.persona?.nombre || 'N/A',
                    apellido: ptsEntity.paciente.persona?.apellido || 'N/A',
                },
            };
        })
        .filter(Boolean);

    const sesionTransformada = {
        id: sesionEntity.id,
        fechaHoraInicio: sesionEntity.fechaHoraInicio?.toISOString() || null,
        fechaHoraFin: sesionEntity.fechaHoraFin?.toISOString() || null,
        psicologo: sesionEntity.psicologo
            ? {
                id: sesionEntity.psicologo.id,
                persona: {
                    nombre: sesionEntity.psicologo.persona?.nombre || 'N/A',
                    apellido: sesionEntity.psicologo.persona?.apellido || 'N/A',
                },
                }
            : null,
        modalidad: sesionEntity.modalidad
            ? { id: sesionEntity.modalidad.id, nombre: sesionEntity.modalidad.nombre }
            : null,
        estado: sesionEntity.estado
            ? { id: sesionEntity.estado.id, nombre: sesionEntity.estado.nombre }
            : null,
        pacientes: pacientesAsociados,
    };

    return NextResponse.json(sesionTransformada);

  } catch (error) {
    console.error("Error fetching session by ID:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Error de validación", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  try {
    const session = await getServerSession(authConfig);
    const { id } = params;

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userPermissions = session.user.permisos?.map((p: any) => p.nombre) || [];
    if (!userPermissions.includes("Editar Sesión")) {
      return NextResponse.json({ error: "Sin permisos para editar sesiones" }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: "ID de sesión es requerido" }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = updateSesionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validationResult.error.issues }, { status: 400 });
    }

    const { fechaHoraInicio, fechaHoraFin, psicologoId, modalidadId, estadoId, pacientesIds } = validationResult.data;

    const dataSource = await initializeDatabase();
    const sesionRepository = dataSource.getRepository(SesionEntity);
    const pacienteTieneSesionRepository = dataSource.getRepository(PacienteTieneSesionEntity);

    // Start transaction
    let updatedSesionEntity;
    await dataSource.transaction(async transactionalEntityManager => {
        const sesionEntity = await transactionalEntityManager.findOne(SesionEntity, {
            where: { id },
            relations: ["estado", "psicologo", "psicologo.persona", "modalidad"], // Include relations for response
        });

        if (!sesionEntity) {
            // This throw will be caught by the outer try-catch and result in a 404
            throw new Error("Sesión no encontrada_TRANSACTIONAL");
        }

        if (sesionEntity.estado?.nombre === "Finalizada" || sesionEntity.estado?.nombre === "Cancelada") {
            // This throw will be caught by the outer try-catch and result in a 403
            throw new Error("Sesión no modificable_TRANSACTIONAL");
        }

        // Update session fields
        sesionEntity.fechaHoraInicio = new Date(fechaHoraInicio);
        sesionEntity.fechaHoraFin = new Date(fechaHoraFin);
        sesionEntity.psicologo = { id: psicologoId } as PsicologoEntity;
        sesionEntity.modalidad = { id: modalidadId } as ModalidadEntity;
        sesionEntity.estado = { id: estadoId } as EstadoEntity;
        
        await transactionalEntityManager.save(SesionEntity, sesionEntity);

        // Update associated patients
        // 1. Remove existing associations for this session
        await transactionalEntityManager.delete(PacienteTieneSesionEntity, { sesionId: id });

        // 2. Add new associations if pacientesIds are provided
        if (pacientesIds && pacientesIds.length > 0) {
            const pacienteRelaciones = pacientesIds.map(pacienteId => {
                return transactionalEntityManager.create(PacienteTieneSesionEntity, {
                    sesionId: id, // Use the original session ID
                    pacienteId: pacienteId,
                });
            });
            await transactionalEntityManager.save(PacienteTieneSesionEntity, pacienteRelaciones);
        }
        updatedSesionEntity = sesionEntity; // Keep a reference to the updated entity
    });


    if (!updatedSesionEntity) {
        // This case should ideally not be reached if transaction logic is correct
        // and errors within transaction are properly thrown and caught.
        // However, as a fallback.
        return NextResponse.json({ error: "Error al actualizar la sesión, entidad no disponible post-transacción." }, { status: 500 });
    }
    
    // Fetch the full entity again to ensure all relations are loaded for the response
    // This is important because updatedSesionEntity from transaction might not have all relations fully populated
    // depending on how it was constructed or what was saved.
    const finalSesionConRelaciones = await sesionRepository.findOne({
        where: { id },
        relations: ["psicologo", "psicologo.persona", "modalidad", "estado"],
    });

    if (!finalSesionConRelaciones) {
        // Should not happen if the update was successful
        return NextResponse.json({ error: "Sesión actualizada pero no encontrada para la respuesta." }, { status: 404 });
    }
    
    // Transform data for the response, similar to GET
    const pacienteTieneSesiones = await pacienteTieneSesionRepository.find({
        where: { sesionId: finalSesionConRelaciones.id },
        relations: ["paciente", "paciente.persona"],
    });

    const pacientesAsociados = pacienteTieneSesiones
        .map((ptsEntity) => {
            if (!ptsEntity || !ptsEntity.paciente || !ptsEntity.paciente.id) return null;
            return {
                id: ptsEntity.paciente.id,
                persona: {
                    nombre: ptsEntity.paciente.persona?.nombre || 'N/A',
                    apellido: ptsEntity.paciente.persona?.apellido || 'N/A',
                },
            };
        })
        .filter(Boolean);

    const sesionTransformada = {
        id: finalSesionConRelaciones.id,
        fechaHoraInicio: finalSesionConRelaciones.fechaHoraInicio.toISOString(),
        fechaHoraFin: finalSesionConRelaciones.fechaHoraFin.toISOString(),
        psicologo: finalSesionConRelaciones.psicologo
            ? {
                id: finalSesionConRelaciones.psicologo.id,
                persona: {
                    nombre: finalSesionConRelaciones.psicologo.persona?.nombre || 'N/A',
                    apellido: finalSesionConRelaciones.psicologo.persona?.apellido || 'N/A',
                },
                }
            : null,
        modalidad: finalSesionConRelaciones.modalidad
            ? { id: finalSesionConRelaciones.modalidad.id, nombre: finalSesionConRelaciones.modalidad.nombre }
            : null,
        estado: finalSesionConRelaciones.estado
            ? { id: finalSesionConRelaciones.estado.id, nombre: finalSesionConRelaciones.estado.nombre }
            : null,
        pacientes: pacientesAsociados,
    };

    return NextResponse.json(sesionTransformada, { status: 200 });

  } catch (error) {
    console.error("Error updating session:", error);
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Error de validación", details: error.issues }, { status: 400 });
    }
    if (error.message === "Sesión no encontrada_TRANSACTIONAL") {
        return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    if (error.message === "Sesión no modificable_TRANSACTIONAL") {
        return NextResponse.json({ error: "La sesión está Finalizada o Cancelada y no puede ser modificada." }, { status: 403 });
    }
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
