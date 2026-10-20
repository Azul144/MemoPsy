// repositories/paciente-tiene-informe.repository.ts
import { Repository, DataSource } from 'typeorm';
import { PacienteTieneInformeEntity } from '../entities/paciente-tiene-informe.entity';
import { 
  PacienteTieneInformeFiltersDto, 
  BuscarPacienteTieneInformeDto 
} from '../dto/paciente-tiene-informe.dto';

export class PacienteTieneInformeRepository {
  private repository: Repository<PacienteTieneInformeEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PacienteTieneInformeEntity);
  }

  // Crear una nueva relación paciente-informe
  async create(data: Partial<PacienteTieneInformeEntity>): Promise<PacienteTieneInformeEntity> {
    const relacion = this.repository.create(data);
    return await this.repository.save(relacion);
  }

  // Obtener todas las relaciones con filtros opcionales
  async findAll(filters?: PacienteTieneInformeFiltersDto): Promise<PacienteTieneInformeEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('pti')
      .leftJoinAndSelect('pti.paciente', 'paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .leftJoinAndSelect('pti.informe', 'informe')
      .leftJoinAndSelect('informe.psicologo', 'psicologo')
      .leftJoinAndSelect('psicologo.persona', 'psicologoPersona')
      .orderBy('informe.fechaCreacion', 'DESC');

    if (filters?.pacienteId) {
      queryBuilder.andWhere('pti.paciente_id = :pacienteId', { 
        pacienteId: filters.pacienteId 
      });
    }

    if (filters?.informeId) {
      queryBuilder.andWhere('pti.informe_id = :informeId', { 
        informeId: filters.informeId 
      });
    }

    if (filters?.nombrePaciente) {
      queryBuilder.andWhere('persona.nombre ILIKE :nombrePaciente', { 
        nombrePaciente: `%${filters.nombrePaciente}%` 
      });
    }

    if (filters?.apellidoPaciente) {
      queryBuilder.andWhere('persona.apellido ILIKE :apellidoPaciente', { 
        apellidoPaciente: `%${filters.apellidoPaciente}%` 
      });
    }

    if (filters?.dniPaciente) {
      queryBuilder.andWhere('persona.dni ILIKE :dniPaciente', { 
        dniPaciente: `%${filters.dniPaciente}%` 
      });
    }

    if (filters?.tituloInforme) {
      queryBuilder.andWhere('informe.titulo ILIKE :tituloInforme', { 
        tituloInforme: `%${filters.tituloInforme}%` 
      });
    }

    if (filters?.contenidoInforme) {
      queryBuilder.andWhere('informe.contenido ILIKE :contenidoInforme', { 
        contenidoInforme: `%${filters.contenidoInforme}%` 
      });
    }

    if (filters?.psicologoId) {
      queryBuilder.andWhere('psicologo.id = :psicologoId', { 
        psicologoId: filters.psicologoId 
      });
    }

    if (filters?.nombrePsicologo) {
      queryBuilder.andWhere('psicologoPersona.nombre ILIKE :nombrePsicologo', { 
        nombrePsicologo: `%${filters.nombrePsicologo}%` 
      });
    }

    if (filters?.apellidoPsicologo) {
      queryBuilder.andWhere('psicologoPersona.apellido ILIKE :apellidoPsicologo', { 
        apellidoPsicologo: `%${filters.apellidoPsicologo}%` 
      });
    }

    if (filters?.obraSocialId) {
      queryBuilder.andWhere('obraSocial.id = :obraSocialId', { 
        obraSocialId: filters.obraSocialId 
      });
    }

    if (filters?.nombreObraSocial) {
      queryBuilder.andWhere('obraSocial.nombre ILIKE :nombreObraSocial', { 
        nombreObraSocial: `%${filters.nombreObraSocial}%` 
      });
    }

    return await queryBuilder.getMany();
  }

  // Obtener una relación específica por IDs
  async findByIds(pacienteId: string, informeId: string): Promise<PacienteTieneInformeEntity | null> {
    return await this.repository.findOne({
      where: { 
        pacienteId: pacienteId,
        informeId: informeId 
      },
      relations: [
        'paciente', 
        'paciente.persona', 
        'paciente.obraSocial',
        'informe', 
        'informe.psicologo', 
        'informe.psicologo.persona'
      ]
    });
  }

  // Obtener todos los informes de un paciente
  async findInformesByPacienteId(pacienteId: string): Promise<PacienteTieneInformeEntity[]> {
    return await this.repository.find({
      where: { pacienteId },
      relations: [
        'informe', 
        'informe.psicologo', 
        'informe.psicologo.persona',
        'paciente',
        'paciente.persona',
        'paciente.obraSocial'
      ],
      order: { informe: { fechaCreacion: 'DESC' } }
    });
  }

  // Obtener todos los pacientes que tienen un informe específico
  async findPacientesByInformeId(informeId: string): Promise<PacienteTieneInformeEntity[]> {
    return await this.repository.find({
      where: { informeId },
      relations: [
        'paciente', 
        'paciente.persona', 
        'paciente.obraSocial',
        'informe',
        'informe.psicologo',
        'informe.psicologo.persona'
      ],
      order: { paciente: { persona: { apellido: 'ASC', nombre: 'ASC' } } }
    });
  }

  // Búsqueda avanzada
  async search(searchDto: BuscarPacienteTieneInformeDto): Promise<PacienteTieneInformeEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('pti')
      .leftJoinAndSelect('pti.paciente', 'paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .leftJoinAndSelect('pti.informe', 'informe')
      .leftJoinAndSelect('informe.psicologo', 'psicologo')
      .leftJoinAndSelect('psicologo.persona', 'psicologoPersona')
      .orderBy('informe.fechaCreacion', 'DESC');

    if (searchDto.termino) {
      queryBuilder.andWhere(
        `(persona.nombre ILIKE :termino OR 
          persona.apellido ILIKE :termino OR 
          persona.dni ILIKE :termino OR 
          informe.titulo ILIKE :termino OR 
          informe.contenido ILIKE :termino OR
          psicologoPersona.nombre ILIKE :termino OR
          psicologoPersona.apellido ILIKE :termino)`,
        { termino: `%${searchDto.termino}%` }
      );
    }

    if (searchDto.pacienteId) {
      queryBuilder.andWhere('pti.paciente_id = :pacienteId', { 
        pacienteId: searchDto.pacienteId 
      });
    }

    if (searchDto.informeId) {
      queryBuilder.andWhere('pti.informe_id = :informeId', { 
        informeId: searchDto.informeId 
      });
    }

    if (searchDto.psicologoId) {
      queryBuilder.andWhere('psicologo.id = :psicologoId', { 
        psicologoId: searchDto.psicologoId 
      });
    }

    if (searchDto.obraSocialId) {
      queryBuilder.andWhere('obraSocial.id = :obraSocialId', { 
        obraSocialId: searchDto.obraSocialId 
      });
    }

    return await queryBuilder.getMany();
  }

  // Eliminar una relación específica
  async delete(pacienteId: string, informeId: string): Promise<boolean> {
    try {
      const result = await this.repository.delete({
        pacienteId,
        informeId
      });
      return (result.affected ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }

  // Verificar si existe una relación específica
  async exists(pacienteId: string, informeId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { pacienteId, informeId }
    });
    return count > 0;
  }

  // Obtener con paginación
  async findWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: PacienteTieneInformeFiltersDto
  ): Promise<{ 
    relaciones: PacienteTieneInformeEntity[]; 
    total: number; 
    totalPages: number 
  }> {
    const queryBuilder = this.repository.createQueryBuilder('pti')
      .leftJoinAndSelect('pti.paciente', 'paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .leftJoinAndSelect('pti.informe', 'informe')
      .leftJoinAndSelect('informe.psicologo', 'psicologo')
      .leftJoinAndSelect('psicologo.persona', 'psicologoPersona')
      .orderBy('informe.fechaCreacion', 'DESC');

    // Aplicar filtros (reutilizamos la lógica de findAll)
    if (filters?.pacienteId) {
      queryBuilder.andWhere('pti.paciente_id = :pacienteId', { 
        pacienteId: filters.pacienteId 
      });
    }

    if (filters?.informeId) {
      queryBuilder.andWhere('pti.informe_id = :informeId', { 
        informeId: filters.informeId 
      });
    }

    // ... aplicar otros filtros igual que en findAll

    const [relaciones, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      relaciones,
      total,
      totalPages
    };
  }

  // Obtener estadísticas
  async getStats(): Promise<{
    totalRelaciones: number;
    pacientesConInformes: number;
    informesAsignados: number;
    promedioPorPaciente: number;
    porPsicologo: { psicologoId: string; nombrePsicologo: string; totalInformes: number }[];
    porObraSocial: { obraSocialId: string; nombreObraSocial: string; totalInformes: number }[];
  }> {
    // Total de relaciones
    const totalRelaciones = await this.repository.count();

    // Pacientes únicos con informes
    const pacientesConInformesQuery = await this.repository
      .createQueryBuilder('pti')
      .select('COUNT(DISTINCT pti.paciente_id)', 'count')
      .getRawOne();
    const pacientesConInformes = parseInt(pacientesConInformesQuery.count);

    // Informes únicos asignados
    const informesAsignadosQuery = await this.repository
      .createQueryBuilder('pti')
      .select('COUNT(DISTINCT pti.informe_id)', 'count')
      .getRawOne();
    const informesAsignados = parseInt(informesAsignadosQuery.count);

    // Promedio de informes por paciente
    const promedioPorPaciente = pacientesConInformes > 0 ? 
      Math.round((totalRelaciones / pacientesConInformes) * 100) / 100 : 0;

    // Por psicólogo
    const porPsicologoQuery = await this.repository
      .createQueryBuilder('pti')
      .leftJoin('pti.informe', 'informe')
      .leftJoin('informe.psicologo', 'psicologo')
      .leftJoin('psicologo.persona', 'persona')
      .select('psicologo.id', 'psicologoId')
      .addSelect('CONCAT(persona.nombre, " ", persona.apellido)', 'nombrePsicologo')
      .addSelect('COUNT(*)', 'totalInformes')
      .groupBy('psicologo.id')
      .addGroupBy('persona.nombre')
      .addGroupBy('persona.apellido')
      .orderBy('totalInformes', 'DESC')
      .getRawMany();

    const porPsicologo = porPsicologoQuery.map(item => ({
      psicologoId: item.psicologoId,
      nombrePsicologo: item.nombrePsicologo,
      totalInformes: parseInt(item.totalInformes)
    }));

    // Por obra social
    const porObraSocialQuery = await this.repository
      .createQueryBuilder('pti')
      .leftJoin('pti.paciente', 'paciente')
      .leftJoin('paciente.obraSocial', 'obraSocial')
      .select('obraSocial.id', 'obraSocialId')
      .addSelect('obraSocial.nombre', 'nombreObraSocial')
      .addSelect('COUNT(*)', 'totalInformes')
      .groupBy('obraSocial.id')
      .addGroupBy('obraSocial.nombre')
      .orderBy('totalInformes', 'DESC')
      .getRawMany();

    const porObraSocial = porObraSocialQuery.map(item => ({
      obraSocialId: item.obraSocialId,
      nombreObraSocial: item.nombreObraSocial,
      totalInformes: parseInt(item.totalInformes)
    }));

    return {
      totalRelaciones,
      pacientesConInformes,
      informesAsignados,
      promedioPorPaciente,
      porPsicologo,
      porObraSocial
    };
  }

  // Contar informes por paciente
  async countInformesByPaciente(pacienteId: string): Promise<number> {
    return await this.repository.count({
      where: { pacienteId }
    });
  }

  // Contar pacientes por informe
  async countPacientesByInforme(informeId: string): Promise<number> {
    return await this.repository.count({
      where: { informeId }
    });
  }
}