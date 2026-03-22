import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralProgram } from './entities/referral-program.entity';
import { ReferralCode } from './entities/referral-code.entity';
import { ReferralInvite } from './entities/referral-invite.entity';
import { ReferralRule } from './entities/referral-rule.entity';
import { ReferralConversion } from './entities/referral-conversion.entity';
import { ReferralEvent } from './entities/referral-event.entity';
import { ReferralRewardGrant } from './entities/referral-reward-grant.entity';
import { ReferralChain } from './entities/referral-chain.entity';
import { ReferralProgramRepository } from './repositories/referral-program.repo';
import { ReferralCodeRepository } from './repositories/referral-code.repo';
import { ReferralInviteRepository } from './repositories/referral-invite.repo';
import { ReferralConversionRepository } from './repositories/referral-conversion.repo';
import { ReferralRewardGrantRepository } from './repositories/referral-reward-grant.repo';
import { ReferralEventRepository } from './repositories/referral-event.repo';
import { ReferralRuleRepository } from './repositories/referral-rule.repo';
import { ReferralWorkflowService } from './services/referral.workflow.service';
import { ReferralController } from './controllers/referral.controller';

/**
 * Referral Module
 * Encapsulates all referral-related functionality
 *
 * Based on specs/referral/referral.pillar.yml
 */
@Module({
  imports: [
    // Register Referral entities with TypeORM
    TypeOrmModule.forFeature([
      ReferralProgram,
      ReferralCode,
      ReferralInvite,
      ReferralRule,
      ReferralConversion,
      ReferralEvent,
      ReferralRewardGrant,
      ReferralChain,
    ]),
  ],
  controllers: [
    // HTTP controllers
    ReferralController,
  ],
  providers: [
    // Repositories (data access)
    ReferralProgramRepository,
    ReferralCodeRepository,
    ReferralInviteRepository,
    ReferralConversionRepository,
    ReferralRewardGrantRepository,
    ReferralEventRepository,
    ReferralRuleRepository,
    // Services (business logic)
    ReferralWorkflowService,
  ],
  exports: [
    // Export services in case other modules need them
    ReferralWorkflowService,
  ],
})
export class ReferralModule {}
