import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { LedgerTxnRepository } from '../repositories/ledger-txn.repo';
import { LedgerEntryRepository } from '../repositories/ledger-entry.repo';

/**
 * Ledger Service
 *
 * Provides shared ledger operations used by multiple handlers
 * - Check idempotency
 * - Create ledger transactions
 * - Create double-entry ledger entries
 *
 * This service is used by:
 * - MissionRewardHandler
 * - ClaimPayoutHandler (future)
 * - CommissionHandler (future)
 * - WithdrawalHandler (future)
 * - etc.
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly ledgerTxnRepo: LedgerTxnRepository,
    private readonly ledgerEntryRepo: LedgerEntryRepository,
  ) {}

  /**
   * Check if transaction already processed (idempotency check)
   *
   * @param idempotency_key - Unique key for this transaction
   * @param queryRunner - Transaction context
   * @returns Existing transaction or null
   */
  async findByIdempotencyKey(
    idempotency_key: string,
    queryRunner: QueryRunner,
  ): Promise<any | null> {
    return await this.ledgerTxnRepo.findByIdempotencyKey(
      idempotency_key,
      queryRunner,
    );
  }

  /**
   * Create a ledger transaction with double-entry bookkeeping
   *
   * Creates:
   * 1. Ledger transaction record
   * 2. Debit entry (from system account)
   * 3. Credit entry (to user account)
   *
   * @param params - Transaction parameters
   * @param queryRunner - Transaction context
   * @returns Ledger transaction ID
   */
  async createCreditTransaction(
    params: {
      account_id: number;           // User account to credit
      type: string;                  // e.g., 'mission_reward', 'claim_payout'
      amount: string;                // Amount to credit
      currency: string;              // Currency (e.g., 'COIN')
      ref_type: string;              // Reference type (e.g., 'mission_reward_grant')
      ref_id: string;                // Reference ID
      idempotency_key: string;       // Idempotency key
      meta_json?: any;               // Optional metadata
      system_account_id?: number;    // System account (default: 1)
    },
    queryRunner: QueryRunner,
  ): Promise<number> {
    const {
      account_id,
      type,
      amount,
      currency,
      ref_type,
      ref_id,
      idempotency_key,
      meta_json = {},
      system_account_id = 1,
    } = params;

    // Create ledger transaction
    const ledger_txn_id = await this.ledgerTxnRepo.create(
      {
        account_id,
        type,
        status: 'posted',
        ref_type,
        ref_id,
        idempotency_key,
        meta_json,
        occurred_at: new Date(),
        posted_at: new Date(),
      },
      queryRunner,
    );

    // Create debit entry (from system account)
    await this.ledgerEntryRepo.create(
      {
        txn_id: ledger_txn_id,
        account_id: system_account_id,  // System account
        entry_type: 'principal',
        direction: 'debit',
        amount,
        currency,
      },
      queryRunner,
    );

    // Create credit entry (to user account)
    await this.ledgerEntryRepo.create(
      {
        txn_id: ledger_txn_id,
        account_id,  // User account
        entry_type: 'principal',
        direction: 'credit',
        amount,
        currency,
      },
      queryRunner,
    );

    return ledger_txn_id;
  }

  /**
   * Create a debit transaction (money out)
   *
   * Future use: withdrawals, purchases, etc.
   *
   * @param params - Transaction parameters
   * @param queryRunner - Transaction context
   * @returns Ledger transaction ID
   */
  async createDebitTransaction(
    params: {
      account_id: number;
      type: string;
      amount: string;
      currency: string;
      ref_type: string;
      ref_id: string;
      idempotency_key: string;
      meta_json?: any;
      system_account_id?: number;
    },
    queryRunner: QueryRunner,
  ): Promise<number> {
    const {
      account_id,
      type,
      amount,
      currency,
      ref_type,
      ref_id,
      idempotency_key,
      meta_json = {},
      system_account_id = 1,
    } = params;

    // Create ledger transaction
    const ledger_txn_id = await this.ledgerTxnRepo.create(
      {
        account_id,
        type,
        status: 'posted',
        ref_type,
        ref_id,
        idempotency_key,
        meta_json,
        occurred_at: new Date(),
        posted_at: new Date(),
      },
      queryRunner,
    );

    // Create debit entry (from user account)
    await this.ledgerEntryRepo.create(
      {
        txn_id: ledger_txn_id,
        account_id,  // User account
        entry_type: 'principal',
        direction: 'debit',
        amount,
        currency,
      },
      queryRunner,
    );

    // Create credit entry (to system account)
    await this.ledgerEntryRepo.create(
      {
        txn_id: ledger_txn_id,
        account_id: system_account_id,  // System account
        entry_type: 'principal',
        direction: 'credit',
        amount,
        currency,
      },
      queryRunner,
    );

    return ledger_txn_id;
  }
}
