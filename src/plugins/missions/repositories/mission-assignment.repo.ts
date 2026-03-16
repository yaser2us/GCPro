import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionAssignment } from '../entities/mission-assignment.entity';

/**
 * MissionAssignmentRepository
 * Handles database operations for mission_assignment table
 * Source: specs/mission/mission.pillar.yml aggregates.mission_assignment
 */
@Injectable()
export class MissionAssignmentRepository {
  constructor(
    @InjectRepository(MissionAssignment)
    private readonly repo: Repository<MissionAssignment>,
  ) {}

  /**
   * Find assignment by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionAssignment | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionAssignment, { where: { id } });
  }

  /**
   * Find assignment by mission_id and user_id
   */
  async findByMissionAndUser(
    mission_id: number,
    user_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionAssignment | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionAssignment, { where: { mission_id, user_id } });
  }

  /**
   * Create assignment
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<MissionAssignment>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionAssignment, data);
    return result.identifiers[0].id;
  }

  /**
   * Update assignment by ID
   */
  async update(
    id: number,
    data: Partial<MissionAssignment>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MissionAssignment, { id }, data);
  }

  /**
   * Upsert assignment by mission_definition_id + user_id (idempotent assign)
   * Based on missions.pillar.v1.yml lines 546-552
   */
  async upsert(
    data: Partial<MissionAssignment>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      INSERT INTO mission_assignment
        (mission_id, user_id, status, idempotency_key, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        updated_at = NOW(),
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, [
      data.mission_id,
      data.user_id,
      data.status,
      data.idempotency_key || null,
    ]);

    return result.insertId;
  }

  /**
   * Find all assignments for a user
   */
  async findByUserId(
    user_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionAssignment[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionAssignment, {
      where: { user_id },
      order: { created_at: 'DESC' },
    });
  }
}
