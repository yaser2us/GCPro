import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Mission } from '../entities/mission.entity';

/**
 * Mission Repository
 * Handles database operations for missions table
 */
@Injectable()
export class MissionsRepository {
  constructor(
    @InjectRepository(Mission)
    private readonly repo: Repository<Mission>,
  ) {}

  /**
   * Find mission by ID
   * @param queryRunner Optional transaction query runner
   */
  async findById(
    missionId: string,
    queryRunner?: QueryRunner,
  ): Promise<Mission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Mission, { where: { mission_id: missionId } });
  }

  /**
   * Find mission by external reference
   */
  async findByExternalRef(
    externalRef: string,
    queryRunner?: QueryRunner,
  ): Promise<Mission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Mission, { where: { external_ref: externalRef } });
  }

  /**
   * Create a new mission
   */
  async create(data: Partial<Mission>, queryRunner: QueryRunner): Promise<Mission> {
    const mission = queryRunner.manager.create(Mission, data);
    return queryRunner.manager.save(Mission, mission);
  }

  /**
   * Update mission
   */
  async update(
    where: Partial<Mission>,
    data: Partial<Mission>,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(Mission, where, data);
  }
}
