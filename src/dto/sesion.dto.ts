// dto/sesion.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PsicologoResponseDto } from './psicologo.dto';
import { EstadoResponseDto } from './estado.dto';
import { ModalidadResponseDto } from './modalidad.dto';

// DTO para crear una sesión
export class CreateSesionDto {
  @IsString({ message: 'La fecha y hora de inicio debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'La fecha y hora de inicio no puede estar vacía' })
    @MinLength(19, { message: 'La fecha y hora de inicio debe tener al menos 19 caracteres' })
    @MaxLength(19, { message: 'La fecha y hora de inicio no puede tener más de 19 caracteres' })
    fechaHoraInicio: string; // Se recibe como string y se convierte a Date
    @IsString({ message: 'La fecha y hora de fin debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'La fecha y hora de fin no puede estar vacía' })
    @MinLength(19, { message: 'La fecha y hora de fin debe tener al menos 19 caracteres' })
    @MaxLength(19, { message: 'La fecha y hora de fin no puede tener más de 19 caracteres' })
    fechaHoraFin: string;
    @IsUUID('4', { message: 'El ID del psicólogo debe ser un UUID válido' })
    @IsNotEmpty({ message: 'El ID del psicólogo es requerido' })
    psicologoId: string;
    @IsUUID('4', { message: 'El ID de la modalidad debe ser un UUID válido' })
    @IsNotEmpty({ message: 'El ID de la modalidad es requerido' })
    modalidadId: string;
    @IsUUID('4', { message: 'El ID del estado debe ser un UUID válido' })
    @IsNotEmpty({ message: 'El ID del estado es requerido' })
    estadoId: string;
}

// DTO para actualizar una sesión
export class UpdateSesionDto {
    @IsOptional()
    @IsString({ message: 'La fecha y hora de inicio debe ser una cadena de texto' })
    @MinLength(19, { message: 'La fecha y hora de inicio debe tener al menos 19 caracteres' })
    @MaxLength(19, { message: 'La fecha y hora de inicio no puede tener más de 19 caracteres' })
    fechaHoraInicio: string; // Se recibe como string y se convierte a Date
    @IsOptional()
    @IsString({ message: 'La fecha y hora de fin debe ser una cadena de texto' })
    @MinLength(19, { message: 'La fecha y hora de fin debe tener al menos 19 caracteres' })
    @MaxLength(19, { message: 'La fecha y hora de fin no puede tener más de 19 caracteres' })
    fechaHoraFin: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID del psicólogo debe ser un UUID válido' })
    psicologoId: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID de la modalidad debe ser un UUID válido' })
    modalidadId: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID del estado debe ser un UUID válido' })
    estadoId: string;
}

// DTO de respuesta para sesión
export class SesionResponseDto {
    id: string;
    fechaHoraInicio: Date;
    fechaHoraFin: Date;
    psicologo?: PsicologoResponseDto;
    modalidad?: ModalidadResponseDto;
    estado?: EstadoResponseDto;
    
    constructor(data: {
        id: string;
        fechaHoraInicio: Date;
        fechaHoraFin: Date;
        psicologo?: PsicologoResponseDto;
        modalidad?: ModalidadResponseDto;
        estado?: EstadoResponseDto;
    }) {
        this.id = data.id;
        this.fechaHoraInicio = data.fechaHoraInicio;
        this.fechaHoraFin = data.fechaHoraFin;
        this.psicologo = data.psicologo;
        this.modalidad = data.modalidad;
        this.estado = data.estado;
    }
}

// DTO para filtros de búsqueda
export class SesionQueryDto {
    @IsOptional()
    @Type(() => Number)
    page?: number;
    @IsOptional()
    @Type(() => Number)
    limit?: number;
    @IsOptional()
    @IsString({ message: 'La búsqueda debe ser una cadena de texto' })
    search?: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID del psicólogo debe ser un UUID válido' })
    psicologoId?: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID de la modalidad debe ser un UUID válido' })
    modalidadId?: string;
    @IsOptional()
    @IsUUID('4', { message: 'El ID del estado debe ser un UUID válido' })
    estadoId?: string;
    @IsOptional()
    @IsString({ message: 'La fecha de inicio debe ser una cadena de texto' })
    fechaInicio?: string;
    @IsOptional()
    @IsString({ message: 'La fecha de fin debe ser una cadena de texto' })
    fechaFin?: string;
}

// DTO para respuesta paginada
export class PaginatedSesionResponseDto {
    data: SesionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  
    constructor(data: {
      data: SesionResponseDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }) {
      this.data = data.data;
      this.total = data.total;
      this.page = data.page;
      this.limit = data.limit;
      this.totalPages = data.totalPages;
    }
}

