import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrowdPeriod } from './entities/crowd-period.entity';
import { CrowdPackageBucket } from './entities/crowd-package-bucket.entity';
import { CrowdPeriodMember } from './entities/crowd-period-member.entity';
import { CrowdPeriodClaim } from './entities/crowd-period-claim.entity';
import { CrowdMemberCharge } from './entities/crowd-member-charge.entity';
import { CrowdClaimPayout } from './entities/crowd-claim-payout.entity';
import { CrowdPeriodEvent } from './entities/crowd-period-event.entity';
import { CrowdPeriodRun } from './entities/crowd-period-run.entity';
import { CrowdPeriodRunLock } from './entities/crowd-period-run-lock.entity';
import { CrowdPeriodRepository } from './repositories/crowd-period.repo';
import { CrowdPackageBucketRepository } from './repositories/crowd-package-bucket.repo';
import { CrowdPeriodMemberRepository } from './repositories/crowd-period-member.repo';
import { CrowdPeriodClaimRepository } from './repositories/crowd-period-claim.repo';
import { CrowdMemberChargeRepository } from './repositories/crowd-member-charge.repo';
import { CrowdClaimPayoutRepository } from './repositories/crowd-claim-payout.repo';
import { CrowdPeriodEventRepository } from './repositories/crowd-period-event.repo';
import { CrowdPeriodRunRepository } from './repositories/crowd-period-run.repo';
import { CrowdPeriodRunLockRepository } from './repositories/crowd-period-run-lock.repo';
import { CrowdWorkflowService } from './services/crowd.workflow.service';
import { CrowdPeriodController } from './controllers/crowd-period.controller';
import { MemberChargeController } from './controllers/member-charge.controller';
import { ClaimPayoutController } from './controllers/claim-payout.controller';

/**
 * CrowdModule
 * Provides Takaful crowd sharing capabilities including period management,
 * member and claim inclusion, calculation, charging, and payouts.
 * Based on specs/crowd/crowd.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrowdPeriod,
      CrowdPackageBucket,
      CrowdPeriodMember,
      CrowdPeriodClaim,
      CrowdMemberCharge,
      CrowdClaimPayout,
      CrowdPeriodEvent,
      CrowdPeriodRun,
      CrowdPeriodRunLock,
    ]),
  ],
  providers: [
    CrowdPeriodRepository,
    CrowdPackageBucketRepository,
    CrowdPeriodMemberRepository,
    CrowdPeriodClaimRepository,
    CrowdMemberChargeRepository,
    CrowdClaimPayoutRepository,
    CrowdPeriodEventRepository,
    CrowdPeriodRunRepository,
    CrowdPeriodRunLockRepository,
    CrowdWorkflowService,
  ],
  controllers: [
    CrowdPeriodController,
    MemberChargeController,
    ClaimPayoutController,
  ],
  exports: [CrowdWorkflowService],
})
export class CrowdModule {}
