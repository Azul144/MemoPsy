// perfil-tiene-permiso.repository.ts
import { Repository, DataSource } from 'typeorm';
import { PerfilTienePermisoEntity } from '../entities/perfil-tiene-permiso.entity';

export class PerfilTienePermisoRepository {
    private readonly repository: Repository<PerfilTienePermisoEntity>;

    constructor(dataSource: DataSource) {
        this.repository = dataSource.getRepository(PerfilTienePermisoEntity);
    }

    async create(perfilTienePermiso: Partial<PerfilTienePermisoEntity>): Promise<PerfilTienePermisoEntity> {
        const entity = this.repository.create(perfilTienePermiso);
        return await this.repository.save(entity);
    }

    async findByPerfilIdAndPermisoId(perfilId: string, permisoId: string): Promise<PerfilTienePermisoEntity | null> {
        return await this.repository.findOne({
        where: { perfilId, permisoId },
        relations: ['perfil', 'permiso'],
        });
    }

    async findByPerfilId(perfilId: string): Promise<PerfilTienePermisoEntity[]> {
        return await this.repository.find({
        where: { perfilId },
        relations: ['perfil', 'permiso', 'permiso.modulo', 'permiso.accion' ],
        });
    }

    async findByPermisoId(permisoId: string): Promise<PerfilTienePermisoEntity[]> {
        return await this.repository.find({
        where: { permisoId },
        relations: ['perfil', 'permiso'],
        });
    }

    async findAll(): Promise<PerfilTienePermisoEntity[]> {
        return await this.repository.find({
        relations: ['perfil', 'permiso'],
        });
    }

    async delete(perfilId: string, permisoId: string): Promise<boolean> {
        const result = await this.repository.delete({ perfilId, permisoId });
        return (result.affected ?? 0) > 0;
    }

    async deleteByPerfilId(perfilId: string): Promise<number> {
        const result = await this.repository.delete({ perfilId });
        return result.affected || 0;
    }

    async deleteByPermisoId(permisoId: string): Promise<number> {
        const result = await this.repository.delete({ permisoId });
        return result.affected || 0;
    }

    async exists(perfilId: string, permisoId: string): Promise<boolean> {
        const count = await this.repository.count({
        where: { perfilId, permisoId },
        });
        return count > 0;
    }

    async countByPerfilId(perfilId: string): Promise<number> {
        return await this.repository.count({
        where: { perfilId },
        });
    }

    async countByPermisoId(permisoId: string): Promise<number> {
        return await this.repository.count({
        where: { permisoId },
        });
    }
}