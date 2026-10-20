// accion.service.ts
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AccionRepository } from '../repositories/accion.repository';
import { CreateAccionDto, UpdateAccionDto, AccionResponseDto } from '../dto/accion.dto';
import { Accion } from '../models/accion.model';
import { AccionEntity } from '../entities/accion.entity';

export class AccionService {
  constructor(private readonly accionRepository: AccionRepository) {}

  async create(createAccionDto: CreateAccionDto): Promise<AccionResponseDto> {
    // Verificar si ya existe una acción con el mismo nombre
    const existingAccion = await this.accionRepository.findByNombre(createAccionDto.nombre);
    if (existingAccion) {
      throw new ConflictException(`Ya existe una acción con el nombre: ${createAccionDto.nombre}`);
    }

    try {
      // Crear el modelo de dominio para validar
      const accionModel = new Accion({
        nombre: createAccionDto.nombre,
      });

      // Convertir a entidad y crear en la base de datos
      const accionEntity = await this.accionRepository.create(accionModel.toEntity());

      return this.mapToResponseDto(accionEntity);
    } catch (error) {
      if (error instanceof Error && error.message.includes('El nombre no puede estar vacío')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async findAll(): Promise<AccionResponseDto[]> {
    const acciones = await this.accionRepository.findAll({
      order: { nombre: 'ASC' },
    });

    return acciones.map(accion => this.mapToResponseDto(accion));
  }

  async findOne(id: string): Promise<AccionResponseDto> {
    const accion = await this.accionRepository.findById(id);
    
    if (!accion) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    return this.mapToResponseDto(accion);
  }

  async update(id: string, updateAccionDto: UpdateAccionDto): Promise<AccionResponseDto> {
    // Verificar si la acción existe
    const existingAccion = await this.accionRepository.findById(id);
    if (!existingAccion) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    // Si se está actualizando el nombre, verificar que no exista otra acción con ese nombre
    if (updateAccionDto.nombre) {
      const accionWithSameName = await this.accionRepository.existsByNombre(
        updateAccionDto.nombre,
        id
      );
      if (accionWithSameName) {
        throw new ConflictException(`Ya existe otra acción con el nombre: ${updateAccionDto.nombre}`);
      }

      try {
        // Validar usando el modelo de dominio
        const accionModel = Accion.fromEntity(existingAccion);
        accionModel.nombre = updateAccionDto.nombre;
      } catch (error) {
        if (error instanceof Error && error.message.includes('El nombre no puede estar vacío')) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }
    }

    const updatedAccion = await this.accionRepository.update(id, updateAccionDto);
    
    if (!updatedAccion) {
      throw new NotFoundException(`No se pudo actualizar la acción con ID ${id}`);
    }

    return this.mapToResponseDto(updatedAccion);
  }

  async remove(id: string): Promise<void> {
    // Verificar si la acción existe
    const exists = await this.accionRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Acción con ID ${id} no encontrada`);
    }

    const deleted = await this.accionRepository.delete(id);
    
    if (!deleted) {
      throw new NotFoundException(`No se pudo eliminar la acción con ID ${id}`);
    }
  }

  async count(): Promise<number> {
    return await this.accionRepository.count();
  }

  public mapToResponseDto(entity: AccionEntity): AccionResponseDto {
    return new AccionResponseDto({
      id: entity.id,
      nombre: entity.nombre,
    });
  }
}