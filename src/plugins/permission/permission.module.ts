import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionRepository } from './repositories/permission.repo';
import { RoleRepository } from './repositories/role.repo';
import { RolePermissionRepository } from './repositories/role-permission.repo';
import { PermissionWorkflowService } from './services/permission.workflow.service';
import { PermissionController } from './controllers/permission.controller';

/**
 * Permission Module
 * Encapsulates all permission and role-related functionality
 *
 * Based on specs/permission/permission.pillar.v2.yml
 */
@Module({
  imports: [
    // Register Permission entities with TypeORM
    TypeOrmModule.forFeature([Permission, Role, RolePermission]),
  ],
  controllers: [
    // HTTP controllers
    PermissionController,
  ],
  providers: [
    // Repositories (data access)
    PermissionRepository,
    RoleRepository,
    RolePermissionRepository,
    // Services (business logic)
    PermissionWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    PermissionWorkflowService,
  ],
})
export class PermissionModule {}
