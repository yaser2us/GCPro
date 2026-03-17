import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { AccountPerson } from '../entities/account-person.entity';

/**
 * AccountPersonRepository
 * Handles database operations for account_person table
 *
 * Based on: specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class AccountPersonRepository {
  constructor(
    @InjectRepository(AccountPerson)
    private readonly repo: Repository<AccountPerson>,
  ) {}

  /**
   * Find account-person linkage
   */
  async findByAccountAndPerson(
    accountId: number,
    personId: number,
    queryRunner?: QueryRunner,
  ): Promise<AccountPerson | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(AccountPerson, {
      where: { account_id: accountId, person_id: personId },
    });
  }

  /**
   * Create account-person linkage
   */
  async create(
    data: Partial<AccountPerson>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.insert(AccountPerson, {
      ...data,
      role: data.role || 'owner',
    });
  }

  /**
   * List persons for an account
   */
  async listByAccount(
    accountId: number,
    queryRunner?: QueryRunner,
  ): Promise<AccountPerson[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(AccountPerson, {
      where: { account_id: accountId },
    });
  }

  /**
   * List accounts for a person
   */
  async listByPerson(
    personId: number,
    queryRunner?: QueryRunner,
  ): Promise<AccountPerson[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(AccountPerson, {
      where: { person_id: personId },
    });
  }

  /**
   * Delete account-person linkage
   */
  async delete(
    accountId: number,
    personId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(AccountPerson, {
      account_id: accountId,
      person_id: personId,
    });
  }
}
