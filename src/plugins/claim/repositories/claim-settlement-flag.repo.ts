import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimSettlementFlag } from '../entities/claim-settlement-flag.entity';

/**
 * ClaimSettlementFlagRepository
 * Handles database operations for claim_settlement_flag table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_settlement_flag
 */
@Injectable()
export class ClaimSettlementFlagRepository {
  constructor(
    @InjectRepository(ClaimSettlementFlag)
    private readonly repo: Repository<ClaimSettlementFlag>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimSettlementFlag | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimSettlementFlag, { where: { id } });
  }

  async create(
    data: Partial<ClaimSettlementFlag>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimSettlementFlag, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<ClaimSettlementFlag>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimSettlementFlag, { id }, data);
  }
}
