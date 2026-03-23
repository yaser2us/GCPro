import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { MissionDefinitionRepository } from '../repositories/mission-definition.repo';
import { MissionAssignmentRepository } from '../repositories/mission-assignment.repo';
import { MissionProgressRepository } from '../repositories/mission-progress.repo';

/**
 * UserActivatedHandler — M10
 *
 * Listens to USER_ACTIVATED events.
 * Assigns all active missions with cadence='daily' (streak missions)
 * and one_time milestone missions to the newly activated user.
 * Initialises mission_progress rows for each criteria metric.
 *
 * Idempotency: mission_assignment has no unique constraint on (mission_id, user_id)
 * in the repo upsert, so duplicate-key on idempotency_key prevents double-assign.
 */
@Injectable()
export class UserActivatedHandler {
  private readonly logger = new Logger(UserActivatedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly definitionRepo: MissionDefinitionRepository,
    private readonly assignmentRepo: MissionAssignmentRepository,
    private readonly progressRepo: MissionProgressRepository,
  ) {}

  async handle(event: { user_id: number; [key: string]: any }): Promise<void> {
    const userId = Number(event.user_id);

    await this.txService.run(async (queryRunner) => {
      // Load all active auto-assignable missions (daily streak + one_time)
      const missions: any[] = await queryRunner.manager.query(
        `SELECT id, code, cadence, criteria_json
         FROM mission_definition
         WHERE status = 'active'
           AND cadence IN ('daily', 'one_time')
         ORDER BY id`,
      );

      if (!missions.length) {
        this.logger.log(`M10: no active missions to assign for user_id=${userId}`);
        return;
      }

      for (const mission of missions) {
        const idempotencyKey = `user_${userId}_mission_${mission.id}_assign`;

        const assignmentId = await this.assignmentRepo.upsert(
          {
            mission_id: mission.id,
            user_id: userId,
            status: 'assigned',
            idempotency_key: idempotencyKey,
          },
          queryRunner,
        );

        if (!assignmentId) continue;

        // Initialise progress row(s) for each metric in criteria_json
        const criteria = typeof mission.criteria_json === 'string'
          ? JSON.parse(mission.criteria_json)
          : mission.criteria_json ?? {};

        if (criteria.metric) {
          await this.progressRepo.upsert(
            {
              assignment_id: assignmentId,
              metric_code: criteria.metric,
              current_value: 0,
              target_value: criteria.target ?? 1,
              status: 'tracking',
            },
            queryRunner,
          );
        }
      }

      this.logger.log(
        `M10: assigned ${missions.length} mission(s) to user_id=${userId}`,
      );
    });
  }
}
