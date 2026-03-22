import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async create(data: Partial<AuditLog>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AuditLog) : this.repository;
    const result = await repo.insert(data);
    return Number(result.identifiers[0].id);
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<AuditLog | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AuditLog) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByResource(resourceType: string, resourceId: string, queryRunner?: QueryRunner): Promise<AuditLog[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AuditLog) : this.repository;
    return repo.find({
      where: { resource_type: resourceType, resource_id: resourceId },
      order: { occurred_at: 'DESC' },
    });
  }

  async findByActor(actorType: string, actorId: string, queryRunner?: QueryRunner): Promise<AuditLog[]> {
    const repo = queryRunner ? queryRunner.manager.getRepository(AuditLog) : this.repository;
    return repo.find({
      where: { actor_type: actorType, actor_id: actorId },
      order: { occurred_at: 'DESC' },
    });
  }
}
