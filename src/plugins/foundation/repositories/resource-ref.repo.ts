import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ResourceRef } from '../entities/resource-ref.entity';

@Injectable()
export class ResourceRefRepository {
  constructor(
    @InjectRepository(ResourceRef)
    private readonly repository: Repository<ResourceRef>,
  ) {}

  async upsert(data: Partial<ResourceRef>, queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ResourceRef) : this.repository;
    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(ResourceRef)
      .values(data)
      .orUpdate(['resource_uuid', 'status'], ['resource_type', 'resource_id'])
      .execute();
    if (result.identifiers[0]?.id) {
      return Number(result.identifiers[0].id);
    }
    const existing = await repo.findOne({ where: { resource_type: data.resource_type as string, resource_id: data.resource_id as number } });
    return existing!.id;
  }

  async findById(id: number, queryRunner?: QueryRunner): Promise<ResourceRef | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ResourceRef) : this.repository;
    return repo.findOne({ where: { id } });
  }

  async findByTypeAndId(resourceType: string, resourceId: number, queryRunner?: QueryRunner): Promise<ResourceRef | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ResourceRef) : this.repository;
    return repo.findOne({ where: { resource_type: resourceType, resource_id: resourceId } });
  }

  async findByUuid(uuid: string, queryRunner?: QueryRunner): Promise<ResourceRef | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(ResourceRef) : this.repository;
    return repo.findOne({ where: { resource_uuid: uuid } });
  }
}
