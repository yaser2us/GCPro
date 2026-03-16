import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionProgress } from '../entities/mission-progress.entity';

@Injectable()
export class MissionProgressRepository {
  constructor(
    @InjectRepository(MissionProgress)
    private readonly repo: Repository<MissionProgress>,
  ) {}

  /**
   * Upsert mission progress (idempotent by assignment_id + metric_code)
   */
  async upsert(
    data: Partial<MissionProgress>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    // MySQL ON DUPLICATE KEY UPDATE pattern
    const query = `
      INSERT INTO mission_progress
        (assignment_id, metric_code, current_value, target_value, status, meta_json, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        current_value = VALUES(current_value),
        target_value = VALUES(target_value),
        status = VALUES(status),
        meta_json = VALUES(meta_json),
        updated_at = NOW(),
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, [
      data.assignment_id,
      data.metric_code,
      data.current_value || 0,
      data.target_value || 1,
      data.status || 'tracking',
      data.meta_json ? JSON.stringify(data.meta_json) : null,
    ]);

    return result.insertId;
  }

  /**
   * List progress entries by assignment ID
   */
  async findByAssignmentId(
    assignment_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionProgress[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionProgress, {
      where: { assignment_id },
      order: { updated_at: 'DESC' },
    });
  }

  /**
   * Get specific progress metric
   */
  async findByMetric(
    assignment_id: number,
    metric_code: string,
    queryRunner?: QueryRunner,
  ): Promise<MissionProgress | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(MissionProgress, {
      where: { assignment_id, metric_code },
    });
  }
}
