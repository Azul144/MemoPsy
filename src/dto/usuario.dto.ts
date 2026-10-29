// dto/usuario.dto.ts
import { IsString, IsNotEmpty, IsUUID, IsOptional, MinLength, MaxLength, IsEmail, IsBoolean, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PersonaResponseDto } from './persona.dto';

// DTO para crear un usuario
export class CreateUsuarioDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email no puede estar vacío' })
  @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede tener más de 100 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).+$/, {
    message: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
  })
  password: string;

  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de persona es requerido' })
  personaId: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser un valor booleano' })
  activo?: boolean = true; // Por defecto activo
}

// DTO para actualizar un usuario
export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede tener más de 100 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).+$/, {
    message: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
  })
  password?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser un valor booleano' })
  activo?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  personaId?: string;
}

// DTO para login
export class LoginUsuarioDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email no puede estar vacío' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  password: string;
}

// DTO para cambiar contraseña
export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña actual no puede estar vacía' })
  currentPassword: string;

  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña no puede estar vacía' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La nueva contraseña no puede tener más de 100 caracteres' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).+$/, {
    message: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial',
  })
  newPassword: string;
}

// DTO para la respuesta (lo que se devuelve al cliente)
export class UsuarioResponseDto {
  id: string;
  email: string;
  activo: boolean;
  ultimoAcceso: Date;
  persona?: PersonaResponseDto;

  constructor(data: {
    id: string;
    email: string;
    activo: boolean;
    ultimoAcceso: Date;
    persona?: PersonaResponseDto;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.activo = data.activo;
    this.ultimoAcceso = data.ultimoAcceso;
    this.persona = data.persona;
  }
}

// DTO para la respuesta de login (incluye token si implementas JWT)
export class LoginResponseDto {
  usuario: UsuarioResponseDto;
  token?: string; // Opcional si implementas JWT

  constructor(data: {
    usuario: UsuarioResponseDto;
    token?: string;
  }) {
    this.usuario = data.usuario;
    this.token = data.token;
  }
}

// DTO para filtros de búsqueda
export class UsuarioFiltersDto {
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser un valor booleano' })
  activo?: boolean;

  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  nombrePersona?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  apellidoPersona?: string;
}