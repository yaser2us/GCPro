import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../services/ledger.service';
import { BalanceService } from '../services/balance.service';

/**
 * Commission Accrual Handler
 *
 * Handles ACCRUAL_RECORDED and ACCRUAL_VOIDED events from the commission pillar
 *
 * Scope: Single responsibility - only processes commission accruals
 * Reuses: Shared services (WalletService, LedgerService, BalanceService)
 *
 * Flow (ACCRUAL_RECORDED):
 * 1. Fetch commission_accrual and validate
 * 2. Fetch commission_participant to get wallet_id
 * 3. Validate participant has wallet_id
 * 4. Check idempotency (prevent duplicate credits)
 * 5. Create ledger transaction with ref_type='commission_accrual'
 * 6. Credit wallet balance
 * 7. Emit WALLET_CREDITED event
 *
 * Flow (ACCRUAL_VOIDED):
 * 1. Fetch commission_accrual and validate
 * 2. Fetch commission_participant to get wallet_id
 * 3. Find original credit transaction
 * 4. Check wallet has sufficient balance
 * 5. Create debit transaction (reversal)
 * 6. Debit wallet balance
 * 7. Emit WALLET_DEBITED event
 *
 * Based on: specs/commission/commission.pillar.v2.yml cross-pillar integration section
 */
@Injectable()
export class CommissionAccrualHandler {
  private readonly logger = new Logger(CommissionAccrualHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly ledgerService: LedgerService,
    private readonly balanceService: BalanceService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Handle ACCRUAL_RECORDED event - credit participant wallet
   *
   * @param event - Event payload from commission pillar
   * @returns Result with ledger_txn_id and new_balance
   */
  async handleAccrualRecorded(event: {
    accrual_id: number;
    program_id: number;
    participant_id: number;
    amount: number;
    currency: string;
  }): Promise<{
    ledger_txn_id: number;
    new_balance: string;
    already_processed?: boolean;
  }> {
    const result = await this.txService.run(async (queryRunner) => {
      const { accrual_id, program_id, participant_id, amount, currency } = event;

      // === STEP 1: Fetch and validate commission_accrual ===
      const accrual = await this.fetchAndValidateAccrual(
        accrual_id,
        program_id,
        queryRunner,
      );

      // === STEP 2: Fetch commission_participant to get wallet_id ===
      const participant = await this.fetchAndValidateParticipant(
        participant_id,
        program_id,
        queryRunner,
      );

      // === STEP 3: Validate participant has wallet_id ===
      if (!participant.wallet_id) {
        this.logger.error(
          `Participant ${participant_id} has no wallet_id. Commission accrual ${accrual_id} cannot be credited.`,
        );
        throw new ConflictException({
          code: 'PARTICIPANT_NO_WALLET',
          message: `Participant ${participant_id} has no wallet assigned`,
        });
      }

      // === STEP 4: Check idempotency (prevent duplicate processing) ===
      const idempotency_key = `commission_accrual_${accrual_id}`;
      const existingTxn = await this.ledgerService.findByIdempotencyKey(
        idempotency_key,
        queryRunner,
      );

      if (existingTxn) {
        // Already processed, return early with current balance
        const currentBalance = await this.balanceService.getBalance(
          participant.wallet_id,
          queryRunner,
        );

        this.logger.log(
          `Accrual ${accrual_id} already processed, ledger_txn_id=${existingTxn.id}`,
        );

        return {
          ledger_txn_id: existingTxn.id,
          new_balance: currentBalance?.total_amount || '0.00',
          already_processed: true,
        };
      }

      // === STEP 5: Create ledger transaction with ref_type='commission_accrual' ===
      const ledger_txn_id = await this.ledgerService.createCreditTransaction(
        {
          account_id: participant.wallet_id, // Using wallet_id as account_id
          type: 'commission_accrual',
          amount: String(amount),
          currency: currency || 'COIN',
          ref_type: 'commission_accrual',
          ref_id: String(accrual_id),
          idempotency_key,
          meta_json: {
            program_id,
            participant_id,
            accrual_id,
          },
        },
        queryRunner,
      );

      // === STEP 6: Credit wallet balance ===
      const new_balance = await this.balanceService.creditBalance(
        participant.wallet_id,
        String(amount),
        queryRunner,
      );

      this.logger.log(
        `Credited wallet ${participant.wallet_id} with ${amount} ${currency} for accrual ${accrual_id}, new_balance=${new_balance}`,
      );

      // === STEP 7: Emit WALLET_CREDITED event ===
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_CREDITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(participant.wallet_id),
          actor_user_id: String(participant.participant_id), // User who earned commission
          occurred_at: new Date(),
          correlation_id: `commission-accrual-${accrual_id}-${Date.now()}`,
          causation_id: `event-accrual-recorded-${accrual_id}`,
          payload: {
            wallet_id: participant.wallet_id,
            ledger_txn_id,
            amount: Number(amount),
            currency: currency || 'COIN',
            new_balance,
            source: 'commission_accrual',
            source_id: accrual_id,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance,
        already_processed: false,
      };
    });

    return result;
  }

  /**
   * Handle ACCRUAL_VOIDED event - debit participant wallet (reversal)
   *
   * @param event - Event payload from commission pillar
   * @returns Result with ledger_txn_id and new_balance
   */
  async handleAccrualVoided(event: {
    accrual_id: number;
    program_id: number;
    participant_id: number;
    original_amount: number;
    currency: string;
    void_reason?: string;
  }): Promise<{
    ledger_txn_id: number;
    new_balance: string;
    already_processed?: boolean;
  }> {
    const result = await this.txService.run(async (queryRunner) => {
      const {
        accrual_id,
        program_id,
        participant_id,
        original_amount,
        currency,
        void_reason,
      } = event;

      // === STEP 1: Fetch and validate commission_accrual ===
      const accrual = await this.fetchAndValidateAccrual(
        accrual_id,
        program_id,
        queryRunner,
      );

      // === STEP 2: Fetch commission_participant to get wallet_id ===
      const participant = await this.fetchAndValidateParticipant(
        participant_id,
        program_id,
        queryRunner,
      );

      if (!participant.wallet_id) {
        this.logger.warn(
          `Participant ${participant_id} has no wallet_id. Accrual void ${accrual_id} cannot be reversed.`,
        );
        throw new ConflictException({
          code: 'PARTICIPANT_NO_WALLET',
          message: `Participant ${participant_id} has no wallet assigned`,
        });
      }

      // === STEP 3: Find original credit transaction ===
      const original_txn_idempotency_key = `commission_accrual_${accrual_id}`;
      const originalTxn = await this.ledgerService.findByIdempotencyKey(
        original_txn_idempotency_key,
        queryRunner,
      );

      if (!originalTxn) {
        this.logger.warn(
          `Original credit transaction not found for accrual ${accrual_id}. Treating void as idempotent success.`,
        );
        const currentBalance = await this.balanceService.getBalance(
          participant.wallet_id,
          queryRunner,
        );
        return {
          ledger_txn_id: 0,
          new_balance: currentBalance?.total_amount || '0.00',
          already_processed: true,
        };
      }

      // === STEP 4: Check idempotency for void operation ===
      const void_idempotency_key = `commission_accrual_void_${accrual_id}`;
      const existingVoidTxn = await this.ledgerService.findByIdempotencyKey(
        void_idempotency_key,
        queryRunner,
      );

      if (existingVoidTxn) {
        // Already voided
        const currentBalance = await this.balanceService.getBalance(
          participant.wallet_id,
          queryRunner,
        );

        this.logger.log(
          `Accrual void ${accrual_id} already processed, ledger_txn_id=${existingVoidTxn.id}`,
        );

        return {
          ledger_txn_id: existingVoidTxn.id,
          new_balance: currentBalance?.total_amount || '0.00',
          already_processed: true,
        };
      }

      // === STEP 5: Check wallet has sufficient balance ===
      const currentBalance = await this.balanceService.getBalance(
        participant.wallet_id,
        queryRunner,
      );

      const availableBalance = Number(currentBalance?.available_amount || '0');
      if (availableBalance < original_amount) {
        this.logger.error(
          `Insufficient balance to void accrual ${accrual_id}. Required: ${original_amount}, Available: ${availableBalance}`,
        );
        throw new ConflictException({
          code: 'INSUFFICIENT_BALANCE',
          message: `Wallet has insufficient balance to reverse commission. Required: ${original_amount}, Available: ${availableBalance}`,
        });
      }

      // === STEP 6: Create debit transaction (reversal) ===
      const ledger_txn_id = await this.ledgerService.createDebitTransaction(
        {
          account_id: participant.wallet_id,
          type: 'commission_accrual_void',
          amount: String(original_amount),
          currency: currency || 'COIN',
          ref_type: 'commission_accrual_void',
          ref_id: String(accrual_id),
          idempotency_key: void_idempotency_key,
          meta_json: {
            program_id,
            participant_id,
            accrual_id,
            void_reason,
            original_txn_id: originalTxn.id,
          },
        },
        queryRunner,
      );

      // === STEP 7: Debit wallet balance ===
      const new_balance = await this.balanceService.debitBalance(
        participant.wallet_id,
        String(original_amount),
        queryRunner,
      );

      this.logger.log(
        `Debited wallet ${participant.wallet_id} with ${original_amount} ${currency} for accrual void ${accrual_id}, new_balance=${new_balance}`,
      );

      // === STEP 8: Emit WALLET_DEBITED event ===
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_DEBITED',
          event_version: 1,
          aggregate_type: 'WALLET',
          aggregate_id: String(participant.wallet_id),
          actor_user_id: String(participant.participant_id),
          occurred_at: new Date(),
          correlation_id: `commission-accrual-void-${accrual_id}-${Date.now()}`,
          causation_id: `event-accrual-voided-${accrual_id}`,
          payload: {
            wallet_id: participant.wallet_id,
            ledger_txn_id,
            amount: Number(original_amount),
            currency: currency || 'COIN',
            new_balance,
            source: 'commission_accrual_void',
            source_id: accrual_id,
            void_reason,
          },
        },
        queryRunner,
      );

      return {
        ledger_txn_id,
        new_balance,
        already_processed: false,
      };
    });

    return result;
  }

  /**
   * Fetch and validate commission_accrual from commission plugin
   *
   * @param accrual_id - Accrual ID
   * @param program_id - Expected program ID
   * @param queryRunner - Transaction context
   * @returns Validated accrual record
   */
  private async fetchAndValidateAccrual(
    accrual_id: number,
    program_id: number,
    queryRunner: QueryRunner,
  ): Promise<any> {
    const accrualResult = await queryRunner.manager.query(
      `SELECT * FROM commission_accrual WHERE id = ?`,
      [accrual_id],
    );
    const accrual = accrualResult[0];

    if (!accrual) {
      throw new NotFoundException({
        code: 'ACCRUAL_NOT_FOUND',
        message: `Commission accrual ${accrual_id} not found`,
      });
    }

    if (accrual.program_id !== program_id) {
      throw new ConflictException({
        code: 'ACCRUAL_PROGRAM_MISMATCH',
        message: `Accrual program_id ${accrual.program_id} does not match event program_id ${program_id}`,
      });
    }

    if (Number(accrual.amount) <= 0) {
      throw new BadRequestException({
        code: 'INVALID_ACCRUAL_AMOUNT',
        message: `Accrual amount must be greater than 0, got ${accrual.amount}`,
      });
    }

    return accrual;
  }

  /**
   * Fetch and validate commission_participant from commission plugin
   *
   * @param participant_id - Participant ID
   * @param program_id - Expected program ID
   * @param queryRunner - Transaction context
   * @returns Validated participant record
   */
  private async fetchAndValidateParticipant(
    participant_id: number,
    program_id: number,
    queryRunner: QueryRunner,
  ): Promise<any> {
    const participantResult = await queryRunner.manager.query(
      `SELECT * FROM commission_participant WHERE id = ?`,
      [participant_id],
    );
    const participant = participantResult[0];

    if (!participant) {
      throw new NotFoundException({
        code: 'PARTICIPANT_NOT_FOUND',
        message: `Commission participant ${participant_id} not found`,
      });
    }

    if (participant.program_id !== program_id) {
      throw new ConflictException({
        code: 'PARTICIPANT_PROGRAM_MISMATCH',
        message: `Participant program_id ${participant.program_id} does not match event program_id ${program_id}`,
      });
    }

    if (participant.status !== 'active') {
      this.logger.warn(
        `Participant ${participant_id} status is ${participant.status}, not active. Proceeding with caution.`,
      );
    }

    return participant;
  }
}
