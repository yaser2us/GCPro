import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralRule } from '../entities/referral-rule.entity';

/**
 * ReferralRuleRepository
 * Handles database operations for referral_rule table
 */
@Injectable()
export class ReferralRuleRepository {
  constructor(
    @InjectRepository(ReferralRule)
    private readonly repo: Repository<ReferralRule>,
  ) {}

  async save(
    data: Partial<ReferralRule>,
    queryRunner?: QueryRunner,
  ): Promise<ReferralRule> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.save(ReferralRule, data);
  }

  async findByProgramId(
    programId: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralRule[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(ReferralRule, { where: { program_id: programId } });
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralRule, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<ReferralRule>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ReferralRule, { id }, data);
  }
}
