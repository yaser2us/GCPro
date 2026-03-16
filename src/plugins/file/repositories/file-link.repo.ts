import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileLink } from '../entities/file-link.entity';

/**
 * FileLink Repository
 * Source: specs/file/file.pillar.v2.yml
 *
 * Manages polymorphic links between files and other entities
 */
@Injectable()
export class FileLinkRepository {
  constructor(
    @InjectRepository(FileLink)
    private readonly repo: Repository<FileLink>,
  ) {}

  /**
   * Create a new file link
   */
  async create(data: Partial<FileLink>, qr: QueryRunner): Promise<FileLink> {
    const entity = qr.manager.create(FileLink, data);
    return qr.manager.save(FileLink, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileLink | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileLink, { where: { id } });
  }

  /**
   * Upsert file link by unique constraint
   * UNIQUE(file_id, target_type, target_id, role_code)
   */
  async upsertByConstraint(
    data: Partial<FileLink>,
    qr: QueryRunner,
  ): Promise<FileLink> {
    const whereCondition: any = {
      file_id: data.file_id!,
      target_type: data.target_type!,
      target_id: data.target_id!,
    };

    if (data.role_code === null || data.role_code === undefined) {
      // For null role_code, we need to use IsNull()
      const { IsNull } = await import('typeorm');
      whereCondition.role_code = IsNull();
    } else {
      whereCondition.role_code = data.role_code;
    }

    const existing = await qr.manager.findOne(FileLink, {
      where: whereCondition,
    });

    if (existing) {
      return existing;
    }

    return this.create(data, qr);
  }

  /**
   * Find all links for a file
   */
  async findByFileId(fileId: number, qr?: QueryRunner): Promise<FileLink[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileLink, {
      where: { file_id: fileId },
      order: { linked_at: 'DESC' },
    });
  }

  /**
   * Find all files linked to a target entity
   */
  async findByTarget(
    targetType: string,
    targetId: string,
    qr?: QueryRunner,
  ): Promise<FileLink[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileLink, {
      where: { target_type: targetType, target_id: targetId },
      order: { linked_at: 'DESC' },
    });
  }

  /**
   * Find files linked to a target with specific role
   */
  async findByTargetAndRole(
    targetType: string,
    targetId: string,
    roleCode: string | null,
    qr?: QueryRunner,
  ): Promise<FileLink[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    const whereCondition: any = {
      target_type: targetType,
      target_id: targetId,
    };

    if (roleCode === null) {
      const { IsNull } = await import('typeorm');
      whereCondition.role_code = IsNull();
    } else {
      whereCondition.role_code = roleCode;
    }

    return manager.find(FileLink, {
      where: whereCondition,
      order: { linked_at: 'DESC' },
    });
  }

  /**
   * Delete a file link
   */
  async delete(id: number, qr: QueryRunner): Promise<void> {
    await qr.manager.delete(FileLink, { id });
  }
}
