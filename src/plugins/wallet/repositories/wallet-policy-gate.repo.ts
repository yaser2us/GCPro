import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletPolicyGate } from '../entities/wallet-policy-gate.entity';

@Injectable()
export class WalletPolicyGateRepository {
  constructor(
    @InjectRepository(WalletPolicyGate)
    private readonly repo: Repository<WalletPolicyGate>,
  ) {}

  async upsert(
    data: Partial<WalletPolicyGate>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletPolicyGate)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletPolicyGate)
      .values(data)
      .orUpdate(['status', 'meta_json'], ['wallet_id', 'gate_code'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletPolicyGate | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletPolicyGate, { where: { id } });
  }

  async findByWalletIdAndGateCode(
    walletId: number,
    gateCode: string,
    queryRunner?: QueryRunner,
  ): Promise<WalletPolicyGate | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletPolicyGate, { where: { wallet_id: walletId, gate_code: gateCode } });
  }

  async update(
    id: number,
    data: Partial<WalletPolicyGate>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletPolicyGate, { id }, data);
  }
}
