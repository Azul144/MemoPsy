// dto/informe.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength, MaxLength, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PsicologoResponseDto } from '@/dto/psicologo.dto';

// DTO para crear un informe
export class CreateInformeDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título no puede estar vacío' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El título no puede tener más de 200 caracteres' })
  titulo: string;

  @IsString({ message: 'El contenido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El contenido no puede estar vacío' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  contenido: string;

  @IsDateString({}, { message: 'La fecha de creación debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de creación no puede estar vacía' })
  fechaCreacion: string;

  @IsBoolean({ message: 'El campo esPrivado debe ser un valor booleano' })
  @IsNotEmpty({ message: 'El campo esPrivado es requerido' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  esPrivado: boolean;

  @IsUUID('4', { message: 'El ID de psicólogo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de psicólogo es requerido' })
  psicologoId: string;
}

// DTO para actualizar un informe
export class UpdateInformeDto {
  @IsOptional()
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título no puede estar vacío' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El título no puede tener más de 200 caracteres' })
  titulo?: string;

  @IsOptional()
  @IsString({ message: 'El contenido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El contenido no puede estar vacío' })
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  contenido?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de creación debe ser una fecha válida' })
  fechaCreacion?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo esPrivado debe ser un valor booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  esPrivado?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de psicólogo debe ser un UUID válido' })
  psicologoId?: string;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class InformeResponseDto {
  id: string;
  titulo: string;
  contenido: string;
  fechaCreacion: Date;
  esPrivado: boolean;
  psicologo?: PsicologoResponseDto;

  constructor(partial: Partial<InformeResponseDto>) {
    Object.assign(this, partial);
  }
}

// DTO para consultas con filtros
export class InformeQueryDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  contenido?: string;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de psicólogo debe ser un UUID válido' })
  psicologoId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  esPrivado?: boolean;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  nombrePsicologo?: string; // Para buscar por nombre del psicólogo

  @IsOptional()
  @IsString()
  apellidoPsicologo?: string; // Para buscar por apellido del psicólogo

  @IsOptional()
  @IsString()
  especialidadPsicologo?: string; // Para buscar por especialidad del psicólogo

  @IsOptional()
  @IsString()
  sortBy?: 'titulo' | 'fechaCreacion' | 'esPrivado';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

// DTO para respuesta paginada
export class PaginatedInformeResponseDto {
  data: InformeResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(partial: Partial<PaginatedInformeResponseDto>) {
    Object.assign(this, partial);
  }
}

// DTO para estadísticas de informes
export class InformeStatsDto {
  total: number;
  publicos: number;
  privados: number;
  porPsicologo: { psicologoId: string; nombrePsicologo: string; count: number }[];
  porMes: { mes: string; count: number }[];

  constructor(partial: Partial<InformeStatsDto>) {
    Object.assign(this, partial);
  }
}