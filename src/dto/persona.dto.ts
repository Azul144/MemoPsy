// dto/persona.dto.ts
import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, IsDateString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO para crear una persona
export class CreatePersonaDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  nombre: string;

  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El apellido no puede estar vacío' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  apellido: string;

  @IsString({ message: 'El DNI debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El DNI no puede estar vacío' })
  @Matches(/^[0-9]{7,8}$/, { message: 'El DNI debe tener entre 7 y 8 dígitos numéricos' })
  dni: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'La fecha de nacimiento no puede estar vacía' })
  fechaNacimiento: string; // Se recibe como string y se convierte a Date en el service
}

// DTO para actualizar una persona
export class UpdatePersonaDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede tener más de 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  apellido?: string;

  @IsOptional()
  @IsString({ message: 'El DNI debe ser una cadena de texto' })
  @Matches(/^[0-9]{7,8}$/, { message: 'El DNI debe tener entre 7 y 8 dígitos numéricos' })
  dni?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  fechaNacimiento?: string;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class PersonaResponseDto {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date;

  constructor(data: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: Date;
  }) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.apellido = data.apellido;
    this.dni = data.dni;
    this.fechaNacimiento = data.fechaNacimiento;
  }
}

// DTO para filtros de búsqueda
export class PersonaFiltersDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  apellido?: string;

  @IsOptional()
  @IsString({ message: 'El DNI debe ser una cadena de texto' })
  dni?: string;
}