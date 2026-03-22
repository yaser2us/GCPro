import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * WalletPolicyGate Entity
 * Maps to: wallet_policy_gate table
 * Source: specs/wallet-advanced/wallet-advanced.pillar.v2.yml
 *
 * Purpose: Feature flag / policy gate per wallet.
 */
@Entity('wallet_policy_gate')
@Index('uk_wpg_wallet_gate', ['wallet_id', 'gate_code'], { unique: true })
@Index('idx_wpg_status', ['gate_code', 'status'])
export class WalletPolicyGate {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  wallet_id: number;

  @Column({ type: 'varchar', length: 64 })
  gate_code: string;

  @Column({ type: 'varchar', length: 8, default: 'on' })
  status: string;

  @Column({ type: 'json', nullable: true })
  meta_json: object | null;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
