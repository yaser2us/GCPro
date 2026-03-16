import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Role } from '../entities/role.entity';

/**
 * RoleRepository
 * Handles database operations for role table
 * Source: specs/permission/permission.pillar.v2.yml
 */
@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  /**
   * Find role by ID
   */
  async findById(
    id: number,
    queryRunner?: QueryRunner,
  ): Promise<Role | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Role, { where: { id } });
  }

  /**
   * Find role by code
   */
  async findByCode(
    code: string,
    queryRunner?: QueryRunner,
  ): Promise<Role | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(Role, { where: { code } });
  }

  /**
   * Create role
   * Returns the inserted ID (auto-increment)
   */
  async create(
    data: Partial<Role>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    const result = await manager.insert(Role, data);
    return result.identifiers[0].id;
  }

  /**
   * Upsert role by code (idempotent create)
   */
  async upsert(
    data: Partial<Role>,
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
      INSERT INTO role (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * List all roles
   */
  async findAll(queryRunner?: QueryRunner): Promise<Role[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(Role, {
      order: { created_at: 'DESC' },
    });
  }
}
