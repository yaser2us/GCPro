import {
  Controller,
  Post,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AutoTopupHandler } from '../handlers/auto-topup.handler';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * AutoTopupController — C4
 *
 * Manual trigger endpoint for auto top-up (admin/system use).
 * The same logic runs automatically on WALLET_THRESHOLD_BREACHED events.
 *
 * POST /api/v1/wallet/:walletId/auto-topup
 */
@Controller('/api/v1/wallet')
@UseGuards(AuthGuard, PermissionsGuard)
export class AutoTopupController {
  constructor(private readonly handler: AutoTopupHandler) {}

  /**
   * TRIGGER AUTO TOP-UP
   * POST /api/v1/wallet/:walletId/auto-topup
   *
   * Manually triggers the auto top-up flow for a deposit wallet.
   * Useful for admin overrides or scheduled annual-fee top-ups.
   */
  @Post(':walletId/auto-topup')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:topup:trigger')
  async triggerAutoTopup(
    @Param('walletId') walletId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() _actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    await this.handler.handle({
      wallet_id: Number(walletId),
      threshold_code: 'deposit_urgent',
      available_amount: 0,
    });

    return { wallet_id: Number(walletId), triggered: true };
  }
}
