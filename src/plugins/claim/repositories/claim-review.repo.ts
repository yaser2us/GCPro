import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimReview } from '../entities/claim-review.entity';

/**
 * ClaimReviewRepository
 * Handles database operations for claim_review table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_review
 */
@Injectable()
export class ClaimReviewRepository {
  constructor(
    @InjectRepository(ClaimReview)
    private readonly repo: Repository<ClaimReview>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimReview | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimReview, { where: { id } });
  }

  async create(
    data: Partial<ClaimReview>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimReview, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<ClaimReview>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimReview, { id }, data);
  }
}
