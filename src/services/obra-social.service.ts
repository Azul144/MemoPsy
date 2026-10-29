// services/obra-social.service.ts
import { ObraSocialRepository } from '../repositories/obra-social.repository';
import { ObraSocial } from '../models/obra-social.model';
import { ObraSocialEntity } from '../entities/obra-social.entity';
import { 
  CreateObraSocialDto, 
  UpdateObraSocialDto, 
  ObraSocialResponseDto, 
  ObraSocialFiltersDto,
  BuscarObraSocialDto 
} from '../dto/obra-social.dto';

export class ObraSocialService {
  constructor(
    private obraSocialRepository: ObraSocialRepository
  ) {}

  // Crear una nueva obra social
  async createObraSocial(createObraSocialDto: CreateObraSocialDto): Promise<ObraSocialResponseDto> {
    // Verificar que no exista una obra social con el mismo nombre
    const existingObraSocial = await this.obraSocialRepository.findByNombre(createObraSocialDto.nombre);
    if (existingObraSocial) {
      throw new Error(`Ya existe una obra social con el nombre: ${createObraSocialDto.nombre}`);
    }

    // Crear el modelo de dominio para validaciones
    const obraSocialModel = new ObraSocial({
      nombre: createObraSocialDto.nombre,
      activo: createObraSocialDto.activo
    });

    // Convertir a entidad y guardar
    const obraSocialEntity = obraSocialModel.toEntity() as ObraSocialEntity;
    const savedObraSocial = await this.obraSocialRepository.create(obraSocialEntity);

    return this.mapToResponseDto(savedObraSocial);
  }

  // Obtener todas las obras sociales
  async getAllObrasSociales(filters?: ObraSocialFiltersDto): Promise<ObraSocialResponseDto[]> {
    const obrasSociales = await this.obraSocialRepository.findAll(filters);
    return obrasSociales.map(obraSocial => this.mapToResponseDto(obraSocial));
  }

  // Obtener una obra social por ID
  async getObraSocialById(id: string): Promise<ObraSocialResponseDto | null> {
    const obraSocial = await this.obraSocialRepository.findById(id);
    if (!obraSocial) {
      return null;
    }
    return this.mapToResponseDto(obraSocial);
  }

  // Obtener una obra social por nombre
  async getObraSocialByNombre(nombre: string): Promise<ObraSocialResponseDto | null> {
    const obraSocial = await this.obraSocialRepository.findByNombre(nombre);
    if (!obraSocial) {
      return null;
    }
    return this.mapToResponseDto(obraSocial);
  }

  // Obtener solo obras sociales activas
  async getActiveObrasSociales(): Promise<ObraSocialResponseDto[]> {
    const obrasSociales = await this.obraSocialRepository.findActiveObrasSociales();
    return obrasSociales.map(obraSocial => this.mapToResponseDto(obraSocial));
  }

  // Buscar obras sociales por término general
  async searchObrasSociales(searchDto: BuscarObraSocialDto): Promise<ObraSocialResponseDto[]> {
    const obrasSociales = await this.obraSocialRepository.searchObrasSociales(searchDto);
    return obrasSociales.map(obraSocial => this.mapToResponseDto(obraSocial));
  }

  // Actualizar una obra social
  async updateObraSocial(id: string, updateObraSocialDto: UpdateObraSocialDto): Promise<ObraSocialResponseDto | null> {
    // Verificar que la obra social existe
    const existingObraSocial = await this.obraSocialRepository.findById(id);
    if (!existingObraSocial) {
      throw new Error(`No se encontró una obra social con el ID: ${id}`);
    }

    // Si se está actualizando el nombre, verificar que no exista otra obra social con ese nombre
    if (updateObraSocialDto.nombre && updateObraSocialDto.nombre !== existingObraSocial.nombre) {
      const obraSocialWithSameName = await this.obraSocialRepository.findByNombre(updateObraSocialDto.nombre);
      if (obraSocialWithSameName && obraSocialWithSameName.id !== id) {
        throw new Error(`Ya existe una obra social con el nombre: ${updateObraSocialDto.nombre}`);
      }
    }

    // Preparar los datos para actualizar
    const updateData: Partial<ObraSocialEntity> = {};

    if (updateObraSocialDto.nombre !== undefined) {
      updateData.nombre = updateObraSocialDto.nombre;
    }

    if (updateObraSocialDto.activo !== undefined) {
      updateData.activo = updateObraSocialDto.activo;
    }

    // Validar usando el modelo de dominio si hay datos para actualizar
    if (Object.keys(updateData).length > 0) {
      const nombreParaValidar = updateData.nombre ?? existingObraSocial.nombre;
      const activoParaValidar = updateData.activo ?? existingObraSocial.activo;

      // Esto lanzará errores si los datos no son válidos
      new ObraSocial({
        id: existingObraSocial.id,
        nombre: nombreParaValidar,
        activo: activoParaValidar
      });
    }

    const updatedObraSocial = await this.obraSocialRepository.update(id, updateData);
    
    if (!updatedObraSocial) {
      return null;
    }

    return this.mapToResponseDto(updatedObraSocial);
  }

  // Eliminar una obra social
  async deleteObraSocial(id: string): Promise<boolean> {
    const existingObraSocial = await this.obraSocialRepository.findById(id);
    if (!existingObraSocial) {
      throw new Error(`No se encontró una obra social con el ID: ${id}`);
    }

    // Aquí podrías agregar validaciones adicionales, como verificar si tiene pacientes asociados

    return await this.obraSocialRepository.delete(id);
  }

  // Obtener obras sociales con paginación
  async getObrasSocialesWithPagination(
    page: number = 1, 
    limit: number = 10, 
    filters?: ObraSocialFiltersDto
  ): Promise<{
    obrasSociales: ObraSocialResponseDto[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const result = await this.obraSocialRepository.findWithPagination(page, limit, filters);
    
    return {
      obrasSociales: result.obrasSociales.map(obraSocial => this.mapToResponseDto(obraSocial)),
      pagination: {
        currentPage: page,
        totalPages: result.totalPages,
        totalItems: result.total,
        itemsPerPage: limit
      }
    };
  }

  // Obtener estadísticas de obras sociales
  async getObrasSocialesStats(): Promise<{ totalActivas: number; totalInactivas: number; total: number }> {
    return await this.obraSocialRepository.getObrasSocialesStats();
  }

  // Activar/Desactivar obra social
  async toggleObraSocialStatus(id: string): Promise<ObraSocialResponseDto> {
    const obraSocial = await this.obraSocialRepository.findById(id);
    if (!obraSocial) {
      throw new Error(`No se encontró una obra social con el ID: ${id}`);
    }

    const updatedObraSocial = await this.obraSocialRepository.update(id, {
      activo: !obraSocial.activo
    });

    if (!updatedObraSocial) {
      throw new Error('Error al cambiar el estado de la obra social');
    }

    return this.mapToResponseDto(updatedObraSocial);
  }

  // Método para mapear entidad a DTO de respuesta
  public mapToResponseDto(obraSocial: ObraSocialEntity): ObraSocialResponseDto {
    return new ObraSocialResponseDto({
      id: obraSocial.id,
      //createdAt: obraSocial.createdAt,
      //updatedAt: obraSocial.updatedAt,
      nombre: obraSocial.nombre,
      activo: obraSocial.activo
    });
  }

  // Método para obtener el modelo de dominio desde una entidad (si lo necesitas)
  getObraSocialModel(obraSocial: ObraSocialEntity): ObraSocial {
    return ObraSocial.fromEntity(obraSocial);
  }
}