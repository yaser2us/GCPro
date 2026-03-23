import { Injectable } from '@nestjs/common';
import { WalletRepository } from '../repositories/wallet.repo';
import { WalletBalanceSnapshotRepository } from '../repositories/wallet-balance-snapshot.repo';

export interface PaymentSource {
  /** Amount to pay from wallet (GC Wallet MYR balance), 0 if none */
  wallet_amount: number;
  /** Amount to pay via external payment intent, 0 if none */
  payment_intent_amount: number;
  /** wallet_id of the GC Wallet (MYR), null if none */
  wallet_id: number | null;
  /** Whether split payment is used */
  is_split: boolean;
}

/**
 * PaymentPriorityService — L10
 *
 * Resolves the optimal payment source for a given account and amount.
 * Priority: GC Wallet (MYR) first → remainder via external payment intent.
 *
 * Used by: policy installment payment, deposit top-up
 */
@Injectable()
export class PaymentPriorityService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly balanceSnapshotRepo: WalletBalanceSnapshotRepository,
  ) {}

  /**
   * Resolves how much to pay from the GC Wallet vs external payment.
   * @param accountId  The account to check wallets for
   * @param amount     Total amount needed (as number)
   * @param currency   Currency code (default 'MYR')
   */
  async resolve(
    accountId: number,
    amount: number,
    currency = 'MYR',
  ): Promise<PaymentSource> {
    // Find the primary MYR wallet for this account
    const wallets = await this.walletRepo.listByAccount(accountId);
    const gcWallet = wallets.find(
      (w) => w.currency === currency && w.wallet_type === 'GC_WALLET' && w.status === 'active',
    );

    if (!gcWallet) {
      return {
        wallet_amount: 0,
        payment_intent_amount: amount,
        wallet_id: null,
        is_split: false,
      };
    }

    const snapshot = await this.balanceSnapshotRepo.findByWalletId(gcWallet.id);
    const available = parseFloat(snapshot?.available_amount ?? '0');

    if (available <= 0) {
      return {
        wallet_amount: 0,
        payment_intent_amount: amount,
        wallet_id: gcWallet.id,
        is_split: false,
      };
    }

    if (available >= amount) {
      // Wallet covers full amount
      return {
        wallet_amount: amount,
        payment_intent_amount: 0,
        wallet_id: gcWallet.id,
        is_split: false,
      };
    }

    // Partial: wallet covers what it can, remainder via external
    return {
      wallet_amount: available,
      payment_intent_amount: amount - available,
      wallet_id: gcWallet.id,
      is_split: true,
    };
  }
}
