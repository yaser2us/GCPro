import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionSubmission } from '../entities/mission-submission.entity';

/**
 * Mission Submission Repository
 * Handles database operations for mission_submission table
 */
@Injectable()
export class SubmissionsRepository {
  constructor(
    @InjectRepository(MissionSubmission)
    private readonly repo: Repository<MissionSubmission>,
  ) {}

  /**
   * Find submission by ID
   */
  async findById(
    submissionId: string,
    queryRunner?: QueryRunner,
  ): Promise<MissionSubmission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionSubmission, {
      where: { submission_id: submissionId },
    });
  }

  /**
   * Find submission by criteria
   */
  async findOne(
    where: Partial<MissionSubmission>,
    queryRunner?: QueryRunner,
  ): Promise<MissionSubmission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionSubmission, { where });
  }

  /**
   * Create submission
   */
  async create(
    data: Partial<MissionSubmission>,
    queryRunner: QueryRunner,
  ): Promise<MissionSubmission> {
    const submission = queryRunner.manager.create(MissionSubmission, data);
    return queryRunner.manager.save(MissionSubmission, submission);
  }

  /**
   * Update submission
   */
  async update(
    where: Partial<MissionSubmission>,
    data: Partial<MissionSubmission>,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(MissionSubmission, where, data);
  }
}
