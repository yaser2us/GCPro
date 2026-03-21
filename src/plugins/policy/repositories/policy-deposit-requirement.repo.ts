import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyDepositRequirement } from '../entities/policy-deposit-requirement.entity';

/**
 * PolicyDepositRequirementRepository
 * Handles database operations for policy_deposit_requirement table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyDepositRequirementRepository {
  constructor(
    @InjectRepository(PolicyDepositRequirement)
    private readonly repo: Repository<PolicyDepositRequirement>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyDepositRequirement | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyDepositRequirement, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyDepositRequirement | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyDepositRequirement, { where: { policy_id: policyId } });
  }

  async create(
    data: Partial<PolicyDepositRequirement>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyDepositRequirement, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyDepositRequirement>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyDepositRequirement, { id }, data);
  }

  async upsert(
    data: Partial<PolicyDepositRequirement>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id' && data[k] !== undefined);
    const values = fields.map((k) => {
      const value = data[k];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null) return 'NULL';
      if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return String(value);
    });

    const fieldList = fields.join(', ');
    const valueList = values.join(', ');
    const updateList = fields
      .filter((k) => k !== 'policy_id')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy_deposit_requirement (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
