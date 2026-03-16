import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * FileScanResult Entity
 * Source: specs/file/file.pillar.v2.yml
 *
 * Virus/malware scan results
 */
@Entity('file_scan_result')
export class FileScanResult {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  file_id: number;

  @Column({ type: 'varchar', length: 16 })
  scan_type: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  failure_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  summary: string | null;

  @Column({ type: 'json', nullable: true })
  result_json: any | null;

  @Column({ type: 'datetime', nullable: true })
  scanned_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
