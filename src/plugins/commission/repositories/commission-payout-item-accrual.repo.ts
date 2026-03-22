import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionPayoutItemAccrual } from '../entities/commission-payout-item-accrual.entity';

/**
 * CommissionPayoutItemAccrualRepository
 * Handles database operations for commission_payout_item_accrual table
 */
@Injectable()
export class CommissionPayoutItemAccrualRepository {
  constructor(
    @InjectRepository(CommissionPayoutItemAccrual)
    private readonly repo: Repository<CommissionPayoutItemAccrual>,
  ) {}

  async save(
    data: Partial<CommissionPayoutItemAccrual>,
    queryRunner?: QueryRunner,
  ): Promise<CommissionPayoutItemAccrual> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.save(CommissionPayoutItemAccrual, data);
  }

  async findByPayoutItemId(
    payoutItemId: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionPayoutItemAccrual[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(CommissionPayoutItemAccrual, {
      where: { payout_item_id: payoutItemId },
    });
  }

  async findByAccrualId(
    accrualId: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionPayoutItemAccrual[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(CommissionPayoutItemAccrual, {
      where: { accrual_id: accrualId },
    });
  }
}
