import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdClaimPayout } from '../entities/crowd-claim-payout.entity';

/**
 * CrowdClaimPayoutRepository
 * Repository for crowd_claim_payout table
 */
@Injectable()
export class CrowdClaimPayoutRepository {
  constructor(
    @InjectRepository(CrowdClaimPayout)
    private readonly repository: Repository<CrowdClaimPayout>,
  ) {}

  async create(data: Partial<CrowdClaimPayout>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdClaimPayout) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdClaimPayout | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdClaimPayout) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdClaimPayout>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdClaimPayout) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdClaimPayout[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdClaimPayout) : this.repository;
    return repo.find({ where: { crowd_period_id: crowdPeriodId } });
  }
}
