import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralEvent } from '../entities/referral-event.entity';

/**
 * ReferralEventRepository
 * Handles database operations for referral_event table
 * Source: specs/referral/referral.pillar.yml resources.referral_event
 */
@Injectable()
export class ReferralEventRepository {
  constructor(
    @InjectRepository(ReferralEvent)
    private readonly repo: Repository<ReferralEvent>,
  ) {}

  /**
   * Create referral event (audit log entry)
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<ReferralEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ReferralEvent, data);
    return result.identifiers[0].id;
  }
}
