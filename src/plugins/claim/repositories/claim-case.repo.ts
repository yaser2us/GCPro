import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimCase } from '../entities/claim-case.entity';

/**
 * ClaimCaseRepository
 * Handles database operations for claim_case table
 * Source: specs/claim/claim.pillar.v2.yml aggregates.CLAIM_CASE
 */
@Injectable()
export class ClaimCaseRepository {
  constructor(
    @InjectRepository(ClaimCase)
    private readonly repo: Repository<ClaimCase>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimCase | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimCase, { where: { id } });
  }

  async findByClaimNumber(
    claimNumber: string,
    queryRunner?: QueryRunner,
  ): Promise<ClaimCase | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimCase, { where: { claim_number: claimNumber } });
  }

  async create(
    data: Partial<ClaimCase>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimCase, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<ClaimCase>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimCase, { id }, data);
  }

  async upsert(
    data: Partial<ClaimCase>,
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
      .filter((k) => k !== 'claim_number')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO claim_case (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
