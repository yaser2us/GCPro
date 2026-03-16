import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';

/**
 * RolePermissionRepository
 * Handles database operations for role_permission table
 * Source: specs/permission/permission.pillar.v2.yml
 */
@Injectable()
export class RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermission)
    private readonly repo: Repository<RolePermission>,
  ) {}

  /**
   * Find role-permission assignment
   */
  async findByRoleAndPermission(
    roleId: number,
    permissionId: number,
    queryRunner?: QueryRunner,
  ): Promise<RolePermission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(RolePermission, {
      where: { role_id: roleId, permission_id: permissionId },
    });
  }

  /**
   * Find all permissions for a role
   */
  async findByRoleId(
    roleId: number,
    queryRunner?: QueryRunner,
  ): Promise<RolePermission[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.find(RolePermission, {
      where: { role_id: roleId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Upsert role-permission assignment (idempotent)
   */
  async upsert(
    data: Partial<RolePermission>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');

    const query = `
      INSERT INTO role_permission (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * Delete role-permission assignment
   */
  async delete(
    roleId: number,
    permissionId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(RolePermission, {
      role_id: roleId,
      permission_id: permissionId,
    });
  }

  /**
   * Get permissions for role with JOIN
   */
  async getPermissionsForRole(
    roleId: number,
    queryRunner?: QueryRunner,
  ): Promise<any[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      SELECT p.*
      FROM permission p
      INNER JOIN role_permission rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.code ASC
    `;

    return manager.query(query, [roleId]);
  }
}
