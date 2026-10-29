// perfil.repository.ts
import { Repository, DataSource, FindManyOptions, FindOneOptions } from 'typeorm';
import { PerfilEntity } from '../entities/perfil.entity';

export class PerfilRepository {
    private readonly repository: Repository<PerfilEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(PerfilEntity);
    }

  async create(data: Partial<PerfilEntity>): Promise<PerfilEntity> {
    const entity = this.repository.create(data);
    return await this.repository.save(entity);
  }

  async findAll(options?: FindManyOptions<PerfilEntity>): Promise<PerfilEntity[]> {
    return await this.repository.find(options);
  }

  async findOne(options: FindOneOptions<PerfilEntity>): Promise<PerfilEntity | null> {
    return await this.repository.findOne(options);
  }

  async findById(id: string): Promise<PerfilEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByNombre(nombre: string): Promise<PerfilEntity | null> {
    return await this.repository.findOne({ where: { nombre } });
  }

  async update(id: string, data: Partial<PerfilEntity>): Promise<PerfilEntity | null> {
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
    const queryBuilder = this.repository.createQueryBuilder('perfil');
    queryBuilder.where('perfil.nombre = :nombre', { nombre });
    
    if (excludeId) {
      queryBuilder.andWhere('perfil.id != :excludeId', { excludeId });
    }
    
    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.repository.count();
  }

  async search(searchTerm: string): Promise<PerfilEntity[]> {
    return await this.repository
      .createQueryBuilder('perfil')
      .where('perfil.nombre ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('perfil.descripcion ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orderBy('perfil.nombre', 'ASC')
      .getMany();
  }
}