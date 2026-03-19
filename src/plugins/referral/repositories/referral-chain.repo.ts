import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ReferralChain } from '../entities/referral-chain.entity';

/**
 * ReferralChainRepository
 * Handles database operations for referral_chain table
 * Source: specs/referral/referral.pillar.yml resources.referral_chain
 *
 * Purpose: Multi-level referral tracking (ancestor-descendant relationships)
 */
@Injectable()
export class ReferralChainRepository {
  constructor(
    @InjectRepository(ReferralChain)
    private readonly repo: Repository<ReferralChain>,
  ) {}

  /**
   * Find all ancestors of a user (users who referred them directly or indirectly)
   *
   * Example: User D's ancestors are [User C (depth=1), User B (depth=2), User A (depth=3)]
   */
  async findAncestors(
    program_id: number,
    descendant_user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralChain[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.descendant_user_id = :descendant_user_id', { descendant_user_id })
      .orderBy('rc.depth', 'ASC');

    if (max_depth) {
      query.andWhere('rc.depth <= :max_depth', { max_depth });
    }

    return query.getMany();
  }

  /**
   * Find all descendants of a user (users they referred directly or indirectly)
   *
   * Example: User A's descendants are [User B (depth=1), User C (depth=2), User D (depth=3)]
   */
  async findDescendants(
    program_id: number,
    ancestor_user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralChain[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.ancestor_user_id = :ancestor_user_id', { ancestor_user_id })
      .orderBy('rc.depth', 'ASC');

    if (max_depth) {
      query.andWhere('rc.depth <= :max_depth', { max_depth });
    }

    return query.getMany();
  }

  /**
   * Find all ancestors at a specific depth
   */
  async findByDescendant(
    program_id: number,
    descendant_user_id: number,
    queryRunner?: QueryRunner,
  ): Promise<ReferralChain[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    return manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.descendant_user_id = :descendant_user_id', { descendant_user_id })
      .orderBy('rc.depth', 'ASC')
      .getMany();
  }

  /**
   * Count total descendants (downline size)
   */
  async countDescendants(
    program_id: number,
    ancestor_user_id: number,
    max_depth?: number,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = manager
      .createQueryBuilder(ReferralChain, 'rc')
      .where('rc.program_id = :program_id', { program_id })
      .andWhere('rc.ancestor_user_id = :ancestor_user_id', { ancestor_user_id });

    if (max_depth) {
      query.andWhere('rc.depth <= :max_depth', { max_depth });
    }

    return query.getCount();
  }

  /**
   * Upsert referral chain entry (idempotent)
   */
  async upsert(
    data: Partial<ReferralChain>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Filter out undefined values and the 'id' field
    const fields = Object.keys(data).filter((k) => k !== 'id' && data[k] !== undefined);
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null) return 'NULL';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => !['program_id', 'ancestor_user_id', 'descendant_user_id'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO referral_chain (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }

  /**
   * Delete all chains for a conversion (used when voiding)
   */
  async deleteByConversion(
    conversion_id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    await manager
      .createQueryBuilder()
      .delete()
      .from(ReferralChain)
      .where('root_conversion_id = :conversion_id', { conversion_id })
      .execute();
  }
}
