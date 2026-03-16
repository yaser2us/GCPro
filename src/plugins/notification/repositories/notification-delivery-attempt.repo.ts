import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationDeliveryAttempt } from '../entities/notification-delivery-attempt.entity';

/**
 * NotificationDeliveryAttempt Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationDeliveryAttemptRepository {
  constructor(
    @InjectRepository(NotificationDeliveryAttempt)
    private readonly repo: Repository<NotificationDeliveryAttempt>,
  ) {}

  /**
   * Create a new delivery attempt
   */
  async create(
    data: Partial<NotificationDeliveryAttempt>,
    qr: QueryRunner,
  ): Promise<NotificationDeliveryAttempt> {
    const entity = qr.manager.create(NotificationDeliveryAttempt, data);
    return qr.manager.save(NotificationDeliveryAttempt, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationDeliveryAttempt | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationDeliveryAttempt, { where: { id } });
  }

  /**
   * Find all attempts for a message
   */
  async findByMessageId(
    messageId: number,
    qr?: QueryRunner,
  ): Promise<NotificationDeliveryAttempt[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(NotificationDeliveryAttempt, {
      where: { message_id: messageId },
      order: { attempt_no: 'ASC' },
    });
  }

  /**
   * Find specific attempt by message and attempt number
   */
  async findByMessageAndAttempt(
    messageId: number,
    attemptNo: number,
    qr?: QueryRunner,
  ): Promise<NotificationDeliveryAttempt | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationDeliveryAttempt, {
      where: { message_id: messageId, attempt_no: attemptNo },
    });
  }

  /**
   * Update delivery attempt
   */
  async update(
    id: number,
    data: Partial<NotificationDeliveryAttempt>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationDeliveryAttempt, { id }, data);
  }
}
