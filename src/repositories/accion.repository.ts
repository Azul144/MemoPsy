// accion.repository.ts
import { Repository, DataSource, FindManyOptions, FindOneOptions } from 'typeorm';
import { AccionEntity } from '../entities/accion.entity';

export class AccionRepository {
    private repository: Repository<AccionEntity>;
    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(AccionEntity);
    }

    async create(data: Partial<AccionEntity>): Promise<AccionEntity> {
        const entity = this.repository.create(data);
        return await this.repository.save(entity);
    }

    async findAll(options?: FindManyOptions<AccionEntity>): Promise<AccionEntity[]> {
        return await this.repository.find(options);
    }

    async findOne(options: FindOneOptions<AccionEntity>): Promise<AccionEntity | null> {
        return await this.repository.findOne(options);
    }

    async findById(id: string): Promise<AccionEntity | null> {
        return await this.repository.findOne({ where: { id } });
    }

    async findByNombre(nombre: string): Promise<AccionEntity | null> {
        return await this.repository.findOne({ where: { nombre } });
    }

    async update(id: string, data: Partial<AccionEntity>): Promise<AccionEntity | null> {
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
        const queryBuilder = this.repository.createQueryBuilder('accion');
        queryBuilder.where('accion.nombre = :nombre', { nombre });
        
        if (excludeId) {
        queryBuilder.andWhere('accion.id != :excludeId', { excludeId });
        }
        
        const count = await queryBuilder.getCount();
        return count > 0;
    }

    async count(): Promise<number> {
        return await this.repository.count();
    }
}