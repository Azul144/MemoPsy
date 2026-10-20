// repositories/informe.repository.ts
import { Repository, DataSource, FindManyOptions, FindOneOptions, Between } from 'typeorm';
import { InformeEntity } from '../entities/informe.entity';
import { InformeQueryDto } from '../dto/informe.dto';
//import { AppDataSource } from '../lib/database';

export class InformeRepository {
  private repository: Repository<InformeEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(InformeEntity);
  }

  // Crear un nuevo informe
  async create(informeData: Partial<InformeEntity>): Promise<InformeEntity> {
    const informe = this.repository.create(informeData);
    return await this.repository.save(informe);
  }

  // Buscar informe por ID
  async findById(id: string): Promise<InformeEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['psicologo', 'psicologo.persona']
    });
  }

  // Buscar informes por psicólogo ID
  async findByPsicologoId(psicologoId: string): Promise<InformeEntity[]> {
    return await this.repository.find({
      where: { psicologo: { id: psicologoId } },
      relations: ['psicologo', 'psicologo.persona'],
      order: { fechaCreacion: 'DESC' }
    });
  }

  // Buscar todos los informes con filtros y paginación
  async findAll(queryDto: InformeQueryDto): Promise<{ data: InformeEntity[], total: number }> {
    const {
      titulo,
      contenido,
      psicologoId,
      esPrivado,
      fechaDesde,
      fechaHasta,
      nombrePsicologo,
      apellidoPsicologo,
      especialidadPsicologo,
      sortBy = 'fechaCreacion',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = queryDto;

    const queryBuilder = this.repository.createQueryBuilder('informe')
      .leftJoinAndSelect('informe.psicologo', 'psicologo')
      .leftJoinAndSelect('psicologo.persona', 'persona');

    // Aplicar filtros
    if (titulo) {
      queryBuilder.andWhere('informe.titulo LIKE :titulo', {
        titulo: `%${titulo}%`
      });
    }

    if (contenido) {
      queryBuilder.andWhere('informe.contenido LIKE :contenido', {
        contenido: `%${contenido}%`
      });
    }

    if (psicologoId) {
      queryBuilder.andWhere('psicologo.id = :psicologoId', {
        psicologoId
      });
    }

    if (esPrivado !== undefined) {
      queryBuilder.andWhere('informe.esPrivado = :esPrivado', {
        esPrivado
      });
    }

    // Filtros de fecha
    if (fechaDesde) {
      queryBuilder.andWhere('informe.fechaCreacion >= :fechaDesde', {
        fechaDesde: new Date(fechaDesde)
      });
    }

    if (fechaHasta) {
      queryBuilder.andWhere('informe.fechaCreacion <= :fechaHasta', {
        fechaHasta: new Date(fechaHasta)
      });
    }

    // Filtros por datos del psicólogo
    if (nombrePsicologo) {
      queryBuilder.andWhere('persona.nombre LIKE :nombrePsicologo', {
        nombrePsicologo: `%${nombrePsicologo}%`
      });
    }

    if (apellidoPsicologo) {
      queryBuilder.andWhere('persona.apellido LIKE :apellidoPsicologo', {
        apellidoPsicologo: `%${apellidoPsicologo}%`
      });
    }

    if (especialidadPsicologo) {
      queryBuilder.andWhere('psicologo.especialidad LIKE :especialidadPsicologo', {
        especialidadPsicologo: `%${especialidadPsicologo}%`
      });
    }

    // Aplicar ordenamiento
    let orderField = 'informe.fechaCreacion';
    if (sortBy === 'titulo') orderField = 'informe.titulo';
    if (sortBy === 'esPrivado') orderField = 'informe.esPrivado';

    queryBuilder.orderBy(orderField, sortOrder);

    // Aplicar paginación
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  // Actualizar informe
  async update(id: string, updateData: Partial<InformeEntity>): Promise<InformeEntity | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  // Eliminar informe (soft delete si BaseEntity lo soporta)
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }

  // Buscar informes públicos
  async findPublicos(): Promise<InformeEntity[]> {
    return await this.repository.find({
      where: { esPrivado: false },
      relations: ['psicologo', 'psicologo.persona'],
      order: { fechaCreacion: 'DESC' }
    });
  }

  // Buscar informes privados
  async findPrivados(): Promise<InformeEntity[]> {
    return await this.repository.find({
      where: { esPrivado: true },
      relations: ['psicologo', 'psicologo.persona'],
      order: { fechaCreacion: 'DESC' }
    });
  }

  // Buscar informes por rango de fechas
  async findByDateRange(fechaDesde: Date, fechaHasta: Date): Promise<InformeEntity[]> {
    return await this.repository.find({
      where: {
        fechaCreacion: Between(fechaDesde, fechaHasta)
      },
      relations: ['psicologo', 'psicologo.persona'],
      order: { fechaCreacion: 'DESC' }
    });
  }

  // Obtener estadísticas de informes
  async getStats(): Promise<{
    total: number;
    publicos: number;
    privados: number;
    porPsicologo: { psicologoId: string; nombrePsicologo: string; count: number }[];
    porMes: { mes: string; count: number }[];
  }> {
    // Total de informes
    const total = await this.repository.count();

    // Informes públicos y privados
    const publicos = await this.repository.count({ where: { esPrivado: false } });
    const privados = await this.repository.count({ where: { esPrivado: true } });

    // Informes por psicólogo
    const porPsicologoQuery = await this.repository
      .createQueryBuilder('informe')
      .leftJoin('informe.psicologo', 'psicologo')
      .leftJoin('psicologo.persona', 'persona')
      .select('psicologo.id', 'psicologoId')
      .addSelect('CONCAT(persona.nombre, " ", persona.apellido)', 'nombrePsicologo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('psicologo.id')
      .addGroupBy('persona.nombre')
      .addGroupBy('persona.apellido')
      .orderBy('count', 'DESC')
      .getRawMany();

    const porPsicologo = porPsicologoQuery.map(item => ({
      psicologoId: item.psicologoId,
      nombrePsicologo: item.nombrePsicologo,
      count: parseInt(item.count)
    }));

    // Informes por mes (últimos 12 meses)
    const porMesQuery = await this.repository
      .createQueryBuilder('informe')
      .select('DATE_FORMAT(informe.fechaCreacion, "%Y-%m")', 'mes')
      .addSelect('COUNT(*)', 'count')
      .where('informe.fechaCreacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH)')
      .groupBy('mes')
      .orderBy('mes', 'DESC')
      .getRawMany();

    const porMes = porMesQuery.map(item => ({
      mes: item.mes,
      count: parseInt(item.count)
    }));

    return {
      total,
      publicos,
      privados,
      porPsicologo,
      porMes
    };
  }

  // Método personalizado para búsqueda avanzada
  async search(searchTerm: string): Promise<InformeEntity[]> {
    return await this.repository
      .createQueryBuilder('informe')
      .leftJoinAndSelect('informe.psicologo', 'psicologo')
      .leftJoinAndSelect('psicologo.persona', 'persona')
      .where('informe.titulo LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('informe.contenido LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('persona.nombre LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('persona.apellido LIKE :term', { term: `%${searchTerm}%` })
      .orWhere('psicologo.especialidad LIKE :term', { term: `%${searchTerm}%` })
      .orderBy('informe.fechaCreacion', 'DESC')
      .getMany();
  }

  // Contar informes por psicólogo
  async countByPsicologo(psicologoId: string): Promise<number> {
    return await this.repository.count({
      where: { psicologo: { id: psicologoId } }
    });
  }

  // Buscar últimos informes
  async findRecent(limit: number = 10): Promise<InformeEntity[]> {
    return await this.repository.find({
      relations: ['psicologo', 'psicologo.persona'],
      order: { fechaCreacion: 'DESC' },
      take: limit
    });
  }
}