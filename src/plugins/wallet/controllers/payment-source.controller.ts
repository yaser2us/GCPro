import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentPriorityService } from '../services/payment-priority.service';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';

/**
 * PaymentSourceController — L10
 *
 * Exposes the payment priority resolver as a query endpoint.
 * Used by the client/UI to determine how to present the payment split before checkout.
 *
 * GET /api/v1/wallet/payment-source?account_id=&amount=&currency=
 */
@Controller('/api/v1/wallet')
@UseGuards(AuthGuard, PermissionsGuard)
export class PaymentSourceController {
  constructor(private readonly paymentPriorityService: PaymentPriorityService) {}

  @Get('payment-source')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:read')
  async getPaymentSource(
    @Query('account_id') accountId: string,
    @Query('amount') amount: string,
    @Query('currency') currency: string = 'MYR',
  ) {
    if (!accountId || !amount) {
      throw new Error('account_id and amount query parameters are required');
    }
    return this.paymentPriorityService.resolve(
      Number(accountId),
      parseFloat(amount),
      currency,
    );
  }
}
