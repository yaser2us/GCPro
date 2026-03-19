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
import { ReferralChainRepository } from './repositories/referral-chain.repo';
import { ReferralWorkflowService } from './services/referral.workflow.service';
import { ReferralChainService } from './services/referral-chain.service';
import { ReferralController } from './controllers/referral.controller';
import { ReferralV2Controller } from './controllers/referral.v2.controller';
import { ReferralChainConsumer } from './consumers/referral-chain.consumer';

/**
 * Referral Module V2
 * Multi-Level Referral Support
 *
 * Key Differences from V1 (ReferralModule):
 * - Includes ReferralChainService for multi-level tracking
 * - Includes ReferralChainRepository for chain queries
 * - Includes ReferralChainConsumer to build chains on conversion
 * - Provides /v2/referral/* endpoints with network stats
 *
 * When to use:
 * - V1 (ReferralModule): Single-level referrals only (User A → User B)
 * - V2 (ReferralV2Module): Multi-level referrals (User A → User B → User C → User D)
 *
 * How it works:
 * 1. User makes conversion via /v2/referral/conversions
 * 2. ReferralWorkflowService creates conversion (same as V1)
 * 3. ReferralWorkflowService emits REFERRAL_CONVERSION_CREATED event
 * 4. ReferralChainConsumer listens and builds multi-level chain
 * 5. Commission pillar can query chain to pay multi-level commissions
 *
 * Migration from V1 to V2:
 * - Replace ReferralModule with ReferralV2Module in app.module.ts
 * - Update API calls from /v1/referral/* to /v2/referral/*
 * - Existing V1 conversions won't have chains (only new ones)
 * - Can backfill chains by replaying REFERRAL_CONVERSION_CREATED events
 */
@Module({
  imports: [
    // Note: CoreKitModule is @Global(), so TransactionService and EventBusService
    // are automatically available without importing

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
    // V1 HTTP controller (for backward compatibility)
    ReferralController,

    // V2 HTTP controller (multi-level features)
    ReferralV2Controller,
  ],
  providers: [
    // Repositories (data access)
    ReferralProgramRepository,
    ReferralCodeRepository,
    ReferralInviteRepository,
    ReferralConversionRepository,
    ReferralRewardGrantRepository,
    ReferralEventRepository,
    ReferralChainRepository, // V2 only

    // Services (business logic)
    ReferralWorkflowService,
    ReferralChainService, // V2 only

    // Event Consumers (chain building)
    ReferralChainConsumer, // V2 only
  ],
  exports: [
    // Export services in case other modules need them
    ReferralWorkflowService,
    ReferralChainService,
  ],
})
export class ReferralV2Module {}
