/**
 * Permission Plugin
 * Exports all public interfaces from the permission module
 *
 * Based on specs/permission/permission.pillar.v2.yml
 */

export { PermissionModule } from './permission.module';
export { PermissionWorkflowService } from './services/permission.workflow.service';

// Entities
export { Permission } from './entities/permission.entity';
export { Role } from './entities/role.entity';
export { RolePermission } from './entities/role-permission.entity';

// DTOs
export { PermissionCreateRequestDto } from './dto/permission-create.request.dto';
export { PermissionUpdateRequestDto } from './dto/permission-update.request.dto';
export { RoleCreateRequestDto } from './dto/role-create.request.dto';
export { RoleAssignPermissionRequestDto } from './dto/role-assign-permission.request.dto';
