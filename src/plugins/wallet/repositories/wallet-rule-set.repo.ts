import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletRuleSet } from '../entities/wallet-rule-set.entity';

@Injectable()
export class WalletRuleSetRepository {
  constructor(
    @InjectRepository(WalletRuleSet)
    private readonly repo: Repository<WalletRuleSet>,
  ) {}

  async insert(
    data: Partial<WalletRuleSet>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletRuleSet)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletRuleSet)
      .values(data)
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletRuleSet | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletRuleSet, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletRuleSet>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletRuleSet, { id }, data);
  }

  async findActiveByWalletId(
    walletId: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletRuleSet | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletRuleSet, {
      where: { wallet_id: walletId, status: 'active' },
      order: { created_at: 'DESC' },
    });
  }
}
