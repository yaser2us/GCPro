import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimCaseNumberSequence } from '../entities/claim-case-number-sequence.entity';

/**
 * ClaimCaseNumberSequenceRepository
 * Handles database operations for claim_case_number_sequence table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_case_number_sequence
 */
@Injectable()
export class ClaimCaseNumberSequenceRepository {
  constructor(
    @InjectRepository(ClaimCaseNumberSequence)
    private readonly repo: Repository<ClaimCaseNumberSequence>,
  ) {}

  async findByClaimYear(
    claimYear: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimCaseNumberSequence | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimCaseNumberSequence, { where: { claim_year: claimYear } });
  }

  async create(
    data: Partial<ClaimCaseNumberSequence>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimCaseNumberSequence, data);
    return result.identifiers[0].claim_year;
  }

  async update(
    claimYear: number,
    data: Partial<ClaimCaseNumberSequence>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimCaseNumberSequence, { claim_year: claimYear }, data);
  }

  async upsert(
    data: Partial<ClaimCaseNumberSequence>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => data[k] !== undefined);
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
      .filter((k) => k !== 'claim_year')
      .map((k) => `${k}=VALUES(${k})`)
      .join(', ');

    const sql = `
      INSERT INTO claim_case_number_sequence (${fieldList})
      VALUES (${valueList})
      ON DUPLICATE KEY UPDATE
        claim_year = LAST_INSERT_ID(claim_year)${updateList ? ', ' + updateList : ''}
    `;

    const result = await manager.query(sql);
    return result.insertId;
  }
}
