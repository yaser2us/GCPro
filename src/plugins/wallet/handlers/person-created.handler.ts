import { Injectable, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { WalletService } from '../services/wallet.service';

/**
 * PersonCreatedHandler — C5 Wallet Auto-Init
 *
 * When a person with a primary_user_id is created, automatically provision:
 *   1. One `account` (type=user)
 *   2. One wallet: MYR / MAIN
 *   3. One wallet: COIN / MAIN
 *
 * Trigger: PERSON_CREATED (emitted by person plugin)
 * Why PERSON_CREATED and not USER_CREATED: account requires account_person
 * linkage which in turn requires a person record.
 *
 * Idempotency: WalletService.findOrCreate* methods use ON DUPLICATE KEY UPDATE
 * semantics — safe to re-run on retry.
 *
 * Based on: api-build-plan.md C5 + specs/wallet/wallet.pillar.v2.yml
 */
@Injectable()
export class PersonCreatedHandler {
  private readonly logger = new Logger(PersonCreatedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly walletService: WalletService,
    private readonly outboxService: OutboxService,
  ) {}

  async handle(event: { person_id: number; type: string; full_name: string }): Promise<void> {
    const { person_id } = event;

    await this.txService.run(async (queryRunner: QueryRunner) => {
      // Resolve primary_user_id from person record
      const rows = await queryRunner.manager.query(
        `SELECT primary_user_id FROM person WHERE id = ?`,
        [person_id],
      );
      const person = rows[0];

      if (!person || !person.primary_user_id) {
        // Dependent person without a linked user — no wallet provisioning needed
        this.logger.log(
          `PersonCreatedHandler: person_id=${person_id} has no primary_user_id, skipping wallet init`,
        );
        return;
      }

      const user_id: number = Number(person.primary_user_id);

      // Provision MYR wallet
      const { account, wallet: myrWallet } = await this.walletService.findOrCreateUserWallet(
        user_id,
        'MYR',
        'MAIN',
        queryRunner,
      );

      // Provision COIN wallet (account already exists; reuse it)
      const { wallet: coinWallet } = await this.walletService.findOrCreateUserWallet(
        user_id,
        'COIN',
        'MAIN',
        queryRunner,
      );

      // Emit WALLET_AUTO_INITIALIZED event
      await this.outboxService.enqueue(
        {
          event_name: 'WALLET_AUTO_INITIALIZED',
          event_version: 1,
          aggregate_type: 'ACCOUNT',
          aggregate_id: String(account.id),
          actor_user_id: String(user_id),
          occurred_at: new Date(),
          correlation_id: `person-created-${person_id}`,
          causation_id: `event-person-created-${person_id}`,
          payload: {
            user_id,
            person_id,
            account_id: account.id,
            myr_wallet_id: myrWallet.id,
            coin_wallet_id: coinWallet.id,
          },
        },
        queryRunner,
      );

      this.logger.log(
        `Wallet auto-initialized: user_id=${user_id} account_id=${account.id} ` +
          `myr_wallet_id=${myrWallet.id} coin_wallet_id=${coinWallet.id}`,
      );
    });
  }
}
