import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralRewardGrant } from '../entities/referral-reward-grant.entity';

/**
 * ReferralRewardGrantRepository
 * Handles database operations for referral_reward_grant table
 * Source: specs/referral/referral.pillar.yml aggregates.REFERRAL_REWARD_GRANT
 */
@Injectable()
export class ReferralRewardGrantRepository {
  constructor(
    @InjectRepository(ReferralRewardGrant)
    private readonly repo: Repository<ReferralRewardGrant>,
  ) {}

  /**
   * Find referral reward grant by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralRewardGrant | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralRewardGrant, { where: { id } });
  }

  /**
   * Upsert referral reward grant by conversion_id + beneficiary_role (idempotent create)
   * Based on referral.pillar.yml lines 1280-1295 (upsert by conversion_id, beneficiary_role)
   */
  async upsert(
    data: Partial<ReferralRewardGrant>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Use MySQL ON DUPLICATE KEY UPDATE pattern
    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => !['conversion_id', 'beneficiary_role'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO referral_reward_grant (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
