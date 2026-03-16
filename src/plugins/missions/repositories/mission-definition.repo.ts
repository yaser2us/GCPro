import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionDefinition } from '../entities/mission-definition.entity';

/**
 * MissionDefinitionRepository
 * Handles database operations for mission_definition table
 * Source: specs/mission/mission.pillar.yml aggregates.mission_definition
 */
@Injectable()
export class MissionDefinitionRepository {
  constructor(
    @InjectRepository(MissionDefinition)
    private readonly repo: Repository<MissionDefinition>,
  ) {}

  /**
   * Find mission definition by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionDefinition | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionDefinition, { where: { id } });
  }

  /**
   * Find mission definition by code
   */
  async findByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<MissionDefinition | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionDefinition, { where: { code } });
  }

  /**
   * Create mission definition
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<MissionDefinition>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionDefinition, data);
    return result.identifiers[0].id;
  }

  /**
   * Update mission definition by ID
   */
  async update(
    id: number,
    data: Partial<MissionDefinition>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(MissionDefinition, { id }, data);
  }

  /**
   * Upsert mission definition by code (idempotent create)
   * Based on missions.pillar.v1.yml lines 296-310 (upsert by code)
   */
  async upsert(
    data: Partial<MissionDefinition>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // Build field lists for upsert
    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => {
      const value = data[k];
      // JSON fields need to be stringified for MySQL
      if ((k === 'criteria_json' || k === 'reward_json') && value !== null && value !== undefined) {
        return JSON.stringify(value);
      }
      return value;
    });

    // MySQL ON DUPLICATE KEY UPDATE pattern
    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'code') // Don't update the unique key
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO mission_definition (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * List all mission definitions
   */
  async findAll(queryRunner?: QueryRunner): Promise<MissionDefinition[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionDefinition, {
      order: { created_at: 'DESC' },
    });
  }
}
