import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { WalletAdvancedWorkflowService } from '../services/wallet-advanced.workflow.service';
import { WithdrawalRequestCreateDto } from '../dto/withdrawal-request-create.dto';
import { WithdrawalRejectDto } from '../dto/withdrawal-reject.dto';
import { PayoutAttemptRecordDto } from '../dto/payout-attempt-record.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * WithdrawalRequestController
 * Handles withdrawal request lifecycle: request, approve, reject, payout-attempts, complete, fail.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class WithdrawalRequestController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/withdrawal-requests */
  @Post('withdrawal-requests')
  @HttpCode(HttpStatus.CREATED)
  async requestWithdrawal(
    @Body() dto: WithdrawalRequestCreateDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.requestWithdrawal(dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/withdrawal-requests/:withdrawalRequestId/approve */
  @Post('withdrawal-requests/:withdrawalRequestId/approve')
  @HttpCode(HttpStatus.OK)
  async approveWithdrawal(
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.approveWithdrawal(Number(withdrawalRequestId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/withdrawal-requests/:withdrawalRequestId/reject */
  @Post('withdrawal-requests/:withdrawalRequestId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Body() dto: WithdrawalRejectDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.rejectWithdrawal(Number(withdrawalRequestId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/withdrawal-requests/:withdrawalRequestId/payout-attempts */
  @Post('withdrawal-requests/:withdrawalRequestId/payout-attempts')
  @HttpCode(HttpStatus.CREATED)
  async recordPayoutAttempt(
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Body() dto: PayoutAttemptRecordDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.recordPayoutAttempt(Number(withdrawalRequestId), dto, actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/withdrawal-requests/:withdrawalRequestId/complete */
  @Post('withdrawal-requests/:withdrawalRequestId/complete')
  @HttpCode(HttpStatus.OK)
  async completeWithdrawal(
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.completeWithdrawal(Number(withdrawalRequestId), actor, idempotencyKey);
  }

  /** POST /api/v1/wallet-advanced/withdrawal-requests/:withdrawalRequestId/fail */
  @Post('withdrawal-requests/:withdrawalRequestId/fail')
  @HttpCode(HttpStatus.OK)
  async failWithdrawal(
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.failWithdrawal(Number(withdrawalRequestId), actor, idempotencyKey);
  }
}
