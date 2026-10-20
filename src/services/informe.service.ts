// services/informe.service.ts
import { InformeRepository } from '../repositories/informe.repository';
import { PsicologoRepository } from '../repositories/psicologo.repository';
import { Informe } from '../models/informe.model';
import { Psicologo } from '../models/psicologo.model';
import { PsicologoResponseDto } from '@/dto/psicologo.dto';
import { 
  CreateInformeDto, 
  UpdateInformeDto, 
  InformeResponseDto,
  InformeQueryDto,
  PaginatedInformeResponseDto,
  InformeStatsDto
} from '../dto/informe.dto';

export class InformeService {
  constructor(
    private informeRepository: InformeRepository,
    private psicologoRepository: PsicologoRepository
  ) {}

  // Crear un nuevo informe
  async create(createDto: CreateInformeDto): Promise<InformeResponseDto> {
    try {
      // Verificar que el psicólogo existe
      const psicologoEntity = await this.psicologoRepository.findById(createDto.psicologoId);
      if (!psicologoEntity) {
        throw new Error('El psicólogo especificado no existe');
      }

      // Crear el informe usando el modelo de dominio para validaciones
      const informeModel = new Informe({
        titulo: createDto.titulo,
        contenido: createDto.contenido,
        fechaCreacion: new Date(createDto.fechaCreacion),
        esPrivado: createDto.esPrivado,
        psicologo: Psicologo.fromEntity(psicologoEntity)
      });

      // Convertir a entidad y guardar
      const informeEntity = await this.informeRepository.create({
        ...informeModel.toEntity(),
        psicologo: psicologoEntity
      });

      // Buscar la entidad completa con relaciones
      const savedInforme = await this.informeRepository.findById(informeEntity.id);
      if (!savedInforme) {
        throw new Error('Error al recuperar el informe creado');
      }

      return this.mapToResponseDto(savedInforme);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al crear informe: ${error.message}`);
      }
      throw new Error('Error desconocido al crear informe');
    }
  }

  // Obtener informe por ID
  async findById(id: string): Promise<InformeResponseDto> {
    const informeEntity = await this.informeRepository.findById(id);
    if (!informeEntity) {
      throw new Error('Informe no encontrado');
    }
    return this.mapToResponseDto(informeEntity);
  }

  // Obtener todos los informes con filtros y paginación
  async findAll(queryDto: InformeQueryDto): Promise<PaginatedInformeResponseDto> {
    const { data, total } = await this.informeRepository.findAll(queryDto);
    
    const informes = data.map(entity => this.mapToResponseDto(entity));
    
    const totalPages = Math.ceil(total / (queryDto.limit || 10));

    return new PaginatedInformeResponseDto({
      data: informes,
      total,
      page: queryDto.page || 1,
      limit: queryDto.limit || 10,
      totalPages
    });
  }

  // Obtener informes por psicólogo
  async findByPsicologoId(psicologoId: string): Promise<InformeResponseDto[]> {
    // Verificar que el psicólogo existe
    const psicologoEntity = await this.psicologoRepository.findById(psicologoId);
    if (!psicologoEntity) {
      throw new Error('El psicólogo especificado no existe');
    }

    const informes = await this.informeRepository.findByPsicologoId(psicologoId);
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Actualizar informe
  async update(id: string, updateDto: UpdateInformeDto): Promise<InformeResponseDto> {
    try {
      // Verificar que el informe existe
      const existingInforme = await this.informeRepository.findById(id);
      if (!existingInforme) {
        throw new Error('Informe no encontrado');
      }

      // Verificar que el nuevo psicólogo existe si se está actualizando
      if (updateDto.psicologoId) {
        const psicologoEntity = await this.psicologoRepository.findById(updateDto.psicologoId);
        if (!psicologoEntity) {
          throw new Error('El psicólogo especificado no existe');
        }
      }

      // Crear modelo actualizado para validaciones
      const updatedData = {
        ...existingInforme,
        ...updateDto,
        fechaCreacion: updateDto.fechaCreacion ? new Date(updateDto.fechaCreacion) : existingInforme.fechaCreacion
      };

      const informeModel = new Informe({
        id: existingInforme.id,
        titulo: updatedData.titulo,
        contenido: updatedData.contenido,
        fechaCreacion: updatedData.fechaCreacion,
        esPrivado: updatedData.esPrivado,
        psicologo: existingInforme.psicologo ? Psicologo.fromEntity(existingInforme.psicologo) : undefined
      });

      // Preparar datos de actualización
      const updateData: any = {};
      if (updateDto.titulo !== undefined) updateData.titulo = updateDto.titulo;
      if (updateDto.contenido !== undefined) updateData.contenido = updateDto.contenido;
      if (updateDto.fechaCreacion !== undefined) updateData.fechaCreacion = new Date(updateDto.fechaCreacion);
      if (updateDto.esPrivado !== undefined) updateData.esPrivado = updateDto.esPrivado;
      
      // Si se actualiza el psicólogo, agregar la relación
      if (updateDto.psicologoId) {
        const psicologoEntity = await this.psicologoRepository.findById(updateDto.psicologoId);
        if (psicologoEntity) {
          updateData.psicologo = psicologoEntity;
        }
      }

      // Actualizar
      const updatedInforme = await this.informeRepository.update(id, updateData);

      if (!updatedInforme) {
        throw new Error('Error al actualizar el informe');
      }

      return this.mapToResponseDto(updatedInforme);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al actualizar informe: ${error.message}`);
      }
      throw new Error('Error desconocido al actualizar informe');
    }
  }

  // Eliminar informe
  async delete(id: string): Promise<boolean> {
    const existingInforme = await this.informeRepository.findById(id);
    if (!existingInforme) {
      throw new Error('Informe no encontrado');
    }

    return await this.informeRepository.delete(id);
  }

  // Búsqueda avanzada
  async search(searchTerm: string): Promise<InformeResponseDto[]> {
    const informes = await this.informeRepository.search(searchTerm);
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Obtener informes públicos
  async findPublicos(): Promise<InformeResponseDto[]> {
    const informes = await this.informeRepository.findPublicos();
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Obtener informes privados
  async findPrivados(): Promise<InformeResponseDto[]> {
    const informes = await this.informeRepository.findPrivados();
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Obtener informes por rango de fechas
  async findByDateRange(fechaDesde: string, fechaHasta: string): Promise<InformeResponseDto[]> {
    const informes = await this.informeRepository.findByDateRange(
      new Date(fechaDesde), 
      new Date(fechaHasta)
    );
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Obtener estadísticas
  async getStats(): Promise<InformeStatsDto> {
    const stats = await this.informeRepository.getStats();
    return new InformeStatsDto(stats);
  }

  // Contar informes por psicólogo
  async countByPsicologo(psicologoId: string): Promise<number> {
    // Verificar que el psicólogo existe
    const psicologoEntity = await this.psicologoRepository.findById(psicologoId);
    if (!psicologoEntity) {
      throw new Error('El psicólogo especificado no existe');
    }

    return await this.informeRepository.countByPsicologo(psicologoId);
  }

  // Obtener informes recientes
  async findRecent(limit: number = 10): Promise<InformeResponseDto[]> {
    const informes = await this.informeRepository.findRecent(limit);
    return informes.map(entity => this.mapToResponseDto(entity));
  }

  // Mapear entidad a DTO de respuesta
  public mapToResponseDto(entity: any): InformeResponseDto {
    return new InformeResponseDto({
      id: entity.id,
      titulo: entity.titulo,
      contenido: entity.contenido,
      fechaCreacion: entity.fechaCreacion,
      esPrivado: entity.esPrivado,
      psicologo: entity.psicologo ? new PsicologoResponseDto({
        id: entity.psicologo.id,
        especialidad: entity.psicologo.especialidad,
        numeroLicencia: entity.psicologo.numeroLicencia,
        persona: entity.psicologo.persona ? {
          id: entity.psicologo.persona.id,
          nombre: entity.psicologo.persona.nombre,
          apellido: entity.psicologo.persona.apellido,
          dni: entity.psicologo.persona.dni,
          fechaNacimiento: entity.psicologo.persona.fechaNacimiento,
        } : undefined,
      }) : undefined,
      //createdAt: entity.createdAt,
      //updatedAt: entity.updatedAt
    });
  }
}