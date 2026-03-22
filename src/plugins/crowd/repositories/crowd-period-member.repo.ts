import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdPeriodMember } from '../entities/crowd-period-member.entity';

/**
 * CrowdPeriodMemberRepository
 * Repository for crowd_period_member table
 */
@Injectable()
export class CrowdPeriodMemberRepository {
  constructor(
    @InjectRepository(CrowdPeriodMember)
    private readonly repository: Repository<CrowdPeriodMember>,
  ) {}

  async create(data: Partial<CrowdPeriodMember>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodMember) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdPeriodMember | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodMember) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdPeriodMember>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodMember) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdPeriodMember[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdPeriodMember) : this.repository;
    return repo.find({ where: { crowd_period_id: crowdPeriodId } });
  }
}
