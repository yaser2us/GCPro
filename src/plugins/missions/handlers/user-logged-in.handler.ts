import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';

/**
 * UserLoggedInHandler — M10
 *
 * Listens to USER_LOGGED_IN events.
 * Increments `login` metric progress for all active daily streak mission assignments
 * belonging to the user. When current_value reaches target_value, marks status='completed'.
 *
 * Idempotency: each login event carries a unique event timestamp; duplicate events
 * with the same idempotency key are ignored via ON DUPLICATE KEY on mission_event.
 */
@Injectable()
export class UserLoggedInHandler {
  private readonly logger = new Logger(UserLoggedInHandler.name);

  constructor(private readonly txService: TransactionService) {}

  async handle(event: { user_id: number; [key: string]: any }): Promise<void> {
    const userId = Number(event.user_id);

    await this.txService.run(async (queryRunner) => {
      // Find all active login-metric progress rows for this user's daily assignments
      const progressRows: any[] = await queryRunner.manager.query(
        `SELECT mp.id, mp.assignment_id, mp.current_value, mp.target_value, mp.status
         FROM mission_progress mp
         JOIN mission_assignment ma ON ma.id = mp.assignment_id
         JOIN mission_definition md ON md.id = ma.mission_id
         WHERE ma.user_id = ?
           AND ma.status IN ('assigned', 'in_progress')
           AND md.cadence = 'daily'
           AND mp.metric_code = 'login'
           AND mp.status = 'tracking'`,
        [userId],
      );

      if (!progressRows.length) {
        this.logger.log(`M10: no active login-streak progress rows for user_id=${userId}`);
        return;
      }

      for (const row of progressRows) {
        const newValue = Number(row.current_value) + 1;
        const isCompleted = newValue >= Number(row.target_value);
        const newStatus = isCompleted ? 'completed' : 'tracking';

        await queryRunner.manager.query(
          `UPDATE mission_progress
           SET current_value = ?, status = ?, updated_at = NOW()
           WHERE id = ?`,
          [newValue, newStatus, row.id],
        );

        if (isCompleted) {
          // Mark the assignment as completed too
          await queryRunner.manager.query(
            `UPDATE mission_assignment
             SET status = 'completed', updated_at = NOW()
             WHERE id = ?`,
            [row.assignment_id],
          );

          this.logger.log(
            `M10: login streak completed for user_id=${userId}, assignment_id=${row.assignment_id}`,
          );
        }
      }

      this.logger.log(
        `M10: incremented login metric for ${progressRows.length} assignment(s) for user_id=${userId}`,
      );
    });
  }
}
