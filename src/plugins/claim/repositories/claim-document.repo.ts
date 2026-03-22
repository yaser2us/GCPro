import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ClaimDocument } from '../entities/claim-document.entity';

/**
 * ClaimDocumentRepository
 * Handles database operations for claim_document table
 * Source: specs/claim/claim.pillar.v2.yml resources.claim_document
 */
@Injectable()
export class ClaimDocumentRepository {
  constructor(
    @InjectRepository(ClaimDocument)
    private readonly repo: Repository<ClaimDocument>,
  ) {}

  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<ClaimDocument | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(ClaimDocument, { where: { id } });
  }

  async create(
    data: Partial<ClaimDocument>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(ClaimDocument, data);
    return result.identifiers[0].id;
  }

  async update(
    id: number,
    data: Partial<ClaimDocument>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(ClaimDocument, { id }, data);
  }

  async delete(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(ClaimDocument, { id });
  }
}
