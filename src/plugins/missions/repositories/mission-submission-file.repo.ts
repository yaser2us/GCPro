import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionSubmissionFile } from '../entities/mission-submission-file.entity';

/**
 * MissionSubmissionFileRepository
 * Handles database operations for mission_submission_file table
 * Source: specs/mission/missions.pillar.v2.yml
 */
@Injectable()
export class MissionSubmissionFileRepository {
  constructor(
    @InjectRepository(MissionSubmissionFile)
    private readonly repo: Repository<MissionSubmissionFile>,
  ) {}

  /**
   * Find files by submission ID
   */
  async findBySubmissionId(
    submission_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionSubmissionFile[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionSubmissionFile, {
      where: { submission_id },
      order: { sort_order: 'ASC', created_at: 'ASC' },
    });
  }

  /**
   * Create submission file
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<MissionSubmissionFile>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionSubmissionFile, data);
    return result.identifiers[0].id;
  }

  /**
   * Delete submission file by ID
   */
  async delete(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(MissionSubmissionFile, { id });
  }
}
