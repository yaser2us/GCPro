import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommissionAccrualHandler } from '../handlers/commission-accrual.handler';
import { EventBusService } from '../../../corekit/services/event-bus.service';

/**
 * Commission Accrual Event Consumer
 * Listens to commission events and credits/debits participant wallets
 *
 * Based on specs/commission/commission.pillar.v2.yml cross-pillar integration section
 *
 * Events Consumed:
 * 1. ACCRUAL_RECORDED (emitted by commission plugin on RecordAccrual)
 * 2. ACCRUAL_VOIDED (emitted by commission plugin on VoidAccrual)
 *
 * Source: commission plugin
 * Handler: CommissionAccrualHandler
 *
 * Architecture:
 * - Consumer (this file): Thin routing layer, registers for events
 * - Handler (commission-accrual.handler.ts): Business logic for commission accruals
 * - Shared Services: WalletService, LedgerService, BalanceService
 *
 * Flow:
 * 1. Commission plugin records accrual → ACCRUAL_RECORDED event
 * 2. OutboxPublisher publishes event to EventBus
 * 3. This consumer receives event and delegates to handler
 * 4. Handler credits participant wallet
 * 5. Handler emits WALLET_CREDITED event
 *
 * Idempotency:
 * - Handled by handler via ledger_txn.idempotency_key
 * - Safe to retry on failure
 * - outbox_event_consumer table tracks processing status
 */
@Injectable()
export class CommissionAccrualConsumer implements OnModuleInit {
  private readonly logger = new Logger(CommissionAccrualConsumer.name);

  constructor(
    private readonly handler: CommissionAccrualHandler,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Register event handlers on module initialization
   */
  onModuleInit() {
    // Subscribe to ACCRUAL_RECORDED event
    this.eventBus.subscribe(
      'ACCRUAL_RECORDED',
      this.handleAccrualRecorded.bind(this),
    );
    this.logger.log('✅ Registered for ACCRUAL_RECORDED events');

    // Subscribe to ACCRUAL_VOIDED event
    this.eventBus.subscribe(
      'ACCRUAL_VOIDED',
      this.handleAccrualVoided.bind(this),
    );
    this.logger.log('✅ Registered for ACCRUAL_VOIDED events');
  }

  /**
   * Handle ACCRUAL_RECORDED event - credit participant wallet
   *
   * Event payload:
   * - accrual_id: ID of the commission accrual
   * - program_id: Commission program ID
   * - participant_id: Commission participant ID
   * - amount: Commission amount to credit
   * - currency: Currency code (e.g., 'COIN')
   *
   * This method is called by the outbox event processor when an
   * ACCRUAL_RECORDED event is published by the commission plugin.
   *
   * Flow:
   * 1. Receive event from EventBus
   * 2. Delegate to CommissionAccrualHandler.handleAccrualRecorded()
   * 3. Log success or failure
   *
   * Idempotency:
   * - Handled by handler via ledger_txn.idempotency_key = 'commission_accrual_{accrual_id}'
   * - Safe to retry on failure
   */
  async handleAccrualRecorded(event: {
    accrual_id: number;
    program_id: number;
    participant_id: number;
    amount: number;
    currency: string;
  }): Promise<void> {
    this.logger.log(
      `Processing ACCRUAL_RECORDED event: accrual_id=${event.accrual_id}, participant_id=${event.participant_id}, amount=${event.amount}`,
    );

    try {
      // Delegate to handler (business logic lives there)
      const result = await this.handler.handleAccrualRecorded(event);

      if (result.already_processed) {
        this.logger.log(
          `Accrual already processed: accrual_id=${event.accrual_id}, ledger_txn_id=${result.ledger_txn_id}`,
        );
      } else {
        this.logger.log(
          `Accrual processed successfully: accrual_id=${event.accrual_id}, ledger_txn_id=${result.ledger_txn_id}, new_balance=${result.new_balance}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process commission accrual: accrual_id=${event.accrual_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }

  /**
   * Handle ACCRUAL_VOIDED event - debit participant wallet (reversal)
   *
   * Event payload:
   * - accrual_id: ID of the commission accrual being voided
   * - program_id: Commission program ID
   * - participant_id: Commission participant ID
   * - original_amount: Original commission amount to reverse
   * - currency: Currency code (e.g., 'COIN')
   * - void_reason: Reason for voiding (optional)
   *
   * This method is called when a commission accrual is voided (e.g., due to
   * fraud, refund, or error correction).
   *
   * Flow:
   * 1. Receive event from EventBus
   * 2. Delegate to CommissionAccrualHandler.handleAccrualVoided()
   * 3. Log success or failure
   *
   * Safety:
   * - Handler checks wallet has sufficient balance before reversal
   * - Will throw INSUFFICIENT_BALANCE if wallet balance too low
   * - Requires manual intervention for negative balance cases
   */
  async handleAccrualVoided(event: {
    accrual_id: number;
    program_id: number;
    participant_id: number;
    original_amount: number;
    currency: string;
    void_reason?: string;
  }): Promise<void> {
    this.logger.log(
      `Processing ACCRUAL_VOIDED event: accrual_id=${event.accrual_id}, participant_id=${event.participant_id}, amount=${event.original_amount}, reason=${event.void_reason || 'not specified'}`,
    );

    try {
      // Delegate to handler (business logic lives there)
      const result = await this.handler.handleAccrualVoided(event);

      if (result.already_processed) {
        this.logger.log(
          `Accrual void already processed: accrual_id=${event.accrual_id}, ledger_txn_id=${result.ledger_txn_id}`,
        );
      } else {
        this.logger.log(
          `Accrual void processed successfully: accrual_id=${event.accrual_id}, ledger_txn_id=${result.ledger_txn_id}, new_balance=${result.new_balance}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process commission accrual void: accrual_id=${event.accrual_id}, error=${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow retry by outbox processor
    }
  }
}
