import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletThresholdRule } from '../entities/wallet-threshold-rule.entity';

@Injectable()
export class WalletThresholdRuleRepository {
  constructor(
    @InjectRepository(WalletThresholdRule)
    private readonly repo: Repository<WalletThresholdRule>,
  ) {}

  async upsert(
    data: Partial<WalletThresholdRule>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletThresholdRule)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletThresholdRule)
      .values(data)
      .orUpdate(
        ['threshold_amount', 'currency', 'status', 'meta_json'],
        ['wallet_id', 'threshold_code'],
      )
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletThresholdRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletThresholdRule, { where: { id } });
  }

  async findByWalletIdAndCode(
    walletId: number,
    thresholdCode: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletThresholdRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletThresholdRule, { where: { wallet_id: walletId, threshold_code: thresholdCode } });
  }

  async update(
    id: number,
    data: Partial<WalletThresholdRule>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletThresholdRule, { id }, data);
  }
}
