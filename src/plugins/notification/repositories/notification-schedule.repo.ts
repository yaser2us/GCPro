import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationSchedule } from '../entities/notification-schedule.entity';

/**
 * NotificationSchedule Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationScheduleRepository {
  constructor(
    @InjectRepository(NotificationSchedule)
    private readonly repo: Repository<NotificationSchedule>,
  ) {}

  /**
   * Create a new schedule
   */
  async create(
    data: Partial<NotificationSchedule>,
    qr: QueryRunner,
  ): Promise<NotificationSchedule> {
    const entity = qr.manager.create(NotificationSchedule, data);
    return qr.manager.save(NotificationSchedule, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationSchedule | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationSchedule, { where: { id } });
  }

  /**
   * Find all schedules for a message
   */
  async findByMessageId(
    messageId: number,
    qr?: QueryRunner,
  ): Promise<NotificationSchedule[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(NotificationSchedule, {
      where: { message_id: messageId },
      order: { fire_at: 'ASC' },
    });
  }

  /**
   * Update schedule
   */
  async update(
    id: number,
    data: Partial<NotificationSchedule>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationSchedule, { id }, data);
  }

  /**
   * Find pending schedules ready to fire
   */
  async findPendingReady(qr: QueryRunner): Promise<NotificationSchedule[]> {
    return qr.manager
      .createQueryBuilder(NotificationSchedule, 'ns')
      .where('ns.status = :status', { status: 'pending' })
      .andWhere('ns.fire_at <= NOW()')
      .orderBy('ns.fire_at', 'ASC')
      .getMany();
  }
}
