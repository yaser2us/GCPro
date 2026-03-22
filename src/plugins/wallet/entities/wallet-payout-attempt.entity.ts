import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletPayoutAttempt Entity
 * Maps to: wallet_payout_attempt table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Execution attempt for a withdrawal request. Append-only log.
 */
@Entity('wallet_payout_attempt')
@Index('idx_wpa_withdrawal', ['withdrawal_request_id'])
@Index('idx_wpa_status', ['status'])
@Index('idx_wpa_provider_ref', ['provider', 'provider_ref'])
export class WalletPayoutAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  withdrawal_request_id: number;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  provider_ref: string | null;

  @Column({ type: 'varchar', length: 16, default: 'initiated' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  failure_code: string | null;

  @Column({ type: 'json', nullable: true })
  request_json: object | null;

  @Column({ type: 'json', nullable: true })
  response_json: object | null;

  @Column({ type: 'datetime' })
  attempted_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
