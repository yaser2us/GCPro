import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyStatusEvent } from '../entities/policy-status-event.entity';

/**
 * PolicyStatusEventRepository
 * Handles database operations for policy_status_event table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyStatusEventRepository {
  constructor(
    @InjectRepository(PolicyStatusEvent)
    private readonly repo: Repository<PolicyStatusEvent>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyStatusEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyStatusEvent, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyStatusEvent[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyStatusEvent, {
      where: { policy_id: policyId },
      order: { created_at: 'DESC' }
    });
  }

  async create(
    data: Partial<PolicyStatusEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyStatusEvent, data);
    return result.identifiers[0].id;
  }
}
