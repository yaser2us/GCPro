import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralCode } from '../entities/referral-code.entity';

/**
 * ReferralCodeRepository
 * Handles database operations for referral_code table
 * Source: specs/referral/referral.pillar.yml resources.referral_code
 */
@Injectable()
export class ReferralCodeRepository {
  constructor(
    @InjectRepository(ReferralCode)
    private readonly repo: Repository<ReferralCode>,
  ) {}

  /**
   * Find referral code by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralCode | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralCode, { where: { id } });
  }

  /**
   * Upsert referral code by program_id + code (idempotent create)
   * Based on referral.pillar.yml lines 1043-1053 (upsert by program_id, code)
   */
  async upsert(
    data: Partial<ReferralCode>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Use MySQL ON DUPLICATE KEY UPDATE pattern
    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null || value === undefined) return 'NULL';
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => !['program_id', 'code'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO referral_code (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
