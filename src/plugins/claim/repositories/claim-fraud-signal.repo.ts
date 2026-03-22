import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimFraudSignal } from '../entities/claim-fraud-signal.entity';

/**
 * ClaimFraudSignalRepository
 * Handles database operations for claim_fraud_signal table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_fraud_signal
 */
@Injectable()
export class ClaimFraudSignalRepository {
  constructor(
    @InjectRepository(ClaimFraudSignal)
    private readonly repo: Repository<ClaimFraudSignal>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimFraudSignal | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimFraudSignal, { where: { id } });
  }

  async create(
    data: Partial<ClaimFraudSignal>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimFraudSignal, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<ClaimFraudSignal>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimFraudSignal, { id }, data);
  }
}
