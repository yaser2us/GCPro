import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionProgram } from './entities/commission-program.entity';
import { CommissionParticipant } from './entities/commission-participant.entity';
import { CommissionRule } from './entities/commission-rule.entity';
import { CommissionAccrual } from './entities/commission-accrual.entity';
import { CommissionPayoutBatch } from './entities/commission-payout-batch.entity';
import { CommissionPayoutItem } from './entities/commission-payout-item.entity';
import { CommissionPayoutItemAccrual } from './entities/commission-payout-item-accrual.entity';
import { CommissionProgramRepository } from './repositories/commission-program.repo';
import { CommissionParticipantRepository } from './repositories/commission-participant.repo';
import { CommissionRuleRepository } from './repositories/commission-rule.repo';
import { CommissionAccrualRepository } from './repositories/commission-accrual.repo';
import { CommissionPayoutBatchRepository } from './repositories/commission-payout-batch.repo';
import { CommissionPayoutItemRepository } from './repositories/commission-payout-item.repo';
import { CommissionPayoutItemAccrualRepository } from './repositories/commission-payout-item-accrual.repo';
import { CommissionWorkflowService } from './services/commission.workflow.service';
import { CommissionController } from './controllers/commission.controller';
import { ReferralConversionHandler } from './handlers/referral-conversion.handler';
import { ReferralConversionConsumer } from './consumers/referral-conversion.consumer';

/**
 * CommissionModule
 * Provides commission management capabilities
 * Based on specs/commission/commission.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionProgram,
      CommissionParticipant,
      CommissionRule,
      CommissionAccrual,
      CommissionPayoutBatch,
      CommissionPayoutItem,
      CommissionPayoutItemAccrual,
    ]),
  ],
  providers: [
    CommissionProgramRepository,
    CommissionParticipantRepository,
    CommissionRuleRepository,
    CommissionAccrualRepository,
    CommissionPayoutBatchRepository,
    CommissionPayoutItemRepository,
    CommissionPayoutItemAccrualRepository,
    CommissionWorkflowService,
    // Phase 7A: REFERRAL_CONVERSION_CREATED → commission accruals
    ReferralConversionHandler,
    ReferralConversionConsumer,
  ],
  controllers: [CommissionController],
  exports: [CommissionWorkflowService],
})
export class CommissionModule {}
