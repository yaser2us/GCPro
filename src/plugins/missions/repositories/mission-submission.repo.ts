import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionSubmission } from '../entities/mission-submission.entity';

/**
 * MissionSubmissionRepository
 * Handles database operations for mission_submission table
 * Source: specs/mission/mission.pillar.yml aggregates.mission_submission
 */
@Injectable()
export class MissionSubmissionRepository {
  constructor(
    @InjectRepository(MissionSubmission)
    private readonly repo: Repository<MissionSubmission>,
  ) {}

  /**
   * Find submission by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionSubmission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionSubmission, { where: { id } });
  }

  /**
   * Find submission by assignment_id
   */
  async findByAssignmentId(
    assignment_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionSubmission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionSubmission, { where: { assignment_id } });
  }

  /**
   * Create submission
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<MissionSubmission>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionSubmission, data);
    return result.identifiers[0].id;
  }

  /**
   * Update submission by ID
   */
  async update(
    id: number,
    data: Partial<MissionSubmission>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MissionSubmission, { id }, data);
  }
}
