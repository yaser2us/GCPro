import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { CommissionPayoutBatch } from '../entities/commission-payout-batch.entity';

/**
 * CommissionPayoutBatchRepository
 * Handles database operations for commission_payout_batch table
 * Source: specs/commission/commission.pillar.v2.yml aggregates.PAYOUT_BATCH
 */
@Injectable()
export class CommissionPayoutBatchRepository {
  constructor(
    @InjectRepository(CommissionPayoutBatch)
    private readonly repo: Repository<CommissionPayoutBatch>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<CommissionPayoutBatch | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(CommissionPayoutBatch, { where: { id } });
  }

  async update(
    id: number,
    data: Partial<CommissionPayoutBatch>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(CommissionPayoutBatch, { id }, data);
  }

  async upsert(
    data: Partial<CommissionPayoutBatch>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Filter out undefined values and the 'id' field
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
      .filter((k) => !['program_id', 'batch_code'].includes(k))
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO commission_payout_batch (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
