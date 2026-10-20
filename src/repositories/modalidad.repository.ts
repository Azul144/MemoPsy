// repositories/modalidad.repository.ts
import { Repository, DataSource } from 'typeorm';
import { ModalidadEntity } from '../entities/modalidad.entity';
import { Modalidad } from '../models/modalidad.model';
import { CreateModalidadDto, UpdateModalidadDto } from '../dto/modalidad.dto';

export interface IModalidadRepository {
  findAll(): Promise<Modalidad[]>;
  findById(id: string): Promise<Modalidad | null>;
  findByNombre(nombre: string): Promise<Modalidad | null>;
  create(createDto: CreateModalidadDto): Promise<Modalidad>;
  update(id: string, updateDto: UpdateModalidadDto): Promise<Modalidad | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export class ModalidadRepository implements IModalidadRepository {
  private readonly repository: Repository<ModalidadEntity>;
  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ModalidadEntity)
  }
  
  async findAll(): Promise<Modalidad[]> {
    try {
      const entities = await this.repository.find({
        order: { nombre: 'ASC' }
      });
      return entities.map(entity => Modalidad.fromEntity(entity));
    } catch (error) {
      throw new Error(`Error al obtener modalidades: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async findById(id: string): Promise<Modalidad | null> {
    try {
      const entity = await this.repository.findOne({ where: { id } });
      return entity ? Modalidad.fromEntity(entity) : null;
    } catch (error) {
      throw new Error(`Error al buscar modalidad por ID: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async findByNombre(nombre: string): Promise<Modalidad | null> {
    try {
      const entity = await this.repository.findOne({ 
        where: { nombre: nombre.trim() } 
      });
      return entity ? Modalidad.fromEntity(entity) : null;
    } catch (error) {
      throw new Error(`Error al buscar modalidad por nombre: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async create(createDto: CreateModalidadDto): Promise<Modalidad> {
    try {
      // Verificar si ya existe una modalidad con el mismo nombre
      const existingModalidad = await this.findByNombre(createDto.nombre);
      if (existingModalidad) {
        throw new Error('Ya existe una modalidad con este nombre');
      }

      const newModalidad = new Modalidad({
        nombre: createDto.nombre.trim()
      });

      const entity = this.repository.create(newModalidad.toEntity());
      const savedEntity = await this.repository.save(entity);
      
      return Modalidad.fromEntity(savedEntity);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al crear modalidad: ${error}`);
    }
  }

  async update(id: string, updateDto: UpdateModalidadDto): Promise<Modalidad | null> {
    try {
      const existingEntity = await this.repository.findOne({ where: { id } });
      if (!existingEntity) {
        return null;
      }

      // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
      if (updateDto.nombre && updateDto.nombre.trim() !== existingEntity.nombre) {
        const modalidadWithSameName = await this.findByNombre(updateDto.nombre);
        if (modalidadWithSameName && modalidadWithSameName.id !== id) {
          throw new Error('Ya existe una modalidad con este nombre');
        }
      }

      // Crear modelo Modalidad para validaciones
      const modalidadModel = Modalidad.fromEntity(existingEntity);
      
      // Actualizar solo los campos proporcionados
      if (updateDto.nombre !== undefined) {
        modalidadModel.nombre = updateDto.nombre.trim();
      }

      // Actualizar entidad
      await this.repository.update(id, modalidadModel.toEntity());
      
      // Obtener la entidad actualizada
      const updatedEntity = await this.repository.findOne({ where: { id } });
      return updatedEntity ? Modalidad.fromEntity(updatedEntity) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error al actualizar modalidad: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return (result.affected ?? 0) > 0;
    } catch (error) {
      throw new Error(`Error al eliminar modalidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.repository.count({ where: { id } });
      return count > 0;
    } catch (error) {
      throw new Error(`Error al verificar existencia de la modalidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async count(): Promise<number> {
    try {
      return await this.repository.count();
    } catch (error) {
      throw new Error(`Error al contar modalidades: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}