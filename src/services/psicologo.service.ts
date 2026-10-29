// services/psicologo.service.ts
import { PsicologoEntity } from '@/entities';
import { PsicologoRepository } from '../repositories/psicologo.repository';
import { PersonaRepository } from '../repositories/persona.repository'; // Asumiendo que existe
import { Psicologo } from '../models/psicologo.model';
import { Persona } from '../models/persona.model';
import { PersonaResponseDto } from '@/dto/persona.dto';
import { 
  CreatePsicologoDto, 
  UpdatePsicologoDto, 
  PsicologoResponseDto,
  PsicologoQueryDto,
  PaginatedPsicologoResponseDto,
  CreatePsicologoWithPersonaDto,
} from '../dto/psicologo.dto';

export class PsicologoService {
  constructor(
      private psicologoRepository: PsicologoRepository,
      private personaRepository: PersonaRepository
  ) {}

  // Crear un nuevo psicólogo
  async create(createDto: CreatePsicologoDto): Promise<PsicologoResponseDto> {
    try {
      // Verificar que la persona existe
      const personaEntity = await this.personaRepository.findById(createDto.personaId);
      if (!personaEntity) {
        throw new Error('La persona especificada no existe');
      }

      // Verificar que no existe otro psicólogo con el mismo número de licencia
      const existingPsicologo = await this.psicologoRepository.findByNumeroLicencia(createDto.numeroLicencia);
      if (existingPsicologo) {
        throw new Error('Ya existe un psicólogo con este número de licencia');
      }

      // Verificar que la persona no está ya asignada a otro psicólogo
      const existingPersonaPsicologo = await this.psicologoRepository.findByPersonaId(createDto.personaId);
      if (existingPersonaPsicologo) {
        throw new Error('Esta persona ya está asignada a otro psicólogo');
      }

      // Crear el psicólogo usando el modelo de dominio para validaciones
      const psicologoModel = new Psicologo({
        especialidad: createDto.especialidad,
        numeroLicencia: createDto.numeroLicencia,
        persona: Persona.fromEntity(personaEntity)
      });

      // Convertir a entidad y guardar
      const psicologoEntity = await this.psicologoRepository.create({
        ...psicologoModel.toEntity(),
        persona: personaEntity
      });

      // Buscar la entidad completa con relaciones
      const savedPsicologo = await this.psicologoRepository.findById(psicologoEntity.id);
      if (!savedPsicologo) {
        throw new Error('Error al recuperar el psicólogo creado');
      }

      return this.mapToResponseDto(savedPsicologo);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al crear psicólogo: ${error.message}`);
      }
      throw new Error('Error desconocido al crear psicólogo');
    }
  }

  // Crear psicólogo con persona en una sola operación (transaccional)
  async createWithPersona(createDto: CreatePsicologoWithPersonaDto): Promise<PsicologoResponseDto> {
    try {
      // Verificar que no existe otro psicólogo con el mismo número de licencia
      const existingPsicologo = await this.psicologoRepository.findByNumeroLicencia(createDto.numeroLicencia);
      if (existingPsicologo) {
        throw new Error('Ya existe un psicólogo con este número de licencia');
      }

      // Crear la persona primero
      const personaEntity = await this.personaRepository.create({
        ...createDto.persona,
        fechaNacimiento: new Date(createDto.persona.fechaNacimiento),
      });

      // Crear el psicólogo
      const psicologoModel = new Psicologo({
        especialidad: createDto.especialidad,
        numeroLicencia: createDto.numeroLicencia,
        persona: Persona.fromEntity(personaEntity)
      });

      const psicologoEntity = await this.psicologoRepository.create({
        ...psicologoModel.toEntity(),
        persona: personaEntity
      });

      const savedPsicologo = await this.psicologoRepository.findById(psicologoEntity.id);
      if (!savedPsicologo) {
        throw new Error('Error al recuperar el psicólogo creado');
      }

      return this.mapToResponseDto(savedPsicologo);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al crear psicólogo con persona: ${error.message}`);
      }
      throw new Error('Error desconocido al crear psicólogo con persona');
    }
  }

  // Obtener psicólogo por ID
  async findById(id: string): Promise<PsicologoResponseDto> {
    const psicologoEntity = await this.psicologoRepository.findById(id);
    if (!psicologoEntity) {
      throw new Error('Psicólogo no encontrado');
    }
    return this.mapToResponseDto(psicologoEntity);
  }

  // Obtener psicólogo por número de licencia
  async findByNumeroLicencia(numeroLicencia: string): Promise<PsicologoResponseDto> {
    const psicologoEntity = await this.psicologoRepository.findByNumeroLicencia(numeroLicencia);
    if (!psicologoEntity) {
      throw new Error('Psicólogo no encontrado');
    }
    return this.mapToResponseDto(psicologoEntity);
  }

  // Obtener todos los psicólogos con filtros y paginación
  async findAll(queryDto: PsicologoQueryDto): Promise<PaginatedPsicologoResponseDto> {
    const { data, total } = await this.psicologoRepository.findAll(queryDto);
    
    const psicologos = data.map(entity => this.mapToResponseDto(entity));
    
    const totalPages = Math.ceil(total / (queryDto.limit || 10));

    return new PaginatedPsicologoResponseDto({
      data: psicologos,
      total,
      page: queryDto.page || 1,
      limit: queryDto.limit || 10,
      totalPages
    });
  }

  // Actualizar psicólogo
  async update(id: string, updateDto: UpdatePsicologoDto): Promise<PsicologoResponseDto> {
    try {
      // Verificar que el psicólogo existe
      const existingPsicologo = await this.psicologoRepository.findById(id);
      if (!existingPsicologo) {
        throw new Error('Psicólogo no encontrado');
      }

      // Verificar número de licencia único si se está actualizando
      if (updateDto.numeroLicencia) {
        const duplicateLicencia = await this.psicologoRepository.existsByNumeroLicencia(
          updateDto.numeroLicencia, 
          id
        );
        if (duplicateLicencia) {
          throw new Error('Ya existe un psicólogo con este número de licencia');
        }
      }

      // Verificar que la nueva persona existe si se está actualizando
      if (updateDto.personaId) {
        const personaEntity = await this.personaRepository.findById(updateDto.personaId);
        if (!personaEntity) {
          throw new Error('La persona especificada no existe');
        }

        // Verificar que la persona no está asignada a otro psicólogo
        const existingPersonaPsicologo = await this.psicologoRepository.findByPersonaId(updateDto.personaId);
        if (existingPersonaPsicologo && existingPersonaPsicologo.id !== id) {
          throw new Error('Esta persona ya está asignada a otro psicólogo');
        }
      }

      // Crear modelo actualizado para validaciones
      const updatedData = {
        ...existingPsicologo,
        ...updateDto
      };

      // Se arma el modelo solo para validar los datos: el constructor lanza un error si no son válidos
      new Psicologo({
        id: existingPsicologo.id,
        especialidad: updatedData.especialidad,
        numeroLicencia: updatedData.numeroLicencia,
        persona: existingPsicologo.persona ? Persona.fromEntity(existingPsicologo.persona) : undefined
      });

      // Actualizar
      const updatedPsicologo = await this.psicologoRepository.update(id, {
        especialidad: updateDto.especialidad,
        numeroLicencia: updateDto.numeroLicencia,
        // Si se proporciona personaId, actualizar la relación
        //...(updateDto.personaId && { persona: { id: updateDto.personaId } })
      });

      if (!updatedPsicologo) {
        throw new Error('Error al actualizar el psicólogo');
      }

      return this.mapToResponseDto(updatedPsicologo);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al actualizar psicólogo: ${error.message}`);
      }
      throw new Error('Error desconocido al actualizar psicólogo');
    }
  }

  // Eliminar psicólogo
  async delete(id: string): Promise<boolean> {
    const existingPsicologo = await this.psicologoRepository.findById(id);
    if (!existingPsicologo) {
      throw new Error('Psicólogo no encontrado');
    }

    return await this.psicologoRepository.delete(id);
  }

  // Búsqueda avanzada
  async search(searchTerm: string): Promise<PsicologoResponseDto[]> {
    const psicologos = await this.psicologoRepository.search(searchTerm);
    return psicologos.map(entity => this.mapToResponseDto(entity));
  }

  // Obtener estadísticas
  async getStats(): Promise<{
    total: number;
    porEspecialidad: { especialidad: string; count: number }[];
  }> {
    return await this.psicologoRepository.getStats();
  }

  // Obtener psicólogos por especialidad
  async findByEspecialidad(especialidad: string): Promise<PsicologoResponseDto[]> {
    const psicologos = await this.psicologoRepository.findByEspecialidad(especialidad);
    return psicologos.map(entity => this.mapToResponseDto(entity));
  }

  public mapToResponseDto(psicologo: PsicologoEntity): PsicologoResponseDto {
      const personaDto = new PersonaResponseDto({
        id: psicologo.persona.id,
        nombre: psicologo.persona.nombre,
        apellido: psicologo.persona.apellido,
        dni: psicologo.persona.dni,
        fechaNacimiento: psicologo.persona.fechaNacimiento,
      });
  
      return new PsicologoResponseDto({
        id: psicologo.id,
        especialidad: psicologo.especialidad,
        numeroLicencia: psicologo.numeroLicencia,
        persona: personaDto,
      });
  }

  // Validar si un psicólogo puede ser eliminado (verificar dependencias)

}