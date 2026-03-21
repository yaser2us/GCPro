import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyRemediationCase } from '../entities/policy-remediation-case.entity';

/**
 * PolicyRemediationCaseRepository
 * Handles database operations for policy_remediation_case table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyRemediationCaseRepository {
  constructor(
    @InjectRepository(PolicyRemediationCase)
    private readonly repo: Repository<PolicyRemediationCase>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyRemediationCase | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyRemediationCase, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyRemediationCase[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyRemediationCase, { where: { policy_id: policyId } });
  }

  async create(
    data: Partial<PolicyRemediationCase>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyRemediationCase, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyRemediationCase>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyRemediationCase, { id }, data);
  }
}
