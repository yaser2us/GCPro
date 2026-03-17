import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Account } from '../entities/account.entity';

/**
 * AccountRepository
 * Handles database operations for account table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class AccountRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  /**
   * Find account by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Account | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Account, { where: { id } });
  }

  /**
   * Find account by user ID (via person linkage)
   */
  async findByUserId(
    userId: number,
    queryRunner?: QueryRunner,
  ): Promise<Account | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.query(
      `
      SELECT a.*
      FROM account a
      INNER JOIN account_person ap ON a.id = ap.account_id
      INNER JOIN person p ON ap.person_id = p.id
      WHERE p.primary_user_id = ? AND a.type = 'user'
      LIMIT 1
      `,
      [userId],
    );
    return result[0] || null;
  }

  /**
   * Create account
   */
  async create(
    data: Partial<Account>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Account, data);
    return result.identifiers[0].id;
  }

  /**
   * Update account
   */
  async update(
    id: number,
    data: Partial<Account>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Account, { id }, data);
  }
}
