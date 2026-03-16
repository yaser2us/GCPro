import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionRewardGrant } from '../entities/mission-reward-grant.entity';

/**
 * MissionRewardGrantRepository
 * Handles database operations for mission_reward_grant table
 * Source: specs/mission/mission.pillar.yml aggregates.mission_reward_grant
 */
@Injectable()
export class MissionRewardGrantRepository {
  constructor(
    @InjectRepository(MissionRewardGrant)
    private readonly repo: Repository<MissionRewardGrant>,
  ) {}

  /**
   * Find reward grant by assignment_id
   * (assignment_id is unique per uk_mgrant_assignment_once constraint)
   */
  async findByAssignmentId(
    assignment_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionRewardGrant | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionRewardGrant, { where: { assignment_id } });
  }

  /**
   * Create reward grant
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<MissionRewardGrant>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionRewardGrant, data);
    return result.identifiers[0].id;
  }

  /**
   * Update reward grant by ID
   */
  async update(
    id: number,
    data: Partial<MissionRewardGrant>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MissionRewardGrant, { id }, data);
  }

  /**
   * Upsert reward grant by assignment_id (exactly-once semantics)
   * Based on missions.pillar.v1.yml lines 844-853
   */
  async upsert(
    data: Partial<MissionRewardGrant>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      INSERT INTO mission_reward_grant
        (assignment_id, user_id, amount, status, idempotency_key, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        amount = VALUES(amount),
        updated_at = NOW(),
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, [
      data.assignment_id,
      data.user_id,
      data.amount,
      data.status,
      data.idempotency_key || null,
    ]);

    return result.insertId;
  }
}
