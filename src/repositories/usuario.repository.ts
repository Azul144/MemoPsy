// repositories/usuario.repository.ts
import { Repository, DataSource } from 'typeorm';
import { UsuarioEntity } from '../entities/usuario.entity';
import { UsuarioFiltersDto } from '../dto/usuario.dto';

export class UsuarioRepository {
  private repository: Repository<UsuarioEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UsuarioEntity);
  }

  // Crear un nuevo usuario
  async create(usuarioData: Partial<UsuarioEntity>): Promise<UsuarioEntity> {
    const usuario = this.repository.create({
      ...usuarioData,
      ultimoAcceso: new Date(), // Establecer fecha de último acceso al crear
    });
    return await this.repository.save(usuario);
  }

  // Obtener todos los usuarios con filtros opcionales
  async findAll(filters?: UsuarioFiltersDto): Promise<UsuarioEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC');

    if (filters?.email) {
      queryBuilder.andWhere('usuario.email ILIKE :email', { 
        email: `%${filters.email}%` 
      });
    }

    if (filters?.activo !== undefined) {
      queryBuilder.andWhere('usuario.activo = :activo', { 
        activo: filters.activo 
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

    return await queryBuilder.getMany();
  }

  // Obtener un usuario por ID con su persona
  async findById(id: string): Promise<UsuarioEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['persona']
    });
  }

  // Obtener un usuario por email con su persona
  async findByEmail(email: string): Promise<UsuarioEntity | null> {
    return await this.repository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['persona']
    });
  }

  // Obtener un usuario por persona ID
  async findByPersonaId(personaId: string): Promise<UsuarioEntity | null> {
    return await this.repository.findOne({
      where: { persona: { id: personaId } },
      relations: ['persona']
    });
  }

  // Actualizar un usuario
  async update(id: string, updateData: Partial<UsuarioEntity>): Promise<UsuarioEntity | null> {
    const updateResult = await this.repository.update(id, updateData);
    
    if (updateResult.affected === 0) {
      return null;
    }

    return await this.findById(id);
  }

  // Actualizar último acceso
  async updateLastAccess(id: string): Promise<void> {
    await this.repository.update(id, { 
      ultimoAcceso: new Date() 
    });
  }

  // Eliminar un usuario (soft delete si está configurado en BaseEntity)
  async delete(id: string): Promise<boolean> {
    const deleteResult = await this.repository.delete(id);
    return (deleteResult.affected ?? 0) > 0;
  }

  // Verificar si existe un usuario con un email específico
  async existsByEmail(email: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('usuario')
      .where('usuario.email = :email', { email: email.toLowerCase() });

    if (excludeId) {
      queryBuilder.andWhere('usuario.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  // Verificar si existe un usuario con una persona específica
  async existsByPersonaId(personaId: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('usuario')
      .where('usuario.id_persona = :personaId', { personaId });

    if (excludeId) {
      queryBuilder.andWhere('usuario.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  // Obtener usuarios activos
  async findActiveUsers(): Promise<UsuarioEntity[]> {
    return await this.repository.find({
      where: { activo: true },
      relations: ['persona'],
      order: {
        persona: {
          apellido: 'ASC',
          nombre: 'ASC'
        }
      }
    });
  }

  // Obtener usuarios inactivos
  async findInactiveUsers(): Promise<UsuarioEntity[]> {
    return await this.repository.find({
      where: { activo: false },
      relations: ['persona'],
      order: {
        persona: {
          apellido: 'ASC',
          nombre: 'ASC'
        }
      }
    });
  }

  // Obtener usuarios con paginación
  async findWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: UsuarioFiltersDto
  ): Promise<{ usuarios: UsuarioEntity[]; total: number; totalPages: number }> {
    const queryBuilder = this.repository.createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .orderBy('persona.apellido', 'ASC')
      .addOrderBy('persona.nombre', 'ASC');

    if (filters?.email) {
      queryBuilder.andWhere('usuario.email ILIKE :email', { 
        email: `%${filters.email}%` 
      });
    }

    if (filters?.activo !== undefined) {
      queryBuilder.andWhere('usuario.activo = :activo', { 
        activo: filters.activo 
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

    const [usuarios, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      usuarios,
      total,
      totalPages
    };
  }
}