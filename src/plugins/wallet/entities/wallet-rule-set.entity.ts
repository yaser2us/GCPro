import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletRuleSet Entity
 * Maps to: wallet_rule_set table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: A versioned set of spending rules for a wallet.
 */
@Entity('wallet_rule_set')
@Index('idx_wrs_wallet_status', ['wallet_id', 'status'])
@Index('idx_wrs_effective', ['effective_from', 'effective_to'])
export class WalletRuleSet {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'v1' })
  version: string;

  @Column({ type: 'datetime', nullable: true })
  effective_from: Date | null;

  @Column({ type: 'datetime', nullable: true })
  effective_to: Date | null;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
