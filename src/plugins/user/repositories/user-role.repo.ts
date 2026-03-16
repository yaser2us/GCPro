import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';

/**
 * UserRoleRepository
 * Handles database operations for user_role table
 * Source: specs/user/user.pillar.v2.yml
 */
@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectRepository(UserRole)
    private readonly repo: Repository<UserRole>,
  ) {}

  /**
   * Find role assignment
   */
  async findByUserIdAndRoleId(
    userId: number,
    roleId: number,
    queryRunner?: QueryRunner,
  ): Promise<UserRole | null> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    return manager.findOne(UserRole, {
      where: { user_id: userId, role_id: roleId },
    });
  }

  /**
   * Assign role to user (idempotent via PRIMARY KEY)
   */
  async assign(
    userId: number,
    roleId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      INSERT IGNORE INTO user_role (user_id, role_id)
      VALUES (?, ?)
    `;

    await manager.query(query, [userId, roleId]);
  }

  /**
   * Revoke role from user
   */
  async revoke(
    userId: number,
    roleId: number,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;
    await manager.delete(UserRole, {
      user_id: userId,
      role_id: roleId,
    });
  }

  /**
   * Get roles for user with JOIN
   */
  async getRolesForUser(
    userId: number,
    queryRunner?: QueryRunner,
  ): Promise<any[]> {
    const manager = queryRunner ? queryRunner.manager : this.repo.manager;

    const query = `
      SELECT r.*
      FROM role r
      INNER JOIN user_role ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
      ORDER BY r.code ASC
    `;

    return manager.query(query, [userId]);
  }
}
