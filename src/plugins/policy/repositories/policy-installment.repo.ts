import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { PolicyInstallment } from '../entities/policy-installment.entity';

/**
 * PolicyInstallmentRepository
 * Handles database operations for policy_installment table
 * Source: specs/policy/policy.pillar.v2.yml
 */
@Injectable()
export class PolicyInstallmentRepository {
  constructor(
    @InjectRepository(PolicyInstallment)
    private readonly repo: Repository<PolicyInstallment>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyInstallment | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(PolicyInstallment, { where: { id } });
  }

  async findByBillingPlanId(
    billingPlanId: number,
    queryRunner?: QueryRunner,
  ): Promise<PolicyInstallment[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(PolicyInstallment, {
      where: { billing_plan_id: billingPlanId },
      order: { installment_no: 'ASC' }
    });
  }

  async create(
    data: Partial<PolicyInstallment>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(PolicyInstallment, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<PolicyInstallment>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(PolicyInstallment, { id }, data);
  }

  async upsert(
    data: Partial<PolicyInstallment>,
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
      .filter((k) => !['idempotency_key', 'billing_plan_id', 'installment_no'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO policy_installment (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
