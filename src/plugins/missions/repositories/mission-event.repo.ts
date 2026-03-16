import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { MissionEvent } from '../entities/mission-event.entity';

@Injectable()
export class MissionEventRepository {
  constructor(
    @InjectRepository(MissionEvent)
    private readonly repo: Repository<MissionEvent>,
  ) {}

  /**
   * Create mission event (audit trail)
   */
  async create(
    data: Partial<MissionEvent>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(MissionEvent, data);
    return result.identifiers[0].id;
  }

  /**
   * List events by assignment ID
   */
  async findByAssignmentId(
    assignment_id: number,
    queryRunner?: QueryRunner,
  ): Promise<MissionEvent[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionEvent, {
      where: { assignment_id },
      order: { occurred_at: 'DESC' },
    });
  }

  /**
   * List events by reference
   */
  async findByReference(
    ref_type: string,
    ref_id: string,
    queryRunner?: QueryRunner,
  ): Promise<MissionEvent[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(MissionEvent, {
      where: { ref_type, ref_id },
      order: { occurred_at: 'DESC' },
    });
  }
}
