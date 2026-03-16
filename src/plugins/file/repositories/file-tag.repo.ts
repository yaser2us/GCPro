import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileTag } from '../entities/file-tag.entity';

/**
 * FileTag Repository
 * Source: specs/file/file.pillar.v2.yml
 *
 * Manages file tag definitions
 */
@Injectable()
export class FileTagRepository {
  constructor(
    @InjectRepository(FileTag)
    private readonly repo: Repository<FileTag>,
  ) {}

  /**
   * Create a new file tag
   */
  async create(data: Partial<FileTag>, qr: QueryRunner): Promise<FileTag> {
    const entity = qr.manager.create(FileTag, data);
    return qr.manager.save(FileTag, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileTag | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileTag, { where: { id } });
  }

  /**
   * Find by code
   */
  async findByCode(code: string, qr?: QueryRunner): Promise<FileTag | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileTag, { where: { code } });
  }

  /**
   * Upsert file tag by code
   * Uses UNIQUE(code) for idempotency
   */
  async upsertByCode(
    data: Partial<FileTag>,
    qr: QueryRunner,
  ): Promise<FileTag> {
    const existing = await this.findByCode(data.code!, qr);
    if (existing) {
      await qr.manager.update(FileTag, { id: existing.id }, data);
      return this.findById(existing.id, qr) as Promise<FileTag>;
    }
    return this.create(data, qr);
  }

  /**
   * Get all tags
   */
  async findAll(qr?: QueryRunner): Promise<FileTag[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileTag, {
      order: { code: 'ASC' },
    });
  }
}
