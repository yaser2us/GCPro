import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimLink } from '../entities/claim-link.entity';

/**
 * ClaimLinkRepository
 * Handles database operations for claim_link table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_link
 */
@Injectable()
export class ClaimLinkRepository {
  constructor(
    @InjectRepository(ClaimLink)
    private readonly repo: Repository<ClaimLink>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimLink | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimLink, { where: { id } });
  }

  async create(
    data: Partial<ClaimLink>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimLink, data);
    return result.identifiers[0].id;
  }

  async delete(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(ClaimLink, { id });
  }
}
