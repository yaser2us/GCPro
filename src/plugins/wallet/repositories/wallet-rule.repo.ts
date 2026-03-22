import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletRule } from '../entities/wallet-rule.entity';

@Injectable()
export class WalletRuleRepository {
  constructor(
    @InjectRepository(WalletRule)
    private readonly repo: Repository<WalletRule>,
  ) {}

  async upsert(
    data: Partial<WalletRule>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletRule)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletRule)
      .values(data)
      .orUpdate(
        ['operator', 'value_str', 'value_num', 'value_json', 'status'],
        ['rule_set_id', 'rule_code'],
      )
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletRule, { where: { id } });
  }

  async findByRuleSetIdAndCode(
    ruleSetId: number,
    ruleCode: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletRule | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletRule, { where: { rule_set_id: ruleSetId, rule_code: ruleCode } });
  }

  async update(
    id: number,
    data: Partial<WalletRule>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletRule, { id }, data);
  }
}
