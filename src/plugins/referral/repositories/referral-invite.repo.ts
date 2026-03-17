import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralInvite } from '../entities/referral-invite.entity';

/**
 * ReferralInviteRepository
 * Handles database operations for referral_invite table
 * Source: specs/referral/referral.pillar.yml aggregates.REFERRAL_INVITE
 */
@Injectable()
export class ReferralInviteRepository {
  constructor(
    @InjectRepository(ReferralInvite)
    private readonly repo: Repository<ReferralInvite>,
  ) {}

  /**
   * Find referral invite by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralInvite | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralInvite, { where: { id } });
  }

  /**
   * Find referral invite by token
   */
  async findByToken(
    invite_token: string,
    queryRunner?: QueryRunner,
  ): Promise<ReferralInvite | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralInvite, { where: { invite_token } });
  }

  /**
   * Create referral invite
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<ReferralInvite>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ReferralInvite, data);
    return result.identifiers[0].id;
  }

  /**
   * Update referral invite by ID
   */
  async update(
    id: number,
    data: Partial<ReferralInvite>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ReferralInvite, { id }, data);
  }
}
