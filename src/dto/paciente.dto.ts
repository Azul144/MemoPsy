// dto/paciente.dto.ts
import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { PersonaResponseDto } from './persona.dto';
import { ObraSocialResponseDto } from './obra-social.dto';

// DTO para crear un paciente
export class CreatePacienteDto {
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de persona es requerido' })
  personaId: string;

  @IsUUID('4', { message: 'El ID de obra social debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de obra social es requerido' })
  obraSocialId: string;
}

// DTO para actualizar un paciente
export class UpdatePacienteDto {
  @IsOptional()
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  personaId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de obra social debe ser un UUID válido' })
  obraSocialId?: string;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class PacienteResponseDto {
  id: string;
  persona: PersonaResponseDto;
  obraSocial: ObraSocialResponseDto;

  constructor(data: {
    id: string;
    persona: PersonaResponseDto;
    obraSocial: ObraSocialResponseDto;
  }) {
    this.id = data.id;
    this.persona = data.persona;
    this.obraSocial = data.obraSocial;
  }
}

// DTO para filtros de búsqueda
export class PacienteFiltersDto {
  @IsOptional()
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  personaId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de obra social debe ser un UUID válido' })
  obraSocialId?: string;

  // Filtros por datos de la persona
  @IsOptional()
  nombrePersona?: string;

  @IsOptional()
  apellidoPersona?: string;

  @IsOptional()
  dniPersona?: string;

  // Filtros por datos de la obra social
  @IsOptional()
  nombreObraSocial?: string;

  @IsOptional()
  codigoObraSocial?: string;
}

// DTO para búsqueda rápida de paciente
export class BuscarPacienteDto {
  @IsOptional()
  termino?: string; // Busca en nombre, apellido o DNI

  @IsOptional()
  @IsUUID('4', { message: 'El ID de obra social debe ser un UUID válido' })
  obraSocialId?: string;
}