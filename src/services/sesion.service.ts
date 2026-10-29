// services/sesion.service.ts
import { validate } from 'class-validator';
import { SesionRepository } from '../repositories/sesion.repository';
import { ModalidadService } from './modalidad.service';
import { EstadoService } from './estado.service';
import { PsicologoService } from './psicologo.service';
import { CreateSesionDto, UpdateSesionDto, SesionResponseDto, SesionQueryDto, PaginatedSesionResponseDto } from '../dto/sesion.dto';

export interface ISesionService {
  getAllSesiones(queryDto?: SesionQueryDto): Promise<PaginatedSesionResponseDto>;
  getSesionById(id: string): Promise<SesionResponseDto>;
  createSesion(createDto: CreateSesionDto): Promise<SesionResponseDto>;
  updateSesion(id: string, updateDto: UpdateSesionDto): Promise<SesionResponseDto>;
  deleteSesion(id: string): Promise<void>;
  restoreSesion(id: string): Promise<void>;
  getSesionesByPsicologo(psicologoId: string, queryDto?: SesionQueryDto): Promise<PaginatedSesionResponseDto>;
  getSesionesByDateRange(fechaInicio: string, fechaFin: string, queryDto?: SesionQueryDto): Promise<PaginatedSesionResponseDto>;
  getSesionesByEstado(estadoId: string, queryDto?: SesionQueryDto): Promise<PaginatedSesionResponseDto>;
  checkTimeConflict(psicologoId: string, fechaInicio: string, fechaFin: string, excludeId?: string): Promise<boolean>;
  getSesionesStats(): Promise<{
    total: number;
    porEstado: { estado: string; count: number }[];
    porModalidad: { modalidad: string; count: number }[];
  }>;
}

export class SesionService implements ISesionService {
  constructor(
    private readonly sesionRepository: SesionRepository,
    private readonly psicologoService: PsicologoService,
    private readonly modalidadService: ModalidadService,
    private readonly estadoService: EstadoService
  ) {}

  async getAllSesiones(queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
    try {
      return await this.sesionRepository.findAll(queryDto);
    } catch (error) {
      throw new Error(`Error al obtener sesiones: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getSesionById(id: string): Promise<SesionResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      const sesion = await this.sesionRepository.findById(id.trim());
      if (!sesion) {
        throw new Error('Sesión no encontrada');
      }

      return sesion;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener sesión: ${error}`);
    }
  }

  async createSesion(createDto: CreateSesionDto): Promise<SesionResponseDto> {
    try {
      // Validar DTO
      const errors = await validate(createDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        throw new Error(`Errores de validación: ${errorMessages.join('; ')}`);
      }

      // Validar fechas
      await this.validateDatesAndTime(createDto.fechaHoraInicio, createDto.fechaHoraFin);

      // Verificar que el psicólogo existe
      const psicologoExists = await this.psicologoService.findById(createDto.psicologoId);
      if (!psicologoExists) {
        throw new Error('El psicólogo especificado no existe');
      }

      // Verificar que la modalidad existe
      const modalidadExists = await this.modalidadService.getModalidadById(createDto.modalidadId);
      if (!modalidadExists) {
        throw new Error('La modalidad especificada no existe');
      }

      // Verificar que el estado existe
      const estadoExists = await this.estadoService.getEstadoById(createDto.estadoId);
      if (!estadoExists) {
        throw new Error('El estado especificado no existe');
      }

      // Verificar conflictos de horario
      const hasConflict = await this.checkTimeConflict(
        createDto.psicologoId,
        createDto.fechaHoraInicio,
        createDto.fechaHoraFin
      );

      if (hasConflict) {
        throw new Error('El psicólogo ya tiene una sesión programada en ese horario');
      }

      const sesion = await this.sesionRepository.create(createDto);
      return sesion;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al crear sesión: ${error}`);
    }
  }

  async updateSesion(id: string, updateDto: UpdateSesionDto): Promise<SesionResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      // Validar DTO
      const errors = await validate(updateDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        throw new Error(`Errores de validación: ${errorMessages.join('; ')}`);
      }

      // Verificar que la sesión existe
      const existingSesion = await this.sesionRepository.findById(id.trim());
      if (!existingSesion) {
        throw new Error('Sesión no encontrada');
      }

      // Validar fechas si se proporcionan
      if (updateDto.fechaHoraInicio || updateDto.fechaHoraFin) {
        const fechaInicio = updateDto.fechaHoraInicio || existingSesion.fechaHoraInicio.toISOString();
        const fechaFin = updateDto.fechaHoraFin || existingSesion.fechaHoraFin.toISOString();
        await this.validateDatesAndTime(fechaInicio, fechaFin);
      }

      // Verificar que el psicólogo existe si se está actualizando
      if (updateDto.psicologoId) {
        const psicologoExists = await this.psicologoService.findById(updateDto.psicologoId);
        if (!psicologoExists) {
          throw new Error('El psicólogo especificado no existe');
        }
      }

      // Verificar que la modalidad existe si se está actualizando
      if (updateDto.modalidadId) {
        const modalidadExists = await this.modalidadService.getModalidadById(updateDto.modalidadId);
        if (!modalidadExists) {
          throw new Error('La modalidad especificada no existe');
        }
      }

      // Verificar que el estado existe si se está actualizando
      if (updateDto.estadoId) {
        const estadoExists = await this.estadoService.getEstadoById(updateDto.estadoId);
        if (!estadoExists) {
          throw new Error('El estado especificado no existe');
        }
      }

      // Verificar conflictos de horario si se actualizan fechas o psicólogo
      if (updateDto.fechaHoraInicio || updateDto.fechaHoraFin || updateDto.psicologoId) {
        const psicologoId = updateDto.psicologoId || existingSesion.psicologo?.id;
        const fechaInicio = updateDto.fechaHoraInicio || existingSesion.fechaHoraInicio.toISOString();
        const fechaFin = updateDto.fechaHoraFin || existingSesion.fechaHoraFin.toISOString();

        if (psicologoId) {
          const hasConflict = await this.checkTimeConflict(
            psicologoId,
            fechaInicio,
            fechaFin,
            id.trim()
          );

          if (hasConflict) {
            throw new Error('El psicólogo ya tiene una sesión programada en ese horario');
          }
        }
      }

      const updatedSesion = await this.sesionRepository.update(id.trim(), updateDto);
      if (!updatedSesion) {
        throw new Error('Error al actualizar la sesión');
      }

      return updatedSesion;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al actualizar sesión: ${error}`);
    }
  }

  async deleteSesion(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      // Verificar que la sesión existe
      const existingSesion = await this.sesionRepository.findById(id.trim());
      if (!existingSesion) {
        throw new Error('Sesión no encontrada');
      }

      const deleted = await this.sesionRepository.delete(id.trim());
      if (!deleted) {
        throw new Error('Error al eliminar la sesión');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al eliminar sesión: ${error}`);
    }
  }

  async restoreSesion(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      const restored = await this.sesionRepository.restore(id.trim());
      if (!restored) {
        throw new Error('Error al restaurar la sesión o la sesión no existe');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al restaurar sesión: ${error}`);
    }
  }

  async getSesionesByPsicologo(psicologoId: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
    try {
      if (!psicologoId || psicologoId.trim() === '') {
        throw new Error('El ID del psicólogo es requerido');
      }

      // Verificar que el psicólogo existe
      const psicologoExists = await this.psicologoService.findById(psicologoId.trim());
      if (!psicologoExists) {
        throw new Error('El psicólogo especificado no existe');
      }

      return await this.sesionRepository.findByPsicologo(psicologoId.trim(), queryDto);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener sesiones por psicólogo: ${error}`);
    }
  }

  async getSesionesByDateRange(fechaInicio: string, fechaFin: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
    try {
      if (!fechaInicio || !fechaFin) {
        throw new Error('Las fechas de inicio y fin son requeridas');
      }

      // Validar formato de fechas
      const startDate = new Date(fechaInicio);
      const endDate = new Date(fechaFin);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Las fechas proporcionadas no son válidas');
      }

      if (startDate >= endDate) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      return await this.sesionRepository.findByDateRange(fechaInicio, fechaFin, queryDto);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener sesiones por rango de fechas: ${error}`);
    }
  }

  async getSesionesByEstado(estadoId: string, queryDto: SesionQueryDto = {}): Promise<PaginatedSesionResponseDto> {
    try {
      if (!estadoId || estadoId.trim() === '') {
        throw new Error('El ID del estado es requerido');
      }

      // Verificar que el estado existe
      const estadoExists = await this.estadoService.getEstadoById(estadoId.trim());
      if (!estadoExists) {
        throw new Error('El estado especificado no existe');
      }

      return await this.sesionRepository.findByEstado(estadoId.trim(), queryDto);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener sesiones por estado: ${error}`);
    }
  }

  async checkTimeConflict(psicologoId: string, fechaInicio: string, fechaFin: string, excludeId?: string): Promise<boolean> {
    try {
      if (!psicologoId || !fechaInicio || !fechaFin) {
        throw new Error('Los parámetros psicologoId, fechaInicio y fechaFin son requeridos');
      }

      const startDate = new Date(fechaInicio);
      const endDate = new Date(fechaFin);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Las fechas proporcionadas no son válidas');
      }

      return await this.sesionRepository.checkTimeConflict(
        psicologoId.trim(),
        startDate,
        endDate,
        excludeId?.trim()
      );
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al verificar conflicto de horario: ${error}`);
    }
  }

  async getSesionesStats(): Promise<{
    total: number;
    porEstado: { estado: string; count: number }[];
    porModalidad: { modalidad: string; count: number }[];
  }> {
    try {
      return await this.sesionRepository.getStats();
    } catch (error) {
      throw new Error(`Error al obtener estadísticas de sesiones: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Métodos de utilidad adicionales
  async validateSesionBusinessRules(createDto: CreateSesionDto): Promise<void> {
    try {
      // Validar que la sesión no sea en el pasado (opcional, depende de reglas de negocio)
      const startDate = new Date(createDto.fechaHoraInicio);
      const now = new Date();
      
      if (startDate < now) {
        throw new Error('No se pueden crear sesiones en el pasado');
      }

      // Validar duración mínima y máxima de la sesión
      const endDate = new Date(createDto.fechaHoraFin);
      const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      
      if (durationInMinutes < 15) {
        throw new Error('La duración mínima de una sesión debe ser de 15 minutos');
      }
      
      if (durationInMinutes > 480) { // 8 horas
        throw new Error('La duración máxima de una sesión debe ser de 8 horas');
      }

      // Validar horarios de trabajo (ejemplo: 8:00 - 18:00)
      const startHour = startDate.getHours();
      const endHour = endDate.getHours();
      
      if (startHour < 8 || endHour > 18) {
        throw new Error('Las sesiones deben programarse entre las 8:00 y las 18:00 horas');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al validar reglas de negocio: ${error}`);
    }
  }

  private async validateDatesAndTime(fechaInicio: string, fechaFin: string): Promise<void> {
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Las fechas proporcionadas no son válidas');
    }

    if (startDate >= endDate) {
      throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Validar que las fechas no estén muy en el futuro (ejemplo: máximo 1 año)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (startDate > oneYearFromNow) {
      throw new Error('No se pueden programar sesiones con más de un año de anticipación');
    }
  }

  async getSesionesUpcoming(psicologoId?: string, days: number = 7): Promise<SesionResponseDto[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      const queryDto: SesionQueryDto = {
        fechaInicio: now.toISOString(),
        fechaFin: futureDate.toISOString(),
        limit: 100 // Límite alto para obtener todas las próximas sesiones
      };

      if (psicologoId) {
        queryDto.psicologoId = psicologoId;
      }

      const result = await this.sesionRepository.findAll(queryDto);
      return result.data;
    } catch (error) {
      throw new Error(`Error al obtener sesiones próximas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async cancelSesion(id: string): Promise<void> {
    try {
      // Buscar un estado "Cancelada" 
      const allEstados = await this.estadoService.getAllEstados();
      const estadoCancelada = allEstados.find(estado => 
        estado.nombre.toLowerCase().includes('cancelad')
      );

      if (!estadoCancelada) {
        throw new Error('No se encontró un estado "Cancelada" en el sistema');
      }

      const existingSesion = await this.sesionRepository.findById(id.trim());
      if (!existingSesion) {
        throw new Error('Sesión no encontrada');
      }

      await this.updateSesion(id, {
        estadoId: estadoCancelada.id,
        fechaHoraInicio: existingSesion.fechaHoraInicio.toISOString(),
        fechaHoraFin: existingSesion.fechaHoraFin.toISOString(),
        psicologoId: existingSesion.psicologo?.id || '',
        modalidadId: existingSesion.modalidad?.id || ''
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al cancelar sesión: ${error}`);
    }
  }
}