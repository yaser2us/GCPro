import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionEnrollment } from '../entities/mission-enrollment.entity';

/**
 * Mission Enrollment Repository
 * Handles database operations for mission_enrollment table
 */
@Injectable()
export class EnrollmentsRepository {
  constructor(
    @InjectRepository(MissionEnrollment)
    private readonly repo: Repository<MissionEnrollment>,
  ) {}

  /**
   * Find enrollment by ID
   */
  async findById(
    enrollmentId: string,
    queryRunner?: QueryRunner,
  ): Promise<MissionEnrollment | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionEnrollment, {
      where: { enrollment_id: enrollmentId },
    });
  }

  /**
   * Find enrollment by criteria
   */
  async findOne(
    where: Partial<MissionEnrollment>,
    queryRunner?: QueryRunner,
  ): Promise<MissionEnrollment | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionEnrollment, { where });
  }

  /**
   * Create enrollment
   */
  async create(
    data: Partial<MissionEnrollment>,
    queryRunner: QueryRunner,
  ): Promise<MissionEnrollment> {
    const enrollment = queryRunner.manager.create(MissionEnrollment, data);
    return queryRunner.manager.save(MissionEnrollment, enrollment);
  }

  /**
   * Update enrollment
   */
  async update(
    where: Partial<MissionEnrollment>,
    data: Partial<MissionEnrollment>,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(MissionEnrollment, where, data);
  }
}
