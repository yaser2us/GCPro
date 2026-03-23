import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../corekit/services/event-bus.service';
import { PolicyWorkflowService } from '../services/policy.workflow.service';

/**
 * GraceExpiryDueConsumer — H4 / Phase 5
 *
 * Subscribes to GRACE_EXPIRY_DUE events emitted by the notification schedule dispatcher.
 * Calls expireRemediationCase to freeze the policy and close the remediation case.
 * Fire-and-forget: errors logged but do not re-throw.
 */
@Injectable()
export class GraceExpiryDueConsumer implements OnModuleInit {
  private readonly logger = new Logger(GraceExpiryDueConsumer.name);

  constructor(
    private readonly workflowService: PolicyWorkflowService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('GRACE_EXPIRY_DUE', this.onGraceExpiryDue.bind(this));
    this.logger.log('H4: Registered for GRACE_EXPIRY_DUE events');
  }

  async onGraceExpiryDue(event: {
    remediation_case_id: number;
    policy_id?: number;
    schedule_id?: number;
    [key: string]: any;
  }): Promise<void> {
    const caseId = Number(event.remediation_case_id);
    this.logger.log(`H4: GRACE_EXPIRY_DUE — case_id=${caseId}`);
    try {
      const idempotencyKey = `grace_expiry_${caseId}`;
      const actor = {
        actor_user_id: '0',
        actor_role: 'system',
        correlation_id: idempotencyKey,
        causation_id: `grace_expiry_due_${caseId}`,
      } as any;
      await this.workflowService.expireRemediationCase(caseId, actor, idempotencyKey);
    } catch (error) {
      this.logger.error(
        `H4: expireRemediationCase failed for case_id=${caseId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
