// modulo.repository.ts
import { Repository, DataSource, FindManyOptions, FindOneOptions } from 'typeorm';
import { ModuloEntity } from '../entities/modulo.entity';

export class ModuloRepository {
  private repository: Repository<ModuloEntity>;
  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ModuloEntity);
  }

  async create(data: Partial<ModuloEntity>): Promise<ModuloEntity> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async findAll(options?: FindManyOptions<ModuloEntity>): Promise<ModuloEntity[]> {
    return await this.repository.find(options);
  }

  async findOne(options: FindOneOptions<ModuloEntity>): Promise<ModuloEntity | null> {
    return await this.repository.findOne(options);
  }

  async findById(id: string): Promise<ModuloEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByNombre(nombre: string): Promise<ModuloEntity | null> {
    return await this.repository.findOne({ where: { nombre } });
  }

  async update(id: string, data: Partial<ModuloEntity>): Promise<ModuloEntity | null> {
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
    const queryBuilder = this.repository.createQueryBuilder('modulo');
    queryBuilder.where('modulo.nombre = :nombre', { nombre });
    
    if (excludeId) {
      queryBuilder.andWhere('modulo.id != :excludeId', { excludeId });
    }
    
    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.repository.count();
  }
}