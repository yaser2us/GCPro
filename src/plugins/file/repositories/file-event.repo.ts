import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { FileEvent } from '../entities/file-event.entity';

/**
 * FileEvent Repository
 * Source: specs/file/file.pillar.v2.yml
 *
 * Manages audit trail for file operations
 */
@Injectable()
export class FileEventRepository {
  constructor(
    @InjectRepository(FileEvent)
    private readonly repo: Repository<FileEvent>,
  ) {}

  /**
   * Create a new file event
   */
  async create(data: Partial<FileEvent>, qr: QueryRunner): Promise<FileEvent> {
    const entity = qr.manager.create(FileEvent, data);
    return qr.manager.save(FileEvent, entity);
  }

  /**
   * Find by ID
   */
  async findById(id: number, qr?: QueryRunner): Promise<FileEvent | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(FileEvent, { where: { id } });
  }

  /**
   * Find all events for a file
   */
  async findByFileId(fileId: number, qr?: QueryRunner): Promise<FileEvent[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileEvent, {
      where: { file_id: fileId },
      order: { occurred_at: 'DESC' },
    });
  }

  /**
   * Find events by type for a file
   */
  async findByFileIdAndType(
    fileId: number,
    eventType: string,
    qr?: QueryRunner,
  ): Promise<FileEvent[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(FileEvent, {
      where: { file_id: fileId, event_type: eventType },
      order: { occurred_at: 'DESC' },
    });
  }
}
