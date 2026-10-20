// repositories/sesion.repository.ts
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { SesionEntity } from '../entities/index';
import { CreateSesionDto, UpdateSesionDto, SesionQueryDto, SesionResponseDto, PaginatedSesionResponseDto } from '../dto/sesion.dto';

export class SesionRepository {
    private readonly repository: Repository<SesionEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(SesionEntity);
    }

    /**
     * Crear una nueva sesión
     */
    async create(createSesionDto: CreateSesionDto): Promise<SesionResponseDto> {
        const sesion = this.repository.create({
            fechaHoraInicio: new Date(createSesionDto.fechaHoraInicio),
            fechaHoraFin: new Date(createSesionDto.fechaHoraFin),
            psicologo: { id: createSesionDto.psicologoId },
            modalidad: { id: createSesionDto.modalidadId },
            estado: { id: createSesionDto.estadoId }
        });

        const savedSesion = await this.repository.save(sesion);
        const savedSesionWithRelations = await this.findByIdWithRelations(savedSesion.id);
        if (!savedSesionWithRelations) {
            throw new Error('Sesion not found after saving');
        }
        return this.mapToResponseDto(savedSesionWithRelations);
    }

    /**
     * Buscar sesión por ID con relaciones
     */
    async findById(id: string): Promise<SesionResponseDto | null> {
        const sesion = await this.findByIdWithRelations(id);
        return sesion ? this.mapToResponseDto(sesion) : null;
    }

    /**
     * Buscar sesión por ID con relaciones (método interno)
     */
    private async findByIdWithRelations(id: string): Promise<SesionEntity | null> {
        return await this.repository.findOne({
            where: { id },
            relations: ['psicologo', 'modalidad', 'estado']
        });
    }

    /**
     * Buscar todas las sesiones con filtros y paginación
     */
    async findAll(queryDto: SesionQueryDto): Promise<PaginatedSesionResponseDto> {
        const { page = 1, limit = 10, search, psicologoId, modalidadId, estadoId, fechaInicio, fechaFin } = queryDto;
        
        const queryBuilder = this.repository.createQueryBuilder('sesion')
            .leftJoinAndSelect('sesion.psicologo', 'psicologo')
            .leftJoinAndSelect('sesion.modalidad', 'modalidad')
            .leftJoinAndSelect('sesion.estado', 'estado');

        // Aplicar filtros
        this.applyFilters(queryBuilder, { search, psicologoId, modalidadId, estadoId, fechaInicio, fechaFin });

        // Ordenar por fecha de inicio descendente
        queryBuilder.orderBy('sesion.fechaHoraInicio', 'DESC');

        // Aplicar paginación
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [sesiones, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / limit);

        return new PaginatedSesionResponseDto({
            data: sesiones.map(sesion => this.mapToResponseDto(sesion)),
            total,
            page,
            limit,
            totalPages
        });
    }

    /**
     * Actualizar una sesión
     */
    async update(id: string, updateSesionDto: UpdateSesionDto): Promise<SesionResponseDto | null> {
        const sesion = await this.repository.findOne({ where: { id } });
        if (!sesion) {
            return null;
        }

        // Construir objeto de actualización
        const updateData: any = {};
        
        if (updateSesionDto.fechaHoraInicio) {
            updateData.fechaHoraInicio = new Date(updateSesionDto.fechaHoraInicio);
        }
        
        if (updateSesionDto.fechaHoraFin) {
            updateData.fechaHoraFin = new Date(updateSesionDto.fechaHoraFin);
        }
        
        if (updateSesionDto.psicologoId) {
            updateData.psicologo = { id: updateSesionDto.psicologoId };
        }
        
        if (updateSesionDto.modalidadId) {
            updateData.modalidad = { id: updateSesionDto.modalidadId };
        }
        
        if (updateSesionDto.estadoId) {
            updateData.estado = { id: updateSesionDto.estadoId };
        }

        await this.repository.update(id, updateData);
        return this.findById(id);
    }

    /**
     * Eliminar una sesión (soft delete)
     */
    async delete(id: string): Promise<boolean> {
        const result = await this.repository.softDelete(id);
        return (result.affected ?? 0) > 0;
    }

    /**
     * Restaurar una sesión eliminada
     */
    async restore(id: string): Promise<boolean> {
        const result = await this.repository.restore(id);
        return (result.affected ?? 0) > 0;
    }

    /**
     * Buscar sesiones por psicólogo
     */
    async findByPsicologo(psicologoId: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
        return this.findAll({ ...queryDto, psicologoId });
    }

    /**
     * Buscar sesiones por rango de fechas
     */
    async findByDateRange(fechaInicio: string, fechaFin: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
        return this.findAll({ ...queryDto, fechaInicio, fechaFin });
    }

    /**
     * Buscar sesiones por estado
     */
    async findByEstado(estadoId: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
        return this.findAll({ ...queryDto, estadoId });
    }

    /**
     * Verificar si existe conflicto de horario para un psicólogo
     */
    async checkTimeConflict(psicologoId: string, fechaInicio: Date, fechaFin: Date, excludeId?: string): Promise<boolean> {
        const queryBuilder = this.repository.createQueryBuilder('sesion')
            .where('sesion.psicologo.id = :psicologoId', { psicologoId })
            .andWhere('(sesion.fechaHoraInicio < :fechaFin AND sesion.fechaHoraFin > :fechaInicio)', {
                fechaInicio,
                fechaFin
            });

        if (excludeId) {
            queryBuilder.andWhere('sesion.id != :excludeId', { excludeId });
        }

        const count = await queryBuilder.getCount();
        return count > 0;
    }

    /**
     * Obtener estadísticas básicas de sesiones
     */
    async getStats(): Promise<{
        total: number;
        porEstado: { estado: string; count: number }[];
        porModalidad: { modalidad: string; count: number }[];
    }> {
        const total = await this.repository.count();

        const porEstado = await this.repository
            .createQueryBuilder('sesion')
            .leftJoin('sesion.estado', 'estado')
            .select('estado.nombre', 'estado')
            .addSelect('COUNT(sesion.id)', 'count')
            .groupBy('estado.id')
            .getRawMany();

        const porModalidad = await this.repository
            .createQueryBuilder('sesion')
            .leftJoin('sesion.modalidad', 'modalidad')
            .select('modalidad.nombre', 'modalidad')
            .addSelect('COUNT(sesion.id)', 'count')
            .groupBy('modalidad.id')
            .getRawMany();

        return {
            total,
            porEstado: porEstado.map(item => ({
                estado: item.estado,
                count: parseInt(item.count)
            })),
            porModalidad: porModalidad.map(item => ({
                modalidad: item.modalidad,
                count: parseInt(item.count)
            }))
        };
    }

    /**
     * Aplicar filtros al query builder
     */
    private applyFilters(
        queryBuilder: SelectQueryBuilder<SesionEntity>,
        filters: {
            search?: string;
            psicologoId?: string;
            modalidadId?: string;
            estadoId?: string;
            fechaInicio?: string;
            fechaFin?: string;
        }
    ): void {
        const { search, psicologoId, modalidadId, estadoId, fechaInicio, fechaFin } = filters;

        if (search) {
            queryBuilder.andWhere(
                '(psicologo.nombre LIKE :search OR psicologo.apellido LIKE :search OR modalidad.nombre LIKE :search OR estado.nombre LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (psicologoId) {
            queryBuilder.andWhere('sesion.psicologo.id = :psicologoId', { psicologoId });
        }

        if (modalidadId) {
            queryBuilder.andWhere('sesion.modalidad.id = :modalidadId', { modalidadId });
        }

        if (estadoId) {
            queryBuilder.andWhere('sesion.estado.id = :estadoId', { estadoId });
        }

        if (fechaInicio) {
            queryBuilder.andWhere('sesion.fechaHoraInicio >= :fechaInicio', { 
                fechaInicio: new Date(fechaInicio) 
            });
        }

        if (fechaFin) {
            queryBuilder.andWhere('sesion.fechaHoraFin <= :fechaFin', { 
                fechaFin: new Date(fechaFin) 
            });
        }
    }

    /**
     * Mapear entidad a DTO de respuesta
     */
    private mapToResponseDto(sesion: SesionEntity): SesionResponseDto {
        return new SesionResponseDto({
            id: sesion.id,
            fechaHoraInicio: sesion.fechaHoraInicio,
            fechaHoraFin: sesion.fechaHoraFin,
            psicologo: sesion.psicologo ? {
                id: sesion.psicologo.id,
                especialidad: sesion.psicologo.especialidad,
                numeroLicencia: sesion.psicologo.numeroLicencia,
                persona: sesion.psicologo.persona ? {
                    id: sesion.psicologo.persona.id,
                    nombre: sesion.psicologo.persona.nombre,
                    apellido: sesion.psicologo.persona.apellido,
                    dni: sesion.psicologo.persona.dni,
                    fechaNacimiento: sesion.psicologo.persona.fechaNacimiento,
                } : undefined,
            } : undefined,
            modalidad: sesion.modalidad ? {
                id: sesion.modalidad.id,
                nombre: sesion.modalidad.nombre,
                // Agregar otros campos según tu ModalidadResponseDto
            } : undefined,
            estado: sesion.estado ? {
                id: sesion.estado.id,
                nombre: sesion.estado.nombre,
                // Agregar otros campos según tu EstadoResponseDto
            } : undefined
        });
    }
}