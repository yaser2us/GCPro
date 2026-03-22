import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { WalletWithdrawalRequest } from '../entities/wallet-withdrawal-request.entity';

@Injectable()
export class WalletWithdrawalRequestRepository {
  constructor(
    @InjectRepository(WalletWithdrawalRequest)
    private readonly repo: Repository<WalletWithdrawalRequest>,
  ) {}

  async insert(
    data: Partial<WalletWithdrawalRequest>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(WalletWithdrawalRequest)
      : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(WalletWithdrawalRequest)
      .values(data)
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<WalletWithdrawalRequest | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(WalletWithdrawalRequest, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<WalletWithdrawalRequest>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(WalletWithdrawalRequest, { id }, data);
  }
}
