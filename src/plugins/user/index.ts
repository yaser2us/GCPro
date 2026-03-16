/**
 * User Plugin
 * Exports all public interfaces from the user module
 *
 * Based on specs/user/user.pillar.v2.yml
 */

export { UserModule } from './user.module';
export { UserWorkflowService } from './services/user.workflow.service';

// Entities
export { User } from './entities/user.entity';
export { UserCredential } from './entities/user-credential.entity';
export { UserPermission } from './entities/user-permission.entity';
export { UserRole } from './entities/user-role.entity';

// DTOs
export { UserCreateRequestDto } from './dto/user-create.request.dto';
export { UserUpdateProfileRequestDto } from './dto/user-update-profile.request.dto';
export { UserVerifyEmailRequestDto } from './dto/user-verify-email.request.dto';
export { UserCredentialCreateRequestDto } from './dto/user-credential-create.request.dto';
export { UserCredentialVerifyRequestDto } from './dto/user-credential-verify.request.dto';
export { UserRoleAssignRequestDto } from './dto/user-role-assign.request.dto';
export { UserPermissionGrantRequestDto } from './dto/user-permission-grant.request.dto';
