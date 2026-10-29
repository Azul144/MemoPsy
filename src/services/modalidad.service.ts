// services/modalidad.service.ts
import { validate } from 'class-validator';
import { IModalidadRepository } from '../repositories/modalidad.repository';
import { CreateModalidadDto, UpdateModalidadDto, ModalidadResponseDto } from '../dto/modalidad.dto';

export interface IModalidadService {
  getAllModalidades(): Promise<ModalidadResponseDto[]>;
  getModalidadById(id: string): Promise<ModalidadResponseDto>;
  getModalidadByNombre(nombre: string): Promise<ModalidadResponseDto>;
  createModalidad(createDto: CreateModalidadDto): Promise<ModalidadResponseDto>;
  updateModalidad(id: string, updateDto: UpdateModalidadDto): Promise<ModalidadResponseDto>;
  deleteModalidad(id: string): Promise<void>;
  modalidadExists(id: string): Promise<boolean>;
  getModalidadesCount(): Promise<{ total: number }>;
}

export class ModalidadService implements IModalidadService {
  constructor(private readonly modalidadRepository: IModalidadRepository) {}

  async getAllModalidades(): Promise<ModalidadResponseDto[]> {
    try {
      const modalidades = await this.modalidadRepository.findAll();
      return modalidades.map(modalidad => new ModalidadResponseDto({
        id: modalidad.id!,
        nombre: modalidad.nombre
      }));
    } catch (error) {
      throw new Error(`Error al obtener modalidades: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getModalidadById(id: string): Promise<ModalidadResponseDto> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      const modalidad = await this.modalidadRepository.findById(id.trim());
      if (!modalidad) {
        throw new Error('Modalidad no encontrada');
      }

      return new ModalidadResponseDto({
        id: modalidad.id!,
        nombre: modalidad.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener modalidad: ${error}`);
    }
  }

  async getModalidadByNombre(nombre: string): Promise<ModalidadResponseDto> {
    try {
      if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre es requerido');
      }

      const modalidad = await this.modalidadRepository.findByNombre(nombre.trim());
      if (!modalidad) {
        throw new Error('Modalidad no encontrada');
      }

      return new ModalidadResponseDto({
        id: modalidad.id!,
        nombre: modalidad.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al obtener modalidad por nombre: ${error}`);
    }
  }

  async createModalidad(createDto: CreateModalidadDto): Promise<ModalidadResponseDto> {
    try {
      // Validar DTO
      const errors = await validate(createDto);
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );
        throw new Error(`Errores de validación: ${errorMessages.join('; ')}`);
      }

      const modalidad = await this.modalidadRepository.create(createDto);

      return new ModalidadResponseDto({
        id: modalidad.id!,
        nombre: modalidad.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al crear modalidad: ${error}`);
    }
  }

  async updateModalidad(id: string, updateDto: UpdateModalidadDto): Promise<ModalidadResponseDto> {
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

      // Verificar que la modalidad existe
      const existingModalidad = await this.modalidadRepository.findById(id.trim());
      if (!existingModalidad) {
        throw new Error('Modalidad no encontrada');
      }

      const updatedModalidad = await this.modalidadRepository.update(id.trim(), updateDto);
      if (!updatedModalidad) {
        throw new Error('Error al actualizar la modalidad');
      }

      return new ModalidadResponseDto({
        id: updatedModalidad.id!,
        nombre: updatedModalidad.nombre
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al actualizar modalidad: ${error}`);
    }
  }

  async deleteModalidad(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('El ID es requerido');
      }

      // Verificar que la modalidad existe
      const existingModalidad = await this.modalidadRepository.findById(id.trim());
      if (!existingModalidad) {
        throw new Error('Modalidad no encontrada');
      }

      const deleted = await this.modalidadRepository.delete(id.trim());
      if (!deleted) {
        throw new Error('Error al eliminar la modalidad');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al eliminar modalidad: ${error}`);
    }
  }

  async modalidadExists(id: string): Promise<boolean> {
    try {
      if (!id || id.trim() === '') {
        return false;
      }

      return await this.modalidadRepository.exists(id.trim());
    } catch (error) {
      throw new Error(`Error al verificar existencia de la modalidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async getModalidadesCount(): Promise<{ total: number }> {
    try {
      const total = await this.modalidadRepository.count();
      return { total };
    } catch (error) {
      throw new Error(`Error al contar modalidades: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Métodos de utilidad adicionales
  async searchModalidadesByNombre(searchTerm: string): Promise<ModalidadResponseDto[]> {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return [];
      }

      const allModalidades = await this.modalidadRepository.findAll();
      const filteredModalidades = allModalidades.filter(modalidad => 
        modalidad.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );

      return filteredModalidades.map(modalidad => new ModalidadResponseDto({
        id: modalidad.id!,
        nombre: modalidad.nombre
      }));
    } catch (error) {
      throw new Error(`Error al buscar modalidades: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async validateModalidadName(nombre: string, excludeId?: string): Promise<boolean> {
    try {
      if (!nombre || nombre.trim() === '') {
        return false;
      }

      const existingModalidad = await this.modalidadRepository.findByNombre(nombre.trim());
      
      // Si no existe, es válido
      if (!existingModalidad) {
        return true;
      }

      // Si existe pero es el mismo que estamos excluyendo (para updates), es válido
      if (excludeId && existingModalidad.id === excludeId) {
        return true;
      }

      // Si existe y no es el que estamos excluyendo, no es válido
      return false;
    } catch (error) {
      throw new Error(`Error al validar nombre de la modalidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}