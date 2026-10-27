// repositories/paciente.repository.ts
import { Repository, DataSource } from 'typeorm';
import { PacienteEntity } from '../entities/paciente.entity';
import { PacienteFiltersDto, BuscarPacienteDto } from '../dto/paciente.dto';

export class PacienteRepository {
  private repository: Repository<PacienteEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PacienteEntity);
  }

  // Crear un nuevo paciente
  async create(pacienteData: Partial<PacienteEntity>): Promise<PacienteEntity> {
    const paciente = this.repository.create(pacienteData);
    return await this.repository.save(paciente);
  }

  // Obtener todos los pacientes con filtros opcionales
  async findAll(filters?: PacienteFiltersDto): Promise<PacienteEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC');

    if (filters?.personaId) {
      queryBuilder.andWhere('paciente.id_persona = :personaId', { 
        personaId: filters.personaId 
      });
    }

    if (filters?.obraSocialId) {
      queryBuilder.andWhere('paciente.id_obra_social = :obraSocialId', { 
        obraSocialId: filters.obraSocialId 
      });
    }

    if (filters?.nombrePersona) {
      queryBuilder.andWhere('persona.nombre ILIKE :nombrePersona', { 
        nombrePersona: `%${filters.nombrePersona}%` 
      });
    }

    if (filters?.apellidoPersona) {
      queryBuilder.andWhere('persona.apellido ILIKE :apellidoPersona', { 
        apellidoPersona: `%${filters.apellidoPersona}%` 
      });
    }

    if (filters?.dniPersona) {
      queryBuilder.andWhere('persona.dni ILIKE :dniPersona', { 
        dniPersona: `%${filters.dniPersona}%` 
      });
    }

    if (filters?.nombreObraSocial) {
      queryBuilder.andWhere('obraSocial.nombre ILIKE :nombreObraSocial', { 
        nombreObraSocial: `%${filters.nombreObraSocial}%` 
      });
    }

    if (filters?.codigoObraSocial) {
      queryBuilder.andWhere('obraSocial.codigo ILIKE :codigoObraSocial', { 
        codigoObraSocial: `%${filters.codigoObraSocial}%` 
      });
    }

    return await queryBuilder.getMany();
  }

  // Obtener un paciente por ID con todas las relaciones
  async findById(id: string): Promise<PacienteEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['persona', 'obraSocial']
    });
  }

  // Obtener un paciente por persona ID
  async findByPersonaId(personaId: string): Promise<PacienteEntity | null> {
    return await this.repository.findOne({
      where: { persona: { id: personaId } },
      relations: ['persona', 'obraSocial']
    });
  }

  // Obtener pacientes por obra social
  async findByObraSocialId(obraSocialId: string): Promise<PacienteEntity[]> {
    return await this.repository.find({
      where: { obraSocial: { id: obraSocialId } },
      relations: ['persona', 'obraSocial'],
      order: {
        persona: {
          apellido: 'ASC',
          nombre: 'ASC'
        }
      }
    });
  }

  // Buscar pacientes por término general (nombre, apellido, DNI)
  async searchPacientes(searchDto: BuscarPacienteDto): Promise<PacienteEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC');

    if (searchDto.termino) {
      queryBuilder.andWhere(
        '(persona.nombre ILIKE :termino OR persona.apellido ILIKE :termino OR persona.dni ILIKE :termino)',
        { termino: `%${searchDto.termino}%` }
      );
    }

    if (searchDto.obraSocialId) {
      queryBuilder.andWhere('paciente.id_obra_social = :obraSocialId', { 
        obraSocialId: searchDto.obraSocialId 
      });
    }

    return await queryBuilder.getMany();
  }

  // Actualizar un paciente
  async update(id: string, updateData: Partial<PacienteEntity>): Promise<PacienteEntity | null> {
    const updateResult = await this.repository.update(id, updateData);
    
    if (updateResult.affected === 0) {
      return null;
    }

    return await this.findById(id);
  }

  // Eliminar un paciente (soft delete si está configurado en BaseEntity)
  async delete(id: string): Promise<boolean> {
    const deleteResult = await this.repository.delete(id);
    return (deleteResult.affected ?? 0) > 0;
  }

  // Verificar si existe un paciente con una persona específica
  async existsByPersonaId(personaId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('paciente')
      .where('paciente.id_persona = :personaId', { personaId });

    if (excludeId) {
      queryBuilder.andWhere('paciente.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  // Obtener estadísticas de pacientes por obra social
  async getPatientsByObraSocialStats(): Promise<{ obraSocialId: string; nombre: string; totalPacientes: number }[]> {
    const result = await this.repository.createQueryBuilder('paciente')
      .leftJoin('paciente.obraSocial', 'obraSocial')
      .select('obraSocial.id', 'obraSocialId')
      .addSelect('obraSocial.nombre', 'nombre')
      .addSelect('COUNT(paciente.id)', 'totalPacientes')
      .groupBy('obraSocial.id')
      .addGroupBy('obraSocial.nombre')
      .orderBy('totalPacientes', 'DESC')
      .getRawMany();

    return result.map(item => ({
      obraSocialId: item.obraSocialId,
      nombre: item.nombre,
      totalPacientes: parseInt(item.totalPacientes, 10)
    }));
  }

  // Obtener pacientes con paginación
  async findWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: PacienteFiltersDto
  ): Promise<{ pacientes: PacienteEntity[]; total: number; totalPages: number }> {
    const queryBuilder = this.repository.createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.persona', 'persona')
      .leftJoinAndSelect('paciente.obraSocial', 'obraSocial')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC');

    if (filters?.personaId) {
      queryBuilder.andWhere('paciente.id_persona = :personaId', { 
        personaId: filters.personaId 
      });
    }

    if (filters?.obraSocialId) {
      queryBuilder.andWhere('paciente.id_obra_social = :obraSocialId', { 
        obraSocialId: filters.obraSocialId 
      });
    }

    if (filters?.nombrePersona) {
      queryBuilder.andWhere('persona.nombre ILIKE :nombrePersona', { 
        nombrePersona: `%${filters.nombrePersona}%` 
      });
    }

    if (filters?.apellidoPersona) {
      queryBuilder.andWhere('persona.apellido ILIKE :apellidoPersona', { 
        apellidoPersona: `%${filters.apellidoPersona}%` 
      });
    }

    if (filters?.dniPersona) {
      queryBuilder.andWhere('persona.dni ILIKE :dniPersona', { 
        dniPersona: `%${filters.dniPersona}%` 
      });
    }

    if (filters?.nombreObraSocial) {
      queryBuilder.andWhere('obraSocial.nombre ILIKE :nombreObraSocial', { 
        nombreObraSocial: `%${filters.nombreObraSocial}%` 
      });
    }

    if (filters?.codigoObraSocial) {
      queryBuilder.andWhere('obraSocial.codigo ILIKE :codigoObraSocial', { 
        codigoObraSocial: `%${filters.codigoObraSocial}%` 
      });
    }

    const [pacientes, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      pacientes,
      total,
      totalPages
    };
  }

  // Obtener pacientes recientes (últimos creados)
  async findRecentPacientes(limit: number = 10): Promise<PacienteEntity[]> {
    return await this.repository.find({
      relations: ['persona', 'obraSocial'],
      //order: {
      //  createdAt: 'DESC'
      //},
      take: limit
    });
  }
}