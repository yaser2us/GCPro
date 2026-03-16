import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileVersion } from '../entities/file-version.entity';

/**
 * FileVersion Repository
 * Source: specs/file/file.pillar.v2.yml
 */
@Injectable()
export class FileVersionRepository {
  constructor(
    @InjectRepository(FileVersion)
    private readonly repo: Repository<FileVersion>,
  ) {}

  /**
   * Create a new file version record
   */
  async create(
    data: Partial<FileVersion>,
    qr: QueryRunner,
  ): Promise<FileVersion> {
    const entity = qr.manager.create(FileVersion, data);
    return qr.manager.save(FileVersion, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileVersion | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileVersion, { where: { id } });
  }

  /**
   * Find all versions for a file
   */
  async findByFileId(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<FileVersion[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileVersion, {
      where: { file_id: fileId },
      order: { version_no: 'DESC' },
    });
  }

  /**
   * Find specific version by file_id and version_no
   */
  async findByFileIdAndVersion(
    fileId: number,
    versionNumber: number,
    qr?: QueryRunner,
  ): Promise<FileVersion | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileVersion, {
      where: { file_id: fileId, version_no: versionNumber },
    });
  }

  /**
   * Get latest version number for a file
   */
  async getLatestVersionNumber(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<number> {
    const manager = qr ? qr.manager : this.repo.manager;
    const result = await manager
      .createQueryBuilder(FileVersion, 'fv')
      .select('MAX(fv.version_no)', 'max')
      .where('fv.file_id = :fileId', { fileId })
      .getRawOne();
    return result?.max || 0;
  }
}
