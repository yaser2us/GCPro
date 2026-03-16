import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRepository } from './repositories/user.repo';
import { UserCredentialRepository } from './repositories/user-credential.repo';
import { UserPermissionRepository } from './repositories/user-permission.repo';
import { UserRoleRepository } from './repositories/user-role.repo';
import { UserWorkflowService } from './services/user.workflow.service';
import { UserController } from './controllers/user.controller';

/**
 * User Module
 * Encapsulates all user-related functionality
 *
 * Based on specs/user/user.pillar.v2.yml
 */
@Module({
  imports: [
    // Register User entities with TypeORM
    TypeOrmModule.forFeature([User, UserCredential, UserPermission, UserRole]),
  ],
  controllers: [
    // HTTP controllers
    UserController,
  ],
  providers: [
    // Repositories (data access)
    UserRepository,
    UserCredentialRepository,
    UserPermissionRepository,
    UserRoleRepository,
    // Services (business logic)
    UserWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    UserWorkflowService,
  ],
})
export class UserModule {}
