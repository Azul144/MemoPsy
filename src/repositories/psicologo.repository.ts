// repositories/psicologo.repository.ts
import { Repository, DataSource } from 'typeorm';
import { PsicologoEntity } from '../entities/psicologo.entity';
import { PsicologoQueryDto } from '../dto/psicologo.dto';
//import { AppDataSource } from '../lib/database';

export class PsicologoRepository {
    private repository: Repository<PsicologoEntity>;

    constructor(dataSource: DataSource) {
      this.repository = dataSource.getRepository(PsicologoEntity);
    }

  // Crear un nuevo psicólogo
  async create(psicologoData: Partial<PsicologoEntity>): Promise<PsicologoEntity> {
    const psicologo = this.repository.create(psicologoData);
    return await this.repository.save(psicologo);
  }

  // Buscar psicólogo por ID
  async findById(id: string): Promise<PsicologoEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['persona']
    });
  }

  // Buscar psicólogo por número de licencia
  async findByNumeroLicencia(numeroLicencia: string): Promise<PsicologoEntity | null> {
    return await this.repository.findOne({
      where: { numeroLicencia },
      relations: ['persona']
    });
  }

  // Buscar psicólogo por persona ID
  async findByPersonaId(personaId: string): Promise<PsicologoEntity | null> {
    return await this.repository.findOne({
      where: { persona: { id: personaId } },
      relations: ['persona']
    });
  }

  // Buscar todos los psicólogos con filtros y paginación
  async findAll(queryDto: PsicologoQueryDto): Promise<{ data: PsicologoEntity[], total: number }> {
    const {
      especialidad,
      numeroLicencia,
      nombre,
      apellido,
      sortBy = 'especialidad',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = queryDto;

    const queryBuilder = this.repository.createQueryBuilder('psicologo')
      .leftJoinAndSelect('psicologo.persona', 'persona');

    // Aplicar filtros
    if (especialidad) {
      queryBuilder.andWhere('psicologo.especialidad LIKE :especialidad', {
        especialidad: `%${especialidad}%`
      });
    }

    if (numeroLicencia) {
      queryBuilder.andWhere('psicologo.numeroLicencia LIKE :numeroLicencia', {
        numeroLicencia: `%${numeroLicencia}%`
      });
    }

    if (nombre) {
      queryBuilder.andWhere('persona.nombre LIKE :nombre', {
        nombre: `%${nombre}%`
      });
    }

    if (apellido) {
      queryBuilder.andWhere('persona.apellido LIKE :apellido', {
        apellido: `%${apellido}%`
      });
    }

    // Aplicar ordenamiento
    let orderField = 'psicologo.nombre';
    if (sortBy === 'especialidad') orderField = 'psicologo.especialidad';
    if (sortBy === 'numeroLicencia') orderField = 'psicologo.numeroLicencia';

    queryBuilder.orderBy(orderField, sortOrder);

    // Aplicar paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  // Actualizar psicólogo
  async update(id: string, updateData: Partial<PsicologoEntity>): Promise<PsicologoEntity | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  // Eliminar psicólogo (soft delete si BaseEntity lo soporta)
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return (result.affected ?? 0) > 0;
    } catch {
      return false;
    }
  }

  // Verificar si existe un psicólogo con el número de licencia
  async existsByNumeroLicencia(numeroLicencia: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('psicologo')
      .where('psicologo.numeroLicencia = :numeroLicencia', { numeroLicencia });

    if (excludeId) {
      queryBuilder.andWhere('psicologo.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  // Buscar psicólogos por especialidad
  async findByEspecialidad(especialidad: string): Promise<PsicologoEntity[]> {
    return await this.repository.find({
      where: { especialidad },
      relations: ['persona'],
      //order: { createdAt: 'DESC' }
    });
  }

  // Obtener estadísticas de psicólogos
  async getStats(): Promise<{
    total: number;
    porEspecialidad: { especialidad: string; count: number }[];
  }> {
    const total = await this.repository.count();

    const especialidadesQuery = await this.repository
      .createQueryBuilder('psicologo')
      .select('psicologo.especialidad', 'especialidad')
      .addSelect('COUNT(*)', 'count')
      .groupBy('psicologo.especialidad')
      .orderBy('count', 'DESC')
      .getRawMany();

    const porEspecialidad = especialidadesQuery.map(item => ({
      especialidad: item.especialidad,
      count: parseInt(item.count)
    }));

    return {
      total,
      porEspecialidad
    };
  }

  // Buscar psicólogos con informes
  async findWithInformes(id: string): Promise<PsicologoEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['persona', 'informes'] // Asumiendo que existe relación con informes
    });
  }

  // Método personalizado para búsqueda avanzada
  async search(searchTerm: string): Promise<PsicologoEntity[]> {
    return await this.repository
      .createQueryBuilder('psicologo')
      .leftJoinAndSelect('psicologo.persona', 'persona')
      .where('psicologo.especialidad LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('psicologo.numeroLicencia LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('persona.nombre LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('persona.apellido LIKE :term', { term: `%${searchTerm}%` })
      .orderBy('psicologo.createdAt', 'DESC')
      .getMany();
  }
}