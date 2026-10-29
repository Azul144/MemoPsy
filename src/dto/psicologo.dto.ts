// dto/psicologo.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PersonaResponseDto, CreatePersonaDto } from '@/dto/persona.dto';

// DTO para crear un psicólogo
export class CreatePsicologoDto {
  @IsString({ message: 'La especialidad debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La especialidad no puede estar vacía' })
  @MinLength(2, { message: 'La especialidad debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La especialidad no puede tener más de 100 caracteres' })
  especialidad: string;

  @IsString({ message: 'El número de licencia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de licencia no puede estar vacío' })
  @MinLength(3, { message: 'El número de licencia debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de licencia no puede tener más de 50 caracteres' })
  numeroLicencia: string;

  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de persona es requerido' })
  personaId: string;
}

// DTO para actualizar un psicólogo
export class UpdatePsicologoDto {
  @IsOptional()
  @IsString({ message: 'La especialidad debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La especialidad no puede estar vacía' })
  @MinLength(2, { message: 'La especialidad debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La especialidad no puede tener más de 100 caracteres' })
  especialidad?: string;

  @IsOptional()
  @IsString({ message: 'El número de licencia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de licencia no puede estar vacío' })
  @MinLength(3, { message: 'El número de licencia debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de licencia no puede tener más de 50 caracteres' })
  numeroLicencia?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  personaId?: string;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class PsicologoResponseDto {
  id: string;
  especialidad: string;
  numeroLicencia: string;
  persona?: PersonaResponseDto;
  
  constructor(data: {
    id: string,
    especialidad: string,
    numeroLicencia: string,
    persona?: PersonaResponseDto,
  }) {
    this.id = data.id;
    this.especialidad = data.especialidad;
    this.numeroLicencia = data.numeroLicencia;
    this.persona = data.persona;
  }

}

// DTO para consultas con filtros
export class PsicologoQueryDto {
  @IsOptional()
  @IsString()
  especialidad?: string;

  @IsOptional()
  @IsString()
  numeroLicencia?: string;

  @IsOptional()
  @IsString()
  nombre?: string; // Para buscar por nombre de la persona

  @IsOptional()
  @IsString()
  apellido?: string; // Para buscar por apellido de la persona

  @IsOptional()
  @IsString()
  sortBy?: 'especialidad' | 'numeroLicencia';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

// DTO para crear psicólogo con persona (todo en una sola operación)
export class CreatePsicologoWithPersonaDto {
  @IsString({ message: 'La especialidad debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La especialidad no puede estar vacía' })
  @MinLength(2, { message: 'La especialidad debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'La especialidad no puede tener más de 100 caracteres' })
  especialidad: string;

  @IsString({ message: 'El número de licencia debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de licencia no puede estar vacío' })
  @MinLength(3, { message: 'El número de licencia debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El número de licencia no puede tener más de 50 caracteres' })
  numeroLicencia: string;

  // Datos de la persona
  @Type(() => CreatePersonaDto)
  persona: CreatePersonaDto;
}

// DTO para respuesta paginada
export class PaginatedPsicologoResponseDto {
  data: PsicologoResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(partial: Partial<PaginatedPsicologoResponseDto>) {
    Object.assign(this, partial);
  }
}