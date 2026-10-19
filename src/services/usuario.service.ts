// services/usuario.service.ts
import { UsuarioRepository } from '../repositories/usuario.repository';
import { PersonaRepository } from '../repositories/persona.repository';
import { Usuario } from '../models/usuario.model';
import { Persona } from '../models/persona.model';
import { UsuarioEntity } from '../entities/usuario.entity';
import { 
  CreateUsuarioDto, 
  UpdateUsuarioDto, 
  LoginUsuarioDto,
  ChangePasswordDto,
  UsuarioResponseDto, 
  LoginResponseDto,
  UsuarioFiltersDto 
} from '../dto/usuario.dto';
import { PersonaResponseDto } from '../dto/persona.dto';
import * as bcrypt from 'bcrypt';

export class UsuarioService {
  constructor(
    private usuarioRepository: UsuarioRepository,
    private personaRepository: PersonaRepository
  ) {}

  // Crear un nuevo usuario
  async createUsuario(createUsuarioDto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    // Verificar si ya existe un usuario con ese email
    const existingUsuario = await this.usuarioRepository.findByEmail(createUsuarioDto.email);
    if (existingUsuario) {
      throw new Error(`Ya existe un usuario con el email: ${createUsuarioDto.email}`);
    }

    // Verificar que la persona existe
    const persona = await this.personaRepository.findById(createUsuarioDto.personaId);
    if (!persona) {
      throw new Error(`No se encontró una persona con el ID: ${createUsuarioDto.personaId}`);
    }

    // Verificar que la persona no tenga ya un usuario asociado
    const existingUsuarioByPersona = await this.usuarioRepository.findByPersonaId(createUsuarioDto.personaId);
    if (existingUsuarioByPersona) {
      throw new Error('Esta persona ya tiene un usuario asociado');
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 12);

    // Crear el modelo de dominio para validaciones adicionales
    const personaModel = Persona.fromEntity(persona);
    const usuarioModel = new Usuario({
      email: createUsuarioDto.email,
      password: hashedPassword,
      activo: createUsuarioDto.activo ?? true,
      ultimoAcceso: new Date(),
      persona: personaModel,
    });

    // Convertir a entidad y guardar
    const usuarioEntity = usuarioModel.toEntity() as UsuarioEntity;
    usuarioEntity.persona = persona; // Asignar la relación
    
    const savedUsuario = await this.usuarioRepository.create(usuarioEntity);

    return this.mapToResponseDto(savedUsuario);
  }

  // Login de usuario
  async loginUsuario(loginDto: LoginUsuarioDto): Promise<LoginResponseDto> {
    // Buscar el usuario por email
    const usuario = await this.usuarioRepository.findByEmail(loginDto.email);
    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar que el usuario esté activo
    if (!usuario.activo) {
      throw new Error('La cuenta está desactivada');
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(loginDto.password, usuario.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Actualizar último acceso
    await this.usuarioRepository.updateLastAccess(usuario.id);

    // Crear respuesta (aquí podrías generar un JWT token)
    const usuarioResponse = this.mapToResponseDto(usuario);
    
    return new LoginResponseDto({
      usuario: usuarioResponse,
      // token: generateJWTToken(usuario) // Implementar si usas JWT
    });
  }

  // Cambiar contraseña
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const usuario = await this.usuarioRepository.findById(userId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword, 
      usuario.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error('La contraseña actual es incorrecta');
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword, 
      usuario.password
    );
    if (isSamePassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

    // Encriptar la nueva contraseña
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 12);

    // Actualizar la contraseña
    await this.usuarioRepository.update(userId, { 
      password: hashedNewPassword 
    });
  }

  // Obtener todos los usuarios
  async getAllUsuarios(filters?: UsuarioFiltersDto): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarioRepository.findAll(filters);
    return usuarios.map(usuario => this.mapToResponseDto(usuario));
  }

  // Obtener un usuario por ID
  async getUsuarioById(id: string): Promise<UsuarioResponseDto | null> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      return null;
    }
    return this.mapToResponseDto(usuario);
  }

  // Obtener un usuario por email
  async getUsuarioByEmail(email: string): Promise<UsuarioResponseDto | null> {
    const usuario = await this.usuarioRepository.findByEmail(email);
    if (!usuario) {
      return null;
    }
    return this.mapToResponseDto(usuario);
  }

  // Actualizar un usuario
  async updateUsuario(id: string, updateUsuarioDto: UpdateUsuarioDto): Promise<UsuarioResponseDto | null> {
    // Verificar que el usuario existe
    const existingUsuario = await this.usuarioRepository.findById(id);
    if (!existingUsuario) {
      throw new Error(`No se encontró un usuario con el ID: ${id}`);
    }

    // Si se está actualizando el email, verificar que no exista otro con el mismo email
    if (updateUsuarioDto.email && updateUsuarioDto.email !== existingUsuario.email) {
      const usuarioWithSameEmail = await this.usuarioRepository.findByEmail(updateUsuarioDto.email);
      if (usuarioWithSameEmail && usuarioWithSameEmail.id !== id) {
        throw new Error(`Ya existe un usuario con el email: ${updateUsuarioDto.email}`);
      }
    }

    // Si se está actualizando la persona, verificar que existe y no tenga otro usuario
    if (updateUsuarioDto.personaId && updateUsuarioDto.personaId !== existingUsuario.persona?.id) {
      const persona = await this.personaRepository.findById(updateUsuarioDto.personaId);
      if (!persona) {
        throw new Error(`No se encontró una persona con el ID: ${updateUsuarioDto.personaId}`);
      }

      const usuarioWithSamePersona = await this.usuarioRepository.findByPersonaId(updateUsuarioDto.personaId);
      if (usuarioWithSamePersona && usuarioWithSamePersona.id !== id) {
        throw new Error('Esta persona ya tiene un usuario asociado');
      }
    }

    // Preparar los datos para actualizar
    const updateData: Partial<UsuarioEntity> = {};

    if (updateUsuarioDto.email !== undefined) {
      updateData.email = updateUsuarioDto.email;
    }

    if (updateUsuarioDto.password !== undefined) {
      // Encriptar la nueva contraseña
      updateData.password = await bcrypt.hash(updateUsuarioDto.password, 12);
    }

    if (updateUsuarioDto.activo !== undefined) {
      updateData.activo = updateUsuarioDto.activo;
    }

    if (updateUsuarioDto.personaId !== undefined) {
      const persona = await this.personaRepository.findById(updateUsuarioDto.personaId);
      updateData.persona = persona!;
    }

    const updatedUsuario = await this.usuarioRepository.update(id, updateData);
    
    if (!updatedUsuario) {
      return null;
    }

    return this.mapToResponseDto(updatedUsuario);
  }

  // Activar/Desactivar usuario
  async toggleUsuarioStatus(id: string): Promise<UsuarioResponseDto | null> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw new Error(`No se encontró un usuario con el ID: ${id}`);
    }

    const updatedUsuario = await this.usuarioRepository.update(id, { 
      activo: !usuario.activo 
    });

    if (!updatedUsuario) {
      return null;
    }

    return this.mapToResponseDto(updatedUsuario);
  }

  // Eliminar un usuario
  async deleteUsuario(id: string): Promise<boolean> {
    const existingUsuario = await this.usuarioRepository.findById(id);
    if (!existingUsuario) {
      throw new Error(`No se encontró un usuario con el ID: ${id}`);
    }

    return await this.usuarioRepository.delete(id);
  }

  // Obtener usuarios activos
  async getActiveUsuarios(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarioRepository.findActiveUsers();
    return usuarios.map(usuario => this.mapToResponseDto(usuario));
  }

  // Obtener usuarios inactivos
  async getInactiveUsuarios(): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.usuarioRepository.findInactiveUsers();
    return usuarios.map(usuario => this.mapToResponseDto(usuario));
  }

  // Obtener usuarios con paginación
  async getUsuariosWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: UsuarioFiltersDto
  ): Promise<{
    usuarios: UsuarioResponseDto[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const result = await this.usuarioRepository.findWithPagination(page, limit, filters);
    
    return {
      usuarios: result.usuarios.map(usuario => this.mapToResponseDto(usuario)),
      pagination: {
        currentPage: page,
        totalPages: result.totalPages,
        totalItems: result.total,
        itemsPerPage: limit
      }
    };
  }

  // Método para mapear entidad a DTO de respuesta
  public mapToResponseDto(usuario: UsuarioEntity): UsuarioResponseDto {
    let personaDto: PersonaResponseDto | undefined;
    
    if (usuario.persona) {
      personaDto = new PersonaResponseDto({
        id: usuario.persona.id,
        nombre: usuario.persona.nombre,
        apellido: usuario.persona.apellido,
        dni: usuario.persona.dni,
        fechaNacimiento: usuario.persona.fechaNacimiento,
      });
    }

    return new UsuarioResponseDto({
      id: usuario.id,
      email: usuario.email,
      activo: usuario.activo,
      ultimoAcceso: usuario.ultimoAcceso,
      persona: personaDto
    });
  }

  // Método para obtener el modelo de dominio desde una entidad (si lo necesitas)
  getUsuarioModel(usuario: UsuarioEntity): Usuario {
    return Usuario.fromEntity(usuario);
  }
}