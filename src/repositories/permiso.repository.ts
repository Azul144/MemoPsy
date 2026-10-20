// permiso.repository.ts
import { Repository, DataSource, FindManyOptions, FindOneOptions } from 'typeorm';
import { PermisoEntity } from '../entities/permiso.entity';

export class PermisoRepository {
    private readonly repository: Repository<PermisoEntity>;
    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(PermisoEntity);
    }

  async create(data: Partial<PermisoEntity>): Promise<PermisoEntity> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async findAll(options?: FindManyOptions<PermisoEntity>): Promise<PermisoEntity[]> {
    return await this.repository.find({
      ...options,
      relations: ['modulo', 'accion'],
    });
  }

  async findOne(options: FindOneOptions<PermisoEntity>): Promise<PermisoEntity | null> {
    return await this.repository.findOne({
      ...options,
      relations: ['modulo', 'accion'],
    });
  }

  async findById(id: string): Promise<PermisoEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['modulo', 'accion'],
    });
  }

  async findByNombre(nombre: string): Promise<PermisoEntity | null> {
    return await this.repository.findOne({
      where: { nombre },
      relations: ['modulo', 'accion'],
    });
  }

  async findByModuloAndAccion(moduloId: string, accionId: string): Promise<PermisoEntity[]> {
    return await this.repository.find({
      where: {
        modulo: { id: moduloId },
        accion: { id: accionId },
      },
      relations: ['modulo', 'accion'],
    });
  }

  async findByModulo(moduloId: string): Promise<PermisoEntity[]> {
    return await this.repository.find({
      where: { modulo: { id: moduloId } },
      relations: ['modulo', 'accion'],
      order: { nombre: 'ASC' },
    });
  }

  async findByAccion(accionId: string): Promise<PermisoEntity[]> {
    return await this.repository.find({
      where: { accion: { id: accionId } },
      relations: ['modulo', 'accion'],
      order: { nombre: 'ASC' },
    });
  }

  async update(id: string, data: Partial<PermisoEntity>): Promise<PermisoEntity | null> {
    const updateResult = await this.repository.update(id, data);
    
    if (updateResult.affected === 0) {
      return null;
    }
    
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleteResult = await this.repository.delete(id);
    return (deleteResult.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async existsByNombre(nombre: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('permiso');
    queryBuilder.where('permiso.nombre = :nombre', { nombre });
    
    if (excludeId) {
      queryBuilder.andWhere('permiso.id != :excludeId', { excludeId });
    }
    
    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async existsForModuloAndAccion(
    moduloId: string, 
    accionId: string, 
    excludeId?: string
  ): Promise<boolean> {
    const queryBuilder = this.repository.createQueryBuilder('permiso');
    queryBuilder
      .leftJoin('permiso.modulo', 'modulo')
      .leftJoin('permiso.accion', 'accion')
      .where('modulo.id = :moduloId', { moduloId })
      .andWhere('accion.id = :accionId', { accionId });
    
    if (excludeId) {
      queryBuilder.andWhere('permiso.id != :excludeId', { excludeId });
    }
    
    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.repository.count();
  }

  async search(searchTerm: string): Promise<PermisoEntity[]> {
    return await this.repository
      .createQueryBuilder('permiso')
      .leftJoinAndSelect('permiso.modulo', 'modulo')
      .leftJoinAndSelect('permiso.accion', 'accion')
      .where('permiso.nombre ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('permiso.descripcion ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('modulo.nombre ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('accion.nombre ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('permiso.nombre', 'ASC')
      .getMany();
  }
}