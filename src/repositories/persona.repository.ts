// repositories/persona.repository.ts
import { Repository, DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { PersonaEntity } from '../entities/persona.entity';
import { PersonaFiltersDto } from '../dto/persona.dto';

export class PersonaRepository {
  private repository: Repository<PersonaEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PersonaEntity);
  }

  // Crear una nueva persona
  async create(personaData: Partial<PersonaEntity>): Promise<PersonaEntity> {
    const persona = this.repository.create(personaData);
    return await this.repository.save(persona);
  }

  // Obtener todas las personas con filtros opcionales
  async findAll(filters?: PersonaFiltersDto): Promise<PersonaEntity[]> {
    const whereConditions: FindOptionsWhere<PersonaEntity> = {};

    if (filters?.nombre) {
      whereConditions.nombre = ILike(`%${filters.nombre}%`);
    }

    if (filters?.apellido) {
      whereConditions.apellido = ILike(`%${filters.apellido}%`);
    }

    if (filters?.dni) {
      whereConditions.dni = ILike(`%${filters.dni}%`);
    }

    return await this.repository.find({
      where: whereConditions,
      order: {
        apellido: 'ASC',
        nombre: 'ASC'
      }
    });
  }

  // Obtener una persona por ID
  async findById(id: string): Promise<PersonaEntity | null> {
    return await this.repository.findOne({
      where: { id }
    });
  }

  // Obtener una persona por DNI
  async findByDni(dni: string): Promise<PersonaEntity | null> {
    return await this.repository.findOne({
      where: { dni }
    });
  }

  // Actualizar una persona
  async update(id: string, updateData: Partial<PersonaEntity>): Promise<PersonaEntity | null> {
    const updateResult = await this.repository.update(id, updateData);
    
    if (updateResult.affected === 0) {
      return null;
    }

    return await this.findById(id);
  }

  // Eliminar una persona (soft delete si está configurado en BaseEntity)
  async delete(id: string): Promise<boolean> {
    const deleteResult = await this.repository.delete(id);
    return (deleteResult.affected ?? 0) > 0;
  }

  // Verificar si existe una persona con un DNI específico (útil para validaciones)
  async existsByDni(dni: string, excludeId?: string): Promise<boolean> {
    const whereConditions: FindOptionsWhere<PersonaEntity> = { dni };
    
    if (excludeId) {
      whereConditions.id = { $ne: excludeId } as any;
    }

    const count = await this.repository.count({
      where: whereConditions
    });

    return count > 0;
  }

  // Obtener personas con paginación
  async findWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: PersonaFiltersDto
  ): Promise<{ personas: PersonaEntity[]; total: number; totalPages: number }> {
    const whereConditions: FindOptionsWhere<PersonaEntity> = {};

    if (filters?.nombre) {
      whereConditions.nombre = ILike(`%${filters.nombre}%`);
    }

    if (filters?.apellido) {
      whereConditions.apellido = ILike(`%${filters.apellido}%`);
    }

    if (filters?.dni) {
      whereConditions.dni = ILike(`%${filters.dni}%`);
    }

    const [personas, total] = await this.repository.findAndCount({
      where: whereConditions,
      order: {
        apellido: 'ASC',
        nombre: 'ASC'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      personas,
      total,
      totalPages
    };
  }
}