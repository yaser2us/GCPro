import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';

/**
 * NotificationTemplate Repository
 * Source: specs/notification/notification.pillar.v2.yml
 */
@Injectable()
export class NotificationTemplateRepository {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly repo: Repository<NotificationTemplate>,
  ) {}

  /**
   * Create a new template
   */
  async create(
    data: Partial<NotificationTemplate>,
    qr: QueryRunner,
  ): Promise<NotificationTemplate> {
    const entity = qr.manager.create(NotificationTemplate, data);
    return qr.manager.save(NotificationTemplate, entity);
  }

  /**
   * Find by ID
   */
  async findById(
    id: number,
    qr?: QueryRunner,
  ): Promise<NotificationTemplate | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationTemplate, { where: { id } });
  }

  /**
   * Find by code and channel (active, latest version)
   */
  async findByCodeAndChannel(
    code: string,
    channel: string,
    locale: string = 'en',
    qr?: QueryRunner,
  ): Promise<NotificationTemplate | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationTemplate, {
      where: {
        code,
        channel,
        locale,
        status: 'active',
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find by unique constraint
   */
  async findByConstraint(
    code: string,
    version: string,
    locale: string,
    channel: string,
    qr?: QueryRunner,
  ): Promise<NotificationTemplate | null> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.findOne(NotificationTemplate, {
      where: { code, version, locale, channel },
    });
  }

  /**
   * Upsert template by unique constraint
   */
  async upsertByConstraint(
    data: Partial<NotificationTemplate>,
    qr: QueryRunner,
  ): Promise<NotificationTemplate> {
    const existing = await this.findByConstraint(
      data.code!,
      data.version!,
      data.locale!,
      data.channel!,
      qr,
    );
    if (existing) {
      return existing;
    }
    return this.create(data, qr);
  }

  /**
   * Update template
   */
  async update(
    id: number,
    data: Partial<NotificationTemplate>,
    qr: QueryRunner,
  ): Promise<void> {
    await qr.manager.update(NotificationTemplate, { id }, data);
  }

  /**
   * Find all templates by code
   */
  async findByCode(
    code: string,
    qr?: QueryRunner,
  ): Promise<NotificationTemplate[]> {
    const manager = qr ? qr.manager : this.repo.manager;
    return manager.find(NotificationTemplate, {
      where: { code },
      order: { version: 'DESC', created_at: 'DESC' },
    });
  }
}
