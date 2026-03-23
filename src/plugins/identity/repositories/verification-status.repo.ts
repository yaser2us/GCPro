import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { VerificationStatus } from '../../user/entities/verification-status.entity';

/**
 * VerificationStatusRepository (identity plugin)
 * Source: specs/identity/identity.pillar.v2.yml
 */
@Injectable()
export class VerificationStatusRepository {
  constructor(
    @InjectRepository(VerificationStatus)
    private readonly repo: Repository<VerificationStatus>,
  ) {}

  async upsert(data: Partial<VerificationStatus>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(VerificationStatus) : this.repo;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(VerificationStatus)
      .values(data)
      .orUpdate(['status', 'meta_json'], ['account_id', 'type'])
      .execute();
    return Number(result.identifiers[0]?.id ?? result.raw?.insertId);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<VerificationStatus | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(VerificationStatus, { where: { id } });
  }
}
