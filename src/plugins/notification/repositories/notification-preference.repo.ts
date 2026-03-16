import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';

/**
 * NotificationPreference Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationPreferenceRepository {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly repo: Repository<NotificationPreference>,
  ) {}

  /**
   * Create a new preference
   */
  async create(
    data: Partial<NotificationPreference>,
    qr: QueryRunner,
  ): Promise<NotificationPreference> {
    const entity = qr.manager.create(NotificationPreference, data);
    return qr.manager.save(NotificationPreference, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationPreference | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationPreference, { where: { id } });
  }

  /**
   * Find by account and person
   */
  async findByAccountAndPerson(
    accountId: number,
    personId: number | null,
    qr?: QueryRunner,
  ): Promise<NotificationPreference | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    const whereCondition: any = { account_id: accountId };

    if (personId === null) {
      const { IsNull } = await import('typeorm');
      whereCondition.person_id = IsNull();
    } else {
      whereCondition.person_id = personId;
    }

    return manager.findOne(NotificationPreference, {
      where: whereCondition,
    });
  }

  /**
   * Upsert preference by account and person
   */
  async upsertByAccountAndPerson(
    data: Partial<NotificationPreference>,
    qr: QueryRunner,
  ): Promise<NotificationPreference> {
    const existing = await this.findByAccountAndPerson(
      data.account_id!,
      data.person_id || null,
      qr,
    );
    if (existing) {
      return existing;
    }
    return this.create(data, qr);
  }

  /**
   * Update preference
   */
  async update(
    id: number,
    data: Partial<NotificationPreference>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationPreference, { id }, data);
  }
}
