import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationMessage } from '../entities/notification-message.entity';

/**
 * NotificationMessage Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationMessageRepository {
  constructor(
    @InjectRepository(NotificationMessage)
    private readonly repo: Repository<NotificationMessage>,
  ) {}

  /**
   * Create a new notification message
   */
  async create(
    data: Partial<NotificationMessage>,
    qr: QueryRunner,
  ): Promise<NotificationMessage> {
    const entity = qr.manager.create(NotificationMessage, data);
    return qr.manager.save(NotificationMessage, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationMessage | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationMessage, { where: { id } });
  }

  /**
   * Find by message_key
   */
  async findByMessageKey(
    messageKey: string,
    qr?: QueryRunner,
  ): Promise<NotificationMessage | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationMessage, {
      where: { message_key: messageKey },
    });
  }

  /**
   * Upsert message by message_key
   */
  async upsertByMessageKey(
    data: Partial<NotificationMessage>,
    qr: QueryRunner,
  ): Promise<NotificationMessage> {
    const existing = await this.findByMessageKey(data.message_key!, qr);
    if (existing) {
      return existing;
    }
    return this.create(data, qr);
  }

  /**
   * Update notification message
   */
  async update(
    id: number,
    data: Partial<NotificationMessage>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationMessage, { id }, data);
  }

  /**
   * Find next queued message for processing
   */
  async findNextQueued(qr: QueryRunner): Promise<NotificationMessage | null> {
    return qr.manager
      .createQueryBuilder(NotificationMessage, 'nm')
      .where('nm.status = :status', { status: 'queued' })
      .andWhere('(nm.scheduled_for IS NULL OR nm.scheduled_for <= NOW())')
      .orderBy('nm.created_at', 'ASC')
      .setLock('pessimistic_write')
      .getOne();
  }

  /**
   * Find messages by status
   */
  async findByStatus(
    status: string,
    qr?: QueryRunner,
  ): Promise<NotificationMessage[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(NotificationMessage, {
      where: { status },
      order: { created_at: 'DESC' },
    });
  }
}
