import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationChannelPreference } from '../entities/notification-channel-preference.entity';

/**
 * NotificationChannelPreference Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationChannelPreferenceRepository {
  constructor(
    @InjectRepository(NotificationChannelPreference)
    private readonly repo: Repository<NotificationChannelPreference>,
  ) {}

  /**
   * Create a new channel preference
   */
  async create(
    data: Partial<NotificationChannelPreference>,
    qr: QueryRunner,
  ): Promise<NotificationChannelPreference> {
    const entity = qr.manager.create(NotificationChannelPreference, data);
    return qr.manager.save(NotificationChannelPreference, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationChannelPreference | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationChannelPreference, { where: { id } });
  }

  /**
   * Find by preference and channel
   */
  async findByPreferenceAndChannel(
    preferenceId: number,
    channel: string,
    qr?: QueryRunner,
  ): Promise<NotificationChannelPreference | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationChannelPreference, {
      where: { preference_id: preferenceId, channel },
    });
  }

  /**
   * Find all channels for a preference
   */
  async findByPreferenceId(
    preferenceId: number,
    qr?: QueryRunner,
  ): Promise<NotificationChannelPreference[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(NotificationChannelPreference, {
      where: { preference_id: preferenceId },
      order: { priority: 'ASC' },
    });
  }

  /**
   * Upsert channel preference
   */
  async upsertByConstraint(
    data: Partial<NotificationChannelPreference>,
    qr: QueryRunner,
  ): Promise<NotificationChannelPreference> {
    const existing = await this.findByPreferenceAndChannel(
      data.preference_id!,
      data.channel!,
      qr,
    );

    if (existing) {
      await this.update(existing.id, data, qr);
      return this.findById(existing.id, qr) as Promise<NotificationChannelPreference>;
    }

    return this.create(data, qr);
  }

  /**
   * Update channel preference
   */
  async update(
    id: number,
    data: Partial<NotificationChannelPreference>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationChannelPreference, { id }, data);
  }
}
