import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { PolicyMemberAddedHandler } from '../handlers/policy-member-added.handler';

/**
 * PolicyMemberAddedConsumer
 * H3 — Affiliate Code Inheritance
 *
 * Subscribes to POLICY_MEMBER_ADDED events and triggers affiliate chain
 * inheritance for dependents/beneficiaries.
 */
@Injectable()
export class PolicyMemberAddedConsumer implements OnModuleInit {
  private readonly logger = new Logger(PolicyMemberAddedConsumer.name);

  constructor(
    private readonly handler: PolicyMemberAddedHandler,
    private readonly eventBus: EventBusService,
    private readonly txService: TransactionService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe(
      'POLICY_MEMBER_ADDED',
      this.handlePolicyMemberAdded.bind(this),
    );
    this.logger.log('✅ H3 Affiliate Chain Inheritance — Registered for POLICY_MEMBER_ADDED');
  }

  async handlePolicyMemberAdded(event: {
    policy_member_id: number;
    policy_id: number | string;
    person_id: number | string;
    role: string;
  }): Promise<void> {
    this.logger.log(
      `[H3] POLICY_MEMBER_ADDED: policy_id=${event.policy_id}, person_id=${event.person_id}, role=${event.role}`,
    );

    try {
      await this.txService.run(async (queryRunner) => {
        await this.handler.handle(event, queryRunner);
      });
    } catch (error) {
      this.logger.error(
        `[H3] Failed to inherit affiliate chain for policy_member_id=${event.policy_member_id}: ${error.message}`,
        error.stack,
      );
      // Don't throw — chain inheritance failure must not break the member add flow
    }
  }
}
