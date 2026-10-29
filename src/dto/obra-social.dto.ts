// dto/obra-social.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

// DTO para crear una obra social
export class CreateObraSocialDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  @IsNotEmpty({ message: 'El estado activo es requerido' })
  activo: boolean;
}

// DTO para actualizar una obra social
export class UpdateObraSocialDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  activo?: boolean;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class ObraSocialResponseDto {
  id: string;
  nombre: string;
  activo: boolean;

  constructor(data: {
    id: string;
    nombre: string;
    activo: boolean;
  }) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.activo = data.activo;
  }
}

// DTO para filtros de búsqueda
export class ObraSocialFiltersDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  activo?: boolean;
}

// DTO para búsqueda rápida de obra social
export class BuscarObraSocialDto {
  @IsOptional()
  @IsString({ message: 'El término debe ser una cadena de texto' })
  termino?: string; // Busca en nombre

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  soloActivas?: boolean; // Filtrar solo las activas
}