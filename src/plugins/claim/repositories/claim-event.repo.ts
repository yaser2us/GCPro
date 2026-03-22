import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimEvent } from '../entities/claim-event.entity';

/**
 * ClaimEventRepository
 * Handles database operations for claim_event table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_event
 */
@Injectable()
export class ClaimEventRepository {
  constructor(
    @InjectRepository(ClaimEvent)
    private readonly repo: Repository<ClaimEvent>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimEvent | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimEvent, { where: { id } });
  }

  async create(
    data: Partial<ClaimEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimEvent, data);
    return result.identifiers[0].id;
  }
}
