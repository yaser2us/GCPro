import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Address Entity
 * Polymorphic address record attached to any owner via owner_type + owner_id.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Entity('address')
@Index('idx_address_owner', ['owner_type', 'owner_id'])
@Index('idx_address_default', ['owner_type', 'owner_id', 'is_default'])
export class Address {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 16, name: 'owner_type' })
  owner_type: string;

  @Column({ type: 'bigint', unsigned: true, name: 'owner_id' })
  owner_id: number;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'type' })
  type: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'line1' })
  line1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'line2' })
  line2: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'city' })
  city: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'state_code' })
  state_code: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'postcode' })
  postcode: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'country' })
  country: string | null;

  @Column({ type: 'tinyint', default: 0, name: 'is_default' })
  is_default: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updated_at: Date;
}
