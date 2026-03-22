import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { BankProfile } from '../entities/bank-profile.entity';

/**
 * BankProfileRepository
 * Handles database operations for bank_profile table
 */
@Injectable()
export class BankProfileRepository {
  constructor(
    @InjectRepository(BankProfile)
    private readonly repo: Repository<BankProfile>,
  ) {}

  async save(
    data: Partial<BankProfile>,
    queryRunner?: QueryRunner,
  ): Promise<BankProfile> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.save(BankProfile, data);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<BankProfile | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(BankProfile, { where: { id } });
  }

  async findByAccountId(
    accountId: number,
    queryRunner?: QueryRunner,
  ): Promise<BankProfile[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(BankProfile, { where: { account_id: accountId } });
  }

  async update(
    id: number,
    data: Partial<BankProfile>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(BankProfile, { id }, data);
  }
}
