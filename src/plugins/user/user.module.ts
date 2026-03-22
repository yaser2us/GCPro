import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserCredential } from './entities/user-credential.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { DeviceToken } from './entities/device-token.entity';
import { RegistrationToken } from './entities/registration-token.entity';
import { VerificationStatus } from './entities/verification-status.entity';
import { OnboardingProgress } from './entities/onboarding-progress.entity';
import { UserRepository } from './repositories/user.repo';
import { UserCredentialRepository } from './repositories/user-credential.repo';
import { UserPermissionRepository } from './repositories/user-permission.repo';
import { UserRoleRepository } from './repositories/user-role.repo';
import { DeviceTokenRepository } from './repositories/device-token.repo';
import { RegistrationTokenRepository } from './repositories/registration-token.repo';
import { VerificationStatusRepository } from './repositories/verification-status.repo';
import { OnboardingProgressRepository } from './repositories/onboarding-progress.repo';
import { UserWorkflowService } from './services/user.workflow.service';
import { UserIdentityWorkflowService } from './services/user-identity.workflow.service';
import { UserController } from './controllers/user.controller';
import { DeviceTokenController } from './controllers/device-token.controller';
import { RegistrationTokenController } from './controllers/registration-token.controller';
import { VerificationStatusController } from './controllers/verification-status.controller';
import { OnboardingProgressController } from './controllers/onboarding-progress.controller';
import { KycVerifiedConsumer } from './consumers/kyc-verified.consumer';
import { GuidelineAcceptedConsumer } from './consumers/guideline-accepted.consumer';
import { KycVerifiedHandler } from './handlers/kyc-verified.handler';
import { GuidelineAcceptedHandler } from './handlers/guideline-accepted.handler';

/**
 * User Module
 * Encapsulates all user-related functionality
 *
 * Based on specs/user/user.pillar.v2.yml
 */
@Module({
  imports: [
    // Register User entities with TypeORM
    TypeOrmModule.forFeature([
      User, UserCredential, UserPermission, UserRole,
      DeviceToken, RegistrationToken, VerificationStatus, OnboardingProgress,
    ]),
  ],
  controllers: [
    // HTTP controllers
    UserController,
    DeviceTokenController,
    RegistrationTokenController,
    VerificationStatusController,
    OnboardingProgressController,
  ],
  providers: [
    // Repositories (data access)
    UserRepository,
    UserCredentialRepository,
    UserPermissionRepository,
    UserRoleRepository,
    DeviceTokenRepository,
    RegistrationTokenRepository,
    VerificationStatusRepository,
    OnboardingProgressRepository,
    // Services (business logic)
    UserWorkflowService,
    UserIdentityWorkflowService,
    // Consumers (event listeners)
    KycVerifiedConsumer,
    GuidelineAcceptedConsumer,
    // Handlers (event processors)
    KycVerifiedHandler,
    GuidelineAcceptedHandler,
  ],
  exports: [
    // Export services in case other modules need them
    UserWorkflowService,
    UserIdentityWorkflowService,
  ],
})
export class UserModule {}
