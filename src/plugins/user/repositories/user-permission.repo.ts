import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { UserPermission } from '../entities/user-permission.entity';

/**
 * UserPermissionRepository
 * Handles database operations for user_permission table
 * Source: specs/user/user.pillar.v2.yml
 */
@Injectable()
export class UserPermissionRepository {
  constructor(
    @InjectRepository(UserPermission)
    private readonly repo: Repository<UserPermission>,
  ) {}

  /**
   * Find permission assignment
   */
  async findByUserIdAndPermissionId(
    userId: number,
    permissionId: number,
    queryRunner?: QueryRunner,
  ): Promise<UserPermission | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(UserPermission, {
      where: { user_id: userId, permission_id: permissionId },
    });
  }

  /**
   * Upsert user permission (idempotent via UNIQUE(user_id, permission_id))
   */
  async upsert(
    data: Partial<UserPermission>,
    queryRunner?: QueryRunner,
  ): Promise<number> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const fields = Object.keys(data).filter((k) => k !== 'id');
    const values = fields.map((k) => data[k]);

    const fieldList = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const updateList = fields
      .filter((f) => !['user_id', 'permission_id'].includes(f))
      .map((f) => `${f} = VALUES(${f})`)
      .join(', ');

    const query = `
      INSERT INTO user_permission (${fieldList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE
        ${updateList},
        id = LAST_INSERT_ID(id)
    `;

    const result = await manager.query(query, values);
    return result.insertId;
  }

  /**
   * Delete user permission assignment
   */
  async delete(
    userId: number,
    permissionId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(UserPermission, {
      user_id: userId,
      permission_id: permissionId,
    });
  }

  /**
   * Get permissions for user with JOIN
   */
  async getPermissionsForUser(
    userId: number,
    queryRunner?: QueryRunner,
  ): Promise<any[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      SELECT p.*, up.effect
      FROM permission p
      INNER JOIN user_permission up ON p.id = up.permission_id
      WHERE up.user_id = ?
      ORDER BY p.code ASC
    `;

    return manager.query(query, [userId]);
  }
}
