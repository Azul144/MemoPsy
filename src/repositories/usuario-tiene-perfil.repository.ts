// usuario-tiene-perfil.repository.ts
import { Repository, DataSource } from 'typeorm';
import { UsuarioTienePerfilEntity } from '../entities/usuario-tiene-perfil.entity';

export class UsuarioTienePerfilRepository {
    private repository: Repository<UsuarioTienePerfilEntity>;
    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(UsuarioTienePerfilEntity);
    }

  async create(usuarioTienePerfil: Partial<UsuarioTienePerfilEntity>): Promise<UsuarioTienePerfilEntity> {
    const entity = this.repository.create(usuarioTienePerfil);
    return await this.repository.save(entity);
  }

  async findByUsuarioIdAndPerfilId(usuarioId: string, perfilId: string): Promise<UsuarioTienePerfilEntity | null> {
    return await this.repository.findOne({
      where: { usuarioId, perfilId },
      relations: ['usuario', 'perfil'],
    });
  }

  async findByUsuarioId(usuarioId: string): Promise<UsuarioTienePerfilEntity[]> {
    return await this.repository.find({
      where: { usuarioId },
      relations: ['usuario', 'perfil'],
    });
  }

  async findByPerfilId(perfilId: string): Promise<UsuarioTienePerfilEntity[]> {
    return await this.repository.find({
      where: { perfilId },
      relations: ['usuario', 'perfil'],
    });
  }

  async findAll(): Promise<UsuarioTienePerfilEntity[]> {
    return await this.repository.find({
      relations: ['usuario', 'perfil'],
    });
  }

  async delete(usuarioId: string, perfilId: string): Promise<boolean> {
    const result = await this.repository.delete({ usuarioId, perfilId });
    return (result.affected ?? 0) > 0;
  }

  async deleteByUsuarioId(usuarioId: string): Promise<number> {
    const result = await this.repository.delete({ usuarioId });
    return result.affected || 0;
  }

  async deleteByPerfilId(perfilId: string): Promise<number> {
    const result = await this.repository.delete({ perfilId });
    return result.affected || 0;
  }

  async exists(usuarioId: string, perfilId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { usuarioId, perfilId },
    });
    return count > 0;
  }

  async countByUsuarioId(usuarioId: string): Promise<number> {
    return await this.repository.count({
      where: { usuarioId },
    });
  }

  async countByPerfilId(perfilId: string): Promise<number> {
    return await this.repository.count({
      where: { perfilId },
    });
  }
}