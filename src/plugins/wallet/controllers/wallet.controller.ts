import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { WalletWorkflowService } from '../services/wallet.workflow.service';
import { AccountCreateRequestDto } from '../dto/account-create.request.dto';
import { WalletCreateRequestDto } from '../dto/wallet-create.request.dto';
import { DepositRequestDto } from '../dto/deposit.request.dto';
import { WithdrawRequestDto } from '../dto/withdraw.request.dto';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';
import { CurrentActor } from '../../../corekit/decorators/current-actor.decorator';
import type { Actor } from '../../../corekit/types/actor.type';

/**
 * Wallet Controller
 * Handles HTTP endpoints for wallet operations
 *
 * Based on specs/wallet/wallet.pillar.v2.yml commands section
 */
@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class WalletController {
  constructor(private readonly workflowService: WalletWorkflowService) {}

  /**
   * CREATE ACCOUNT ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 668-703
   * HTTP: POST /v1/accounts
   * Permissions: wallet:admin
   *
   * Example request:
   * POST /v1/accounts
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: create-account-xyz
   * Body:
   * {
   *   "type": "user"
   * }
   *
   * Example response:
   * {
   *   "account_id": 123
   * }
   */
  @Post('/v1/accounts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('wallet:admin')
  async createAccount(
    @Body() request: AccountCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createAccount(request, actor, idempotencyKey);
  }

  /**
   * CREATE WALLET ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 704-755
   * HTTP: POST /v1/wallets
   * Permissions: wallet:admin OR wallet:manage
   *
   * Example request:
   * POST /v1/wallets
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: create-wallet-xyz
   * Body:
   * {
   *   "account_id": "123",
   *   "wallet_type": "MAIN",
   *   "currency": "COIN"
   * }
   *
   * Example response:
   * {
   *   "wallet_id": 456
   * }
   */
  @Post('/v1/wallets')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('wallet:admin', 'wallet:manage')
  async createWallet(
    @Body() request: WalletCreateRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.createWallet(request, actor, idempotencyKey);
  }

  /**
   * DEPOSIT ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 756-839
   * HTTP: POST /v1/wallets/{wallet_id}/deposit
   * Permissions: wallet:admin OR wallet:manage
   *
   * Example request:
   * POST /v1/wallets/456/deposit
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: deposit-xyz
   * Body:
   * {
   *   "wallet_id": "456",
   *   "amount": 100,
   *   "currency": "COIN",
   *   "type": "manual_deposit",
   *   "ref_type": "admin_adjustment",
   *   "ref_id": "adj-789"
   * }
   *
   * Example response:
   * {
   *   "ledger_txn_id": 1011,
   *   "new_balance": "100.00"
   * }
   */
  @Post('/v1/wallets/:wallet_id/deposit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:admin', 'wallet:manage')
  async deposit(
    @Param('wallet_id') wallet_id: string,
    @Body() request: DepositRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.deposit(
      Number(wallet_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * WITHDRAW ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 840-922
   * HTTP: POST /v1/wallets/{wallet_id}/withdraw
   * Permissions: wallet:admin OR wallet:manage
   *
   * Example request:
   * POST /v1/wallets/456/withdraw
   * Headers:
   *   X-User-Id: admin-123
   *   X-User-Role: ADMIN
   *   Idempotency-Key: withdraw-xyz
   * Body:
   * {
   *   "wallet_id": "456",
   *   "amount": 50,
   *   "currency": "COIN",
   *   "type": "manual_withdrawal"
   * }
   *
   * Example response:
   * {
   *   "ledger_txn_id": 1012,
   *   "new_balance": "50.00"
   * }
   */
  @Post('/v1/wallets/:wallet_id/withdraw')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:admin', 'wallet:manage')
  async withdraw(
    @Param('wallet_id') wallet_id: string,
    @Body() request: WithdrawRequestDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @CurrentActor() actor: Actor,
  ) {
    if (!idempotencyKey) {
      throw new Error('Idempotency-Key header is required');
    }

    return this.workflowService.withdraw(
      Number(wallet_id),
      request,
      actor,
      idempotencyKey,
    );
  }

  /**
   * GET BALANCE ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 923-950
   * HTTP: GET /v1/wallets/{wallet_id}/balance
   * Permissions: wallet:read
   *
   * Example request:
   * GET /v1/wallets/456/balance
   * Headers:
   *   X-User-Id: user-123
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "wallet_id": 456,
   *   "available_amount": "50.00",
   *   "held_amount": "0.00",
   *   "total_amount": "50.00",
   *   "currency": "COIN",
   *   "as_of": "2024-01-15T10:30:00.000Z"
   * }
   */
  @Get('/v1/wallets/:wallet_id/balance')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:read')
  async getBalance(@Param('wallet_id') wallet_id: string) {
    return this.workflowService.getBalance(Number(wallet_id));
  }

  /**
   * GET TRANSACTIONS ENDPOINT
   *
   * Spec: specs/wallet/wallet.pillar.v2.yml lines 951-971
   * HTTP: GET /v1/wallets/{wallet_id}/transactions
   * Permissions: wallet:read
   *
   * Example request:
   * GET /v1/wallets/456/transactions?limit=50&offset=0
   * Headers:
   *   X-User-Id: user-123
   *   X-User-Role: USER
   *
   * Example response:
   * {
   *   "items": [
   *     {
   *       "id": 1011,
   *       "type": "manual_deposit",
   *       "amount": "100.00",
   *       "occurred_at": "2024-01-15T10:30:00.000Z"
   *     },
   *     ...
   *   ]
   * }
   */
  @Get('/v1/wallets/:wallet_id/transactions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('wallet:read')
  async getTransactions(
    @Param('wallet_id') wallet_id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.workflowService.getTransactions(
      Number(wallet_id),
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
