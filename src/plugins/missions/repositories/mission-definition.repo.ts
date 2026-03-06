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
}
