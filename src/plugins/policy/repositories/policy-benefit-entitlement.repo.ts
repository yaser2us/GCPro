import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyBenefitEntitlement } from '../entities/policy-benefit-entitlement.entity';

/**
 * PolicyBenefitEntitlementRepository
 * Handles database operations for policy_benefit_entitlement table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyBenefitEntitlementRepository {
  constructor(
    @InjectRepository(PolicyBenefitEntitlement)
    private readonly repo: Repository<PolicyBenefitEntitlement>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBenefitEntitlement | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBenefitEntitlement, { where: { id } });
  }

  async findActiveByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyBenefitEntitlement | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyBenefitEntitlement, {
      where: { policy_id: policyId, status: 'active' }
    });
  }

  async create(
    data: Partial<PolicyBenefitEntitlement>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyBenefitEntitlement, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyBenefitEntitlement>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyBenefitEntitlement, { id }, data);
  }
}
