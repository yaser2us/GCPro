import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralConversion } from '../entities/referral-conversion.entity';

/**
 * ReferralConversionRepository
 * Handles database operations for referral_conversion table
 * Source: specs/referral/referral.pillar.yml aggregates.REFERRAL_CONVERSION
 */
@Injectable()
export class ReferralConversionRepository {
  constructor(
    @InjectRepository(ReferralConversion)
    private readonly repo: Repository<ReferralConversion>,
  ) {}

  /**
   * Find referral conversion by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralConversion | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ReferralConversion, { where: { id } });
  }

  /**
   * Upsert referral conversion by program_id + referred_user_id (idempotent create)
   * Based on referral.pillar.yml lines 1187-1200 (upsert by program_id, referred_user_id)
   */
  async upsert(
    data: Partial<ReferralConversion>,
    queryRunner?: QueryRunner,
  ): Promise<{ id: number; isNew: boolean }> {
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
      .filter((k) => !['program_id', 'referred_user_id'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO referral_conversion (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    const isNew = result.affectedRows === 1; // INSERT = 1, UPDATE = 2
    return { id: result.insertId, isNew };
  }
}
