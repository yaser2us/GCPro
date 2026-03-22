import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { WalletAdvancedWorkflowService } from '../services/wallet-advanced.workflow.service';
import { ThresholdEventRecordDto } from '../dto/threshold-event-record.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * ThresholdEventController
 * Handles threshold breach event recording.
 * Based on specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 */
@Controller('/api/v1/wallet-advanced')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('wallet-advanced:admin')
export class ThresholdEventController {
  constructor(private readonly workflowService: WalletAdvancedWorkflowService) {}

  /** POST /api/v1/wallet-advanced/threshold-events */
  @Post('threshold-events')
  @HttpCode(HttpStatus.CREATED)
  async recordThresholdBreach(
    @Body() dto: ThresholdEventRecordDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) throw new Error('Idempotency-Key header is required');
    return this.workflowService.recordThresholdBreach(dto, actor, idempotencyKey);
  }
}
