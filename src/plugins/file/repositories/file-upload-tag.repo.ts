import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileUploadTag } from '../entities/file-upload-tag.entity';

/**
 * FileUploadTag Repository
 * Source: specs/file/file.pillar.v2.yml
 *
 * Manages tag assignments to files
 */
@Injectable()
export class FileUploadTagRepository {
  constructor(
    @InjectRepository(FileUploadTag)
    private readonly repo: Repository<FileUploadTag>,
  ) {}

  /**
   * Create a new tag assignment
   */
  async create(
    data: Partial<FileUploadTag>,
    qr: QueryRunner,
  ): Promise<FileUploadTag> {
    const entity = qr.manager.create(FileUploadTag, data);
    return qr.manager.save(FileUploadTag, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileUploadTag | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileUploadTag, { where: { id } });
  }

  /**
   * Upsert tag assignment by unique constraint
   * UNIQUE(file_id, tag_id)
   */
  async upsertByConstraint(
    data: Partial<FileUploadTag>,
    qr: QueryRunner,
  ): Promise<FileUploadTag> {
    const existing = await qr.manager.findOne(FileUploadTag, {
      where: {
        file_id: data.file_id!,
        tag_id: data.tag_id!,
      },
    });

    if (existing) {
      return existing;
    }

    return this.create(data, qr);
  }

  /**
   * Find all tags for a file
   */
  async findByFileId(
    fileId: number,
    qr?: QueryRunner,
  ): Promise<FileUploadTag[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileUploadTag, {
      where: { file_id: fileId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find all files with a specific tag
   */
  async findByTagId(tagId: number, qr?: QueryRunner): Promise<FileUploadTag[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileUploadTag, {
      where: { tag_id: tagId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Remove tag assignment
   */
  async delete(id: number, qr: QueryRunner): Promise<void> {
    await qr.manager.delete(FileUploadTag, { id });
  }

  /**
   * Remove tag from file
   */
  async deleteByFileAndTag(
    fileId: number,
    tagId: number,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.delete(FileUploadTag, { file_id: fileId, tag_id: tagId });
  }
}
