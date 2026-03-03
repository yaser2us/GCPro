import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * Transaction service for managing database transactions
 * Based on corekit.v1.yaml Transaction service
 *
 * Ensures all multi-table writes are atomic (commit on success, rollback on error)
 */
@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute a function within a database transaction
   * If fn succeeds → commit
   * If fn throws → rollback
   *
   * @param fn Function to execute in transaction (receives QueryRunner)
   * @returns Result of fn
   */
  async run<T>(fn: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Execute the function with the query runner
      const result = await fn(queryRunner);

      // Commit if successful
      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
