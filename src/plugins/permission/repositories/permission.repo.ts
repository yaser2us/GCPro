import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Permission } from '../entities/permission.entity';

/**
 * PermissionRepository
 * Handles database operations for permission table
 * Source: specs/permission/permission.pillar.v2.yml
 */
@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  /**
   * Find permission by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Permission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Permission, { where: { id } });
  }

  /**
   * Find permission by code
   */
  async findByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<Permission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Permission, { where: { code } });
  }

  /**
   * Create permission
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<Permission>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Permission, data);
    return result.identifiers[0].id;
  }

  /**
   * Update permission by ID
   */
  async update(
    id: number,
    data: Partial<Permission>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.update(Permission, { id }, data);
  }

  /**
   * Upsert permission by code (idempotent create)
   */
  async upsert(
    data: Partial<Permission>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => f !== 'code')
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO permission (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * List all permissions
   */
  async findAll(queryRunner?: QueryRunner): Promise<Permission[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(Permission, {
      order: { created_at: 'DESC' },
    });
  }
}
