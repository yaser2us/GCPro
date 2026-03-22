import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CrowdMemberCharge } from '../entities/crowd-member-charge.entity';

/**
 * CrowdMemberChargeRepository
 * Repository for crowd_member_charge table
 */
@Injectable()
export class CrowdMemberChargeRepository {
  constructor(
    @InjectRepository(CrowdMemberCharge)
    private readonly repository: Repository<CrowdMemberCharge>,
  ) {}

  async create(data: Partial<CrowdMemberCharge>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdMemberCharge) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<CrowdMemberCharge | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdMemberCharge) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async update(id: number, data: Partial<CrowdMemberCharge>, queryRunner?: QueryRunner): Promise<void> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdMemberCharge) : this.repository;
    await repo.update(id, data);
  }

  async findByPeriodId(crowdPeriodId: number, queryRunner?: QueryRunner): Promise<CrowdMemberCharge[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdMemberCharge) : this.repository;
    return repo.find({ where: { crowd_period_id: crowdPeriodId } });
  }

  async findByInssurantAndPeriod(
    insurantId: number,
    crowdPeriodId: number,
    queryRunner?: QueryRunner,
  ): Promise<CrowdMemberCharge | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(CrowdMemberCharge) : this.repository;
    return repo.findOne({ where: { insurant_id: insurantId, crowd_period_id: crowdPeriodId } });
  }
}
