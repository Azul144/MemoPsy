// services/estado.service.ts
import { validate } from 'class-validator';
import { IEstadoRepository } from '../repositories/estado.repository';
import { CreateEstadoDto, UpdateEstadoDto, EstadoResponseDto } from '../dto/estado.dto';

export interface IEstadoService {
  getAllEstados(): Promise<EstadoResponseDto[]>;
  getEstadoById(id: string): Promise<EstadoResponseDto>;
  getEstadoByNombre(nombre: string): Promise<EstadoResponseDto>;
  createEstado(createDto: CreateEstadoDto): Promise<EstadoResponseDto>;
  updateEstado(id: string, updateDto: UpdateEstadoDto): Promise<EstadoResponseDto>;
  deleteEstado(id: string): Promise<void>;
  estadoExists(id: string): Promise<boolean>;
  getEstadosCount(): Promise<{ total: number }>;
}

export class EstadoService implements IEstadoService {
  constructor(private readonly estadoRepository: IEstadoRepository) {}

  async getAllEstados(): Promise<EstadoResponseDto[]> {
    try {
      const estados = await this.estadoRepository.findAll();
      return estados.map(estado => new EstadoResponseDto({
        id: estado.id!,
        nombre: estado.nombre
      }));
    } catch (error) {
      throw new Error(`Error al obtener estados: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getEstadoById(id: string): Promise<EstadoResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      const estado = await this.estadoRepository.findById(id.trim());
      if (!estado) {
        throw new Error('Estado no encontrado');
      }

      return new EstadoResponseDto({
        id: estado.id!,
        nombre: estado.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener estado: ${error}`);
    }
  }

  async getEstadoByNombre(nombre: string): Promise<EstadoResponseDto> {
    try {
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre es requerido');
      }

      const estado = await this.estadoRepository.findByNombre(nombre.trim());
      if (!estado) {
        throw new Error('Estado no encontrado');
      }

      return new EstadoResponseDto({
        id: estado.id!,
        nombre: estado.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener estado por nombre: ${error}`);
    }
  }

  async createEstado(createDto: CreateEstadoDto): Promise<EstadoResponseDto> {
    try {
      // Validar DTO
      const errors = await validate(createDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        throw new Error(`Errores de validación: ${errorMessages.join('; ')}`);
      }

      const estado = await this.estadoRepository.create(createDto);

      return new EstadoResponseDto({
        id: estado.id!,
        nombre: estado.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al crear estado: ${error}`);
    }
  }

  async updateEstado(id: string, updateDto: UpdateEstadoDto): Promise<EstadoResponseDto> {
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

      // Verificar que el estado existe
      const existingEstado = await this.estadoRepository.findById(id.trim());
      if (!existingEstado) {
        throw new Error('Estado no encontrado');
      }

      const updatedEstado = await this.estadoRepository.update(id.trim(), updateDto);
      if (!updatedEstado) {
        throw new Error('Error al actualizar el estado');
      }

      return new EstadoResponseDto({
        id: updatedEstado.id!,
        nombre: updatedEstado.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al actualizar estado: ${error}`);
    }
  }

  async deleteEstado(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      // Verificar que el estado existe
      const existingEstado = await this.estadoRepository.findById(id.trim());
      if (!existingEstado) {
        throw new Error('Estado no encontrado');
      }

      const deleted = await this.estadoRepository.delete(id.trim());
      if (!deleted) {
        throw new Error('Error al eliminar el estado');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al eliminar estado: ${error}`);
    }
  }

  async estadoExists(id: string): Promise<boolean> {
    try {
      if (!id || id.trim() === '') {
        return false;
      }

      return await this.estadoRepository.exists(id.trim());
    } catch (error) {
      throw new Error(`Error al verificar existencia del estado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getEstadosCount(): Promise<{ total: number }> {
    try {
      const total = await this.estadoRepository.count();
      return { total };
    } catch (error) {
      throw new Error(`Error al contar estados: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Métodos de utilidad adicionales
  async searchEstadosByNombre(searchTerm: string): Promise<EstadoResponseDto[]> {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return [];
      }

      const allEstados = await this.estadoRepository.findAll();
      const filteredEstados = allEstados.filter(estado => 
        estado.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );

      return filteredEstados.map(estado => new EstadoResponseDto({
        id: estado.id!,
        nombre: estado.nombre
      }));
    } catch (error) {
      throw new Error(`Error al buscar estados: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async validateEstadoName(nombre: string, excludeId?: string): Promise<boolean> {
    try {
      if (!nombre || nombre.trim() === '') {
        return false;
      }

      const existingEstado = await this.estadoRepository.findByNombre(nombre.trim());
      
      // Si no existe, es válido
      if (!existingEstado) {
        return true;
      }

      // Si existe pero es el mismo que estamos excluyendo (para updates), es válido
      if (excludeId && existingEstado.id === excludeId) {
        return true;
      }

      // Si existe y no es el que estamos excluyendo, no es válido
      return false;
    } catch (error) {
      throw new Error(`Error al validar nombre del estado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}