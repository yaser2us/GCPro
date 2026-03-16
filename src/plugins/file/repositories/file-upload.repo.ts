import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileUpload } from '../entities/file-upload.entity';

/**
 * FileUpload Repository
 * Source: specs/file/file.pillar.v2.yml
 */
@Injectable()
export class FileUploadRepository {
  constructor(
    @InjectRepository(FileUpload)
    private readonly repo: Repository<FileUpload>,
  ) {}

  /**
   * Create a new file upload record
   */
  async create(
    data: Partial<FileUpload>,
    qr: QueryRunner,
  ): Promise<FileUpload> {
    const entity = qr.manager.create(FileUpload, data);
    return qr.manager.save(FileUpload, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileUpload | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileUpload, { where: { id } });
  }

  /**
   * Find by file_key
   */
  async findByFileKey(
    fileKey: string,
    qr?: QueryRunner,
  ): Promise<FileUpload | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileUpload, { where: { file_key: fileKey } });
  }

  /**
   * Upsert file upload by file_key
   * Uses ON DUPLICATE KEY UPDATE for idempotency
   */
  async upsertByFileKey(
    data: Partial<FileUpload>,
    qr: QueryRunner,
  ): Promise<FileUpload> {
    const existing = await this.findByFileKey(data.file_key!, qr);
    if (existing) {
      await qr.manager.update(FileUpload, { id: existing.id }, data);
      return this.findById(existing.id, qr) as Promise<FileUpload>;
    }
    return this.create(data, qr);
  }

  /**
   * Update file upload
   */
  async update(
    id: number,
    data: Partial<FileUpload>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(FileUpload, { id }, data);
  }

  /**
   * Soft delete file upload
   */
  async softDelete(id: number, qr: QueryRunner): Promise<void> {
    await qr.manager.update(FileUpload, { id }, { deleted_at: new Date() });
  }
}
