import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { RegistrationToken } from './entities/registration-token.entity';
import { VerificationStatus } from './entities/verification-status.entity';
import { OnboardingProgress } from './entities/onboarding-progress.entity';
import { DeviceTokenRepository } from './repositories/device-token.repo';
import { RegistrationTokenRepository } from './repositories/registration-token.repo';
import { VerificationStatusRepository } from './repositories/verification-status.repo';
import { OnboardingProgressRepository } from './repositories/onboarding-progress.repo';
import { UserIdentityWorkflowService } from './services/user-identity.workflow.service';
import { DeviceTokenController } from './controllers/device-token.controller';
import { RegistrationTokenController } from './controllers/registration-token.controller';
import { VerificationStatusController } from './controllers/verification-status.controller';
import { OnboardingProgressController } from './controllers/onboarding-progress.controller';

/**
 * UserIdentityModule
 * Provides device tokens, registration tokens, verification status,
 * and onboarding progress tracking.
 * Based on specs/user-identity/user-identity.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      RegistrationToken,
      VerificationStatus,
      OnboardingProgress,
    ]),
  ],
  providers: [
    DeviceTokenRepository,
    RegistrationTokenRepository,
    VerificationStatusRepository,
    OnboardingProgressRepository,
    UserIdentityWorkflowService,
  ],
  controllers: [
    DeviceTokenController,
    RegistrationTokenController,
    VerificationStatusController,
    OnboardingProgressController,
  ],
  exports: [UserIdentityWorkflowService],
})
export class UserIdentityModule {}
