// repositories/obra-social.repository.ts
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ObraSocialEntity } from '../entities/obra-social.entity';
import { ObraSocialFiltersDto, BuscarObraSocialDto } from '../dto/obra-social.dto';

export interface IObraSocialRepository {
  create(obraSocial: Partial<ObraSocialEntity>): Promise<ObraSocialEntity>;
  findAll(filters?: ObraSocialFiltersDto): Promise<ObraSocialEntity[]>;
  findById(id: string): Promise<ObraSocialEntity | null>;
  findByNombre(nombre: string): Promise<ObraSocialEntity | null>;
  findWithPagination(
    page: number, 
    limit: number, 
    filters?: ObraSocialFiltersDto
  ): Promise<{
    obrasSociales: ObraSocialEntity[];
    total: number;
    totalPages: number;
  }>;
  searchObrasSociales(searchDto: BuscarObraSocialDto): Promise<ObraSocialEntity[]>;
  update(id: string, updateData: Partial<ObraSocialEntity>): Promise<ObraSocialEntity | null>;
  delete(id: string): Promise<boolean>;
  findActiveObrasSociales(): Promise<ObraSocialEntity[]>;
  getObrasSocialesStats(): Promise<{ totalActivas: number; totalInactivas: number; total: number }>;
}

export class ObraSocialRepository implements IObraSocialRepository {
  constructor(private repository: Repository<ObraSocialEntity>) {}

  async create(obraSocial: Partial<ObraSocialEntity>): Promise<ObraSocialEntity> {
    const newObraSocial = this.repository.create(obraSocial);
    return await this.repository.save(newObraSocial);
  }

  async findAll(filters?: ObraSocialFiltersDto): Promise<ObraSocialEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('obra_social');
    
    this.applyFilters(queryBuilder, filters);
    
    return await queryBuilder
      .orderBy('obra_social.nombre', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<ObraSocialEntity | null> {
    return await this.repository.findOne({
      where: { id }
    });
  }

  async findByNombre(nombre: string): Promise<ObraSocialEntity | null> {
    return await this.repository.findOne({
      where: { nombre }
    });
  }

  async findWithPagination(
    page: number, 
    limit: number, 
    filters?: ObraSocialFiltersDto
  ): Promise<{
    obrasSociales: ObraSocialEntity[];
    total: number;
    totalPages: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('obra_social');
    
    this.applyFilters(queryBuilder, filters);
    
    const offset = (page - 1) * limit;
    
    const [obrasSociales, total] = await queryBuilder
      .orderBy('obra_social.nombre', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      obrasSociales,
      total,
      totalPages
    };
  }

  async searchObrasSociales(searchDto: BuscarObraSocialDto): Promise<ObraSocialEntity[]> {
    const queryBuilder = this.repository.createQueryBuilder('obra_social');

    if (searchDto.termino) {
      queryBuilder.where(
        'obra_social.nombre ILIKE :termino',
        { termino: `%${searchDto.termino}%` }
      );
    }

    if (searchDto.soloActivas) {
      queryBuilder.andWhere('obra_social.activo = :activo', { activo: true });
    }

    return await queryBuilder
      .orderBy('obra_social.nombre', 'ASC')
      .getMany();
  }

  async update(id: string, updateData: Partial<ObraSocialEntity>): Promise<ObraSocialEntity | null> {
    const result = await this.repository.update(id, updateData);
    
    if (result.affected === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findActiveObrasSociales(): Promise<ObraSocialEntity[]> {
    return await this.repository.find({
      where: { activo: true },
      order: { nombre: 'ASC' }
    });
  }

  async getObrasSocialesStats(): Promise<{ totalActivas: number; totalInactivas: number; total: number }> {
    const [totalActivas, totalInactivas, total] = await Promise.all([
      this.repository.count({ where: { activo: true } }),
      this.repository.count({ where: { activo: false } }),
      this.repository.count()
    ]);

    return {
      totalActivas,
      totalInactivas,
      total
    };
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<ObraSocialEntity>, filters?: ObraSocialFiltersDto): void {
    if (!filters) return;

    if (filters.nombre) {
      queryBuilder.andWhere(
        'obra_social.nombre ILIKE :nombre',
        { nombre: `%${filters.nombre}%` }
      );
    }

    if (filters.activo !== undefined) {
      queryBuilder.andWhere('obra_social.activo = :activo', { activo: filters.activo });
    }
  }
}