// src/app/api/informes/route.ts
// src/app/api/informes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth/auth-config';
import { initializeDatabase } from '@/lib/database';
import { InformeEntity } from '@/entities/informe.entity';
import { PacienteTieneInformeEntity } from '@/entities/paciente-tiene-informe.entity';
import { PsicologoEntity } from '@/entities/psicologo.entity';
import { PacienteEntity } from '@/entities/paciente.entity';
import { AppDataSource } from '@/lib/database';
import { In } from 'typeorm';

//async function obtenerFechaDesdeInternet(): Promise<Date> {
//  const res = await fetch('https://worldtimeapi.org/api/ip');
//  const data = await res.json();
//  return new Date(data.utc_datetime); // o data.datetime si prefieres hora local
//}

async function obtenerFechaDesdeInternet(retries = 3, delay = 1000): Promise<Date> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('https://worldtimeapi.org/api/ip');
      if (!res.ok) {
        // Manejar errores HTTP (ej. 404, 500)
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      return new Date(data.utc_datetime);
    } catch (error) {
      console.error(`Intento ${i + 1} fallido:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Incrementa el delay
      } else {
        throw error; // Lanza el error si todos los reintentos fallan
      }
    }
  }
  throw new Error('Todos los reintentos para obtener la fecha fallaron.');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const hasPermission = session.user.permisos?.some((permiso) => permiso.nombre === 'Ver Informes');
    if (!hasPermission) {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
    const informeRepository = AppDataSource.getRepository(InformeEntity);
    const pacienteTieneInformeRepository = AppDataSource.getRepository(PacienteTieneInformeEntity);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const pacienteId = searchParams.get('pacienteId');
    const pacienteSearch = searchParams.get('pacienteSearch');
    let effectiveSortBy = searchParams.get('sortBy') || 'informe.fechaCreacion'; // Default sort column
    const sortOrder = searchParams.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; // Default sort order

    let informesData: any[] = [];
    let totalInformes = 0;

    if (session.user.psicologoId) {
      const queryBuilder = informeRepository.createQueryBuilder('informe')
        .leftJoinAndSelect('informe.psicologo', 'psicologo')
        .leftJoinAndSelect('psicologo.persona', 'psicologoPersona')
        .where('informe.psicologo_id = :psicologoId', { psicologoId: session.user.psicologoId });

      if (pacienteId) {
        queryBuilder
          .innerJoin(PacienteTieneInformeEntity, 'pti', 'pti.informe_id = informe.id')
          .andWhere('pti.paciente_id = :pacienteIdParam', { pacienteIdParam: pacienteId });
      } else if (pacienteSearch) {
        queryBuilder
        .innerJoin(PacienteTieneInformeEntity, 'pti', 'pti.informe_id = informe.id')
        .innerJoin('pti.paciente', 'paciente')
        .innerJoin('paciente.persona', 'pacientePersona')
        .andWhere(
          `(LOWER(pacientePersona.nombre) LIKE LOWER(:query) OR 
            LOWER(pacientePersona.apellido) LIKE LOWER(:query) OR 
            pacientePersona.dni LIKE :query)`,
          { query: `%${pacienteSearch}%` }
        );
        // Error aqui puedes cambiar la consulta para que haga el join con "PacienteTieneInforme"
        /*queryBuilder
          .innerJoin('informe.pacientesInformes', 'pti')
          .leftJoin('pti.paciente', 'paciente')
          .leftJoin('paciente.persona', 'pacientePersona')
          .andWhere('(pacientePersona.nombre LIKE :query OR pacientePersona.apellido LIKE :query OR pacientePersona.dni LIKE :query)', 
                    { query: `%${pacienteSearch}%` });*/
      }
      
      if (!effectiveSortBy.includes('.')) {
        effectiveSortBy = `informe.${effectiveSortBy}`;
      }
      queryBuilder.orderBy(effectiveSortBy, sortOrder as 'ASC' | 'DESC');
      
      totalInformes = await queryBuilder.getCount();
      const informes = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();

      informesData = await Promise.all(informes.map(async (informe) => {
        const pacientesInformes = await pacienteTieneInformeRepository.find({
          where: { informe: { id: informe.id } },
          relations: ['paciente', 'paciente.persona'],
        });
        return {
          ...informe,
          pacientes: pacientesInformes.map(pti => ({
            id: pti.paciente.id,
            nombre: `${pti.paciente.persona.nombre} ${pti.paciente.persona.apellido}`,
            dni: pti.paciente.persona.dni,
          })),
          psicologo: {
            id: informe.psicologo.id,
            nombre: `${informe.psicologo.persona.nombre} ${informe.psicologo.persona.apellido}`,
          }
        };
      }));

    } else if (session.user.pacienteId) {
      // For Paciente, filter PacienteTieneInforme first, then join and filter Informe
      const ptiQueryBuilder = pacienteTieneInformeRepository.createQueryBuilder('pti')
        .innerJoinAndSelect('pti.informe', 'informe')
        .leftJoinAndSelect('informe.psicologo', 'psicologo')
        .leftJoinAndSelect('psicologo.persona', 'psicologoPersona')
        .where('pti.paciente_id = :pacienteId', { pacienteId: session.user.pacienteId })
        .andWhere('informe.esPrivado = :esPrivado', { esPrivado: false });

      // For patient, effectiveSortBy might be 'fechaCreacion' (intended for informe) or 'informe.fechaCreacion'
      if (effectiveSortBy.startsWith('informe.')) {
          ptiQueryBuilder.orderBy(effectiveSortBy, sortOrder as 'ASC' | 'DESC');
      } else {
          // If effectiveSortBy is a simple column name like 'fechaCreacion', it's for the 'informe' table.
          // Or if it's something not recognized, default to 'informe.fechaCreacion'.
          // This also handles the default 'informe.fechaCreacion' if sortBy was initially null.
          const patientSortColumn = effectiveSortBy.includes('.') ? 'informe.fechaCreacion' : `informe.${effectiveSortBy}`;
          const patientSortOrder = effectiveSortBy.includes('.') ? 'DESC' : sortOrder; // keep original order if simple column
          ptiQueryBuilder.orderBy(patientSortColumn, patientSortOrder as 'ASC' | 'DESC');
          // If default was used due to unrecognized column, ensure DESC for fechaCreacion
          if (patientSortColumn === 'informe.fechaCreacion' && !effectiveSortBy.startsWith('informe.')) {
             ptiQueryBuilder.orderBy('informe.fechaCreacion', 'DESC');
          }
      }
      
      totalInformes = await ptiQueryBuilder.getCount();
      const pacienteInformesFiltrados = await ptiQueryBuilder.skip((page - 1) * limit).take(limit).getMany();

      informesData = pacienteInformesFiltrados.map(pti => ({
        ...pti.informe,
        psicologo: {
          id: pti.informe.psicologo.id,
          nombre: `${pti.informe.psicologo.persona.nombre} ${pti.informe.psicologo.persona.apellido}`,
        },
      }));

    } else {
      return NextResponse.json({ message: 'Rol no especificado o no válido para esta acción' }, { status: 403 });
    }

    return NextResponse.json({
      data: informesData,
      page,
      limit,
      total: totalInformes,
      totalPages: Math.ceil(totalInformes / limit),
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET /api/informes:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const hasPermission = session.user.permisos?.some((permiso) => permiso.nombre === 'Registrar Informe');;
    if (!hasPermission || !session.user.psicologoId) {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, contenido, esPrivado, pacientesIds } = body;

    if (!titulo || !contenido || typeof esPrivado !== 'boolean') {
      return NextResponse.json({ message: 'Datos incompletos o inválidos: titulo, contenido y esPrivado son requeridos.' }, { status: 400 });
    }
    if (pacientesIds && (!Array.isArray(pacientesIds) || !pacientesIds.every(id => typeof id === 'string'))) {
        return NextResponse.json({ message: 'pacientesIds debe ser un array de strings.' }, { status: 400 });
    }


    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }
    const informeRepository = AppDataSource.getRepository(InformeEntity);
    const pacienteTieneInformeRepository = AppDataSource.getRepository(PacienteTieneInformeEntity);
    const psicologoRepository = AppDataSource.getRepository(PsicologoEntity);
    const pacienteRepository = AppDataSource.getRepository(PacienteEntity);

    const psicologo = await psicologoRepository.findOneBy({ id: session.user.psicologoId });
    if (!psicologo) {
        return NextResponse.json({ message: 'Psicólogo no encontrado' }, { status: 404 });
    }

    const fechaCreacion = new Date();
    //try {
    //  fechaCreacion = await obtenerFechaDesdeInternet();
    //} catch {
    //  fechaCreacion = new Date();
    //}

    const nuevoInforme = informeRepository.create({
      titulo,
      contenido,
      esPrivado,
      fechaCreacion: fechaCreacion,
      psicologo: psicologo,
    });

    const informeGuardado = await informeRepository.save(nuevoInforme);

    let ptiEntitiesGuardadas: PacienteTieneInformeEntity[] = [];
    if (pacientesIds && pacientesIds.length > 0) {
      const existingPacientes = await pacienteRepository.findBy({ id: In(pacientesIds) });
      if(existingPacientes.length !== pacientesIds.length){
          const notFoundIds = pacientesIds.filter(id => !existingPacientes.some(p => p.id === id));
          return NextResponse.json({ message: `Pacientes con IDs ${notFoundIds.join(', ')} no encontrados.` }, { status: 400 });
      }

      const ptiEntities = pacientesIds.map(pacienteId => 
        pacienteTieneInformeRepository.create({
          informe: informeGuardado,
          paciente: { id: pacienteId } as PacienteEntity,
        })
      );
      ptiEntitiesGuardadas = await pacienteTieneInformeRepository.save(ptiEntities);
    }
    
    const informeCompleto = await informeRepository.findOne({
        where: { id: informeGuardado.id },
        relations: ['psicologo', 'psicologo.persona']
    });

    const pacientesDelInforme = await pacienteTieneInformeRepository.find({
        where: { informe: { id: informeGuardado.id } },
        relations: ['paciente', 'paciente.persona']
    });

    const responseData = {
        ...informeCompleto,
        psicologo: informeCompleto?.psicologo ? {
            id: informeCompleto.psicologo.id,
            nombre: `${informeCompleto.psicologo.persona.nombre} ${informeCompleto.psicologo.persona.apellido}`
        } : undefined,
        pacientes: pacientesDelInforme.map(pti => ({
            id: pti.paciente.id,
            nombre: `${pti.paciente.persona.nombre} ${pti.paciente.persona.apellido}`,
            dni: pti.paciente.persona.dni 
        }))
    };

    return NextResponse.json(responseData, { status: 201 });

  } catch (error: any) {
    console.error('Error en POST /api/informes:', error);
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('UQ_')) {
        return NextResponse.json({ message: 'Error: Ya existe un informe con datos similares o clave única duplicada.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

/*
import { NextRequest } from 'next/server';
import { InformeController } from '@/lib/controllers/informe.controller';

export async function GET(request: NextRequest) {
  return InformeController.getAllInformes(request);
}

export async function POST(request: NextRequest) {
  return InformeController.createInforme(request);
}
  */
