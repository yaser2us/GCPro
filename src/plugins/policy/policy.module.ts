import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyPackage } from './entities/policy-package.entity';
import { PolicyBenefitEntitlement } from './entities/policy-benefit-entitlement.entity';
import { PolicyBenefitUsage } from './entities/policy-benefit-usage.entity';
import { PolicyBenefitUsageEvent } from './entities/policy-benefit-usage-event.entity';
import { PolicyBillingPlan } from './entities/policy-billing-plan.entity';
import { PolicyDepositRequirement } from './entities/policy-deposit-requirement.entity';
import { PolicyDiscountApplied } from './entities/policy-discount-applied.entity';
import { PolicyInstallment } from './entities/policy-installment.entity';
import { PolicyMember } from './entities/policy-member.entity';
import { PolicyPackageRate } from './entities/policy-package-rate.entity';
import { PolicyRemediationCase } from './entities/policy-remediation-case.entity';
import { PolicyStatusEvent } from './entities/policy-status-event.entity';
import { PolicyRepository } from './repositories/policy.repo';
import { PolicyPackageRepository } from './repositories/policy-package.repo';
import { PolicyBenefitEntitlementRepository } from './repositories/policy-benefit-entitlement.repo';
import { PolicyBenefitUsageRepository } from './repositories/policy-benefit-usage.repo';
import { PolicyBenefitUsageEventRepository } from './repositories/policy-benefit-usage-event.repo';
import { PolicyBillingPlanRepository } from './repositories/policy-billing-plan.repo';
import { PolicyDepositRequirementRepository } from './repositories/policy-deposit-requirement.repo';
import { PolicyDiscountAppliedRepository } from './repositories/policy-discount-applied.repo';
import { PolicyInstallmentRepository } from './repositories/policy-installment.repo';
import { PolicyMemberRepository } from './repositories/policy-member.repo';
import { PolicyPackageRateRepository } from './repositories/policy-package-rate.repo';
import { PolicyRemediationCaseRepository } from './repositories/policy-remediation-case.repo';
import { PolicyStatusEventRepository } from './repositories/policy-status-event.repo';
import { PolicyWorkflowService } from './services/policy.workflow.service';
import { PolicyPaymentSucceededHandler } from './handlers/policy-payment-succeeded.handler';
import { PolicyPaymentSucceededConsumer } from './consumers/policy-payment-succeeded.consumer';
import { ClaimSettledHandler } from './handlers/claim-settled.handler';
import { ClaimSettledConsumer } from './consumers/claim-settled.consumer';
import { PolicyController } from './controllers/policy.controller';
import { PolicyAdminController } from './controllers/policy-admin.controller';

/**
 * PolicyModule
 * Provides policy management capabilities
 * Based on specs/policy/policy.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Policy,
      PolicyPackage,
      PolicyBenefitEntitlement,
      PolicyBenefitUsage,
      PolicyBenefitUsageEvent,
      PolicyBillingPlan,
      PolicyDepositRequirement,
      PolicyDiscountApplied,
      PolicyInstallment,
      PolicyMember,
      PolicyPackageRate,
      PolicyRemediationCase,
      PolicyStatusEvent,
    ]),
  ],
  providers: [
    PolicyRepository,
    PolicyPackageRepository,
    PolicyBenefitEntitlementRepository,
    PolicyBenefitUsageRepository,
    PolicyBenefitUsageEventRepository,
    PolicyBillingPlanRepository,
    PolicyDepositRequirementRepository,
    PolicyDiscountAppliedRepository,
    PolicyInstallmentRepository,
    PolicyMemberRepository,
    PolicyPackageRateRepository,
    PolicyRemediationCaseRepository,
    PolicyStatusEventRepository,
    PolicyWorkflowService,
    PolicyPaymentSucceededHandler,
    PolicyPaymentSucceededConsumer,
    ClaimSettledHandler,
    ClaimSettledConsumer,
  ],
  controllers: [PolicyController, PolicyAdminController],
  exports: [PolicyWorkflowService],
})
export class PolicyModule {}
