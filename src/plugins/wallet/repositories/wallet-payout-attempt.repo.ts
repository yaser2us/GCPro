import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletPayoutAttempt } from '../entities/wallet-payout-attempt.entity';

@Injectable()
export class WalletPayoutAttemptRepository {
  constructor(
    @InjectRepository(WalletPayoutAttempt)
    private readonly repo: Repository<WalletPayoutAttempt>,
  ) {}

  async insert(
    data: Partial<WalletPayoutAttempt>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletPayoutAttempt)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletPayoutAttempt)
      .values(data)
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletPayoutAttempt | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletPayoutAttempt, { where: { id } });
  }

  async findByWithdrawalRequestId(
    withdrawalRequestId: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletPayoutAttempt[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(WalletPayoutAttempt, { where: { withdrawal_request_id: withdrawalRequestId } });
  }
}
