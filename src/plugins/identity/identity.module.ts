import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entity classes imported from user plugin (canonical owners of these table definitions).
// Identity pillar owns these tables per specs/identity/identity.pillar.v2.yml but
// entity *files* live in user plugin to avoid duplicate @Entity() registration conflicts.
import { User } from '../user/entities/user.entity';
import { DeviceToken } from '../user/entities/device-token.entity';
import { RegistrationToken } from '../user/entities/registration-token.entity';
import { VerificationStatus } from '../user/entities/verification-status.entity';
import { OnboardingProgress } from '../user/entities/onboarding-progress.entity';

// Repositories
import { UserReadRepository } from './repositories/user-read.repo';
import { DeviceTokenRepository } from './repositories/device-token.repo';
import { RegistrationTokenRepository } from './repositories/registration-token.repo';
import { VerificationStatusRepository } from './repositories/verification-status.repo';
import { OnboardingProgressRepository } from './repositories/onboarding-progress.repo';

// Service
import { IdentityWorkflowService } from './services/identity.workflow.service';

// Controllers
import { IdentityAuthController } from './controllers/identity-auth.controller';
import { IdentityDeviceTokenController } from './controllers/identity-device-token.controller';
import { IdentityRegistrationTokenController } from './controllers/identity-registration-token.controller';
import { IdentityVerificationStatusController } from './controllers/identity-verification-status.controller';
import { IdentityOnboardingProgressController } from './controllers/identity-onboarding-progress.controller';

// Consumers & Handlers
import { KycVerifiedConsumer } from './consumers/kyc-verified.consumer';
import { GuidelineAcceptedConsumer } from './consumers/guideline-accepted.consumer';
import { KycVerifiedHandler } from './handlers/kyc-verified.handler';
import { GuidelineAcceptedHandler } from './handlers/guideline-accepted.handler';

/**
 * IdentityModule
 * Owns: device_token, registration_token, verification_status, onboarding_progress
 * Source: specs/identity/identity.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      DeviceToken,
      RegistrationToken,
      VerificationStatus,
      OnboardingProgress,
    ]),
  ],
  controllers: [
    IdentityAuthController,
    IdentityDeviceTokenController,
    IdentityRegistrationTokenController,
    IdentityVerificationStatusController,
    IdentityOnboardingProgressController,
  ],
  providers: [
    // Repositories
    UserReadRepository,
    DeviceTokenRepository,
    RegistrationTokenRepository,
    VerificationStatusRepository,
    OnboardingProgressRepository,
    // Service
    IdentityWorkflowService,
    // Consumers
    KycVerifiedConsumer,
    GuidelineAcceptedConsumer,
    // Handlers
    KycVerifiedHandler,
    GuidelineAcceptedHandler,
  ],
  exports: [IdentityWorkflowService],
})
export class IdentityModule {}
