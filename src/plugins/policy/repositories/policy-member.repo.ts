import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyMember } from '../entities/policy-member.entity';

/**
 * PolicyMemberRepository
 * Handles database operations for policy_member table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyMemberRepository {
  constructor(
    @InjectRepository(PolicyMember)
    private readonly repo: Repository<PolicyMember>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyMember | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyMember, { where: { id } });
  }

  async findByPolicyId(
    policyId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyMember[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyMember, { where: { policy_id: policyId } });
  }

  async create(
    data: Partial<PolicyMember>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyMember, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyMember>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyMember, { id }, data);
  }

  async upsert(
    data: Partial<PolicyMember>,
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
      .filter((k) => !['policy_id', 'person_id'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy_member (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
