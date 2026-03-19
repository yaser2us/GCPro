import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionPayoutItem } from '../entities/commission-payout-item.entity';

/**
 * CommissionPayoutItemRepository
 * Handles database operations for commission_payout_item table
 */
@Injectable()
export class CommissionPayoutItemRepository {
  constructor(
    @InjectRepository(CommissionPayoutItem)
    private readonly repo: Repository<CommissionPayoutItem>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionPayoutItem | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(CommissionPayoutItem, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<CommissionPayoutItem>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(CommissionPayoutItem, { id }, data);
  }
}
