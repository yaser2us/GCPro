import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { Step, StepKind, StepResult } from './step.types';
import { StepContext } from './step.context';
import { Guard } from '../guard';
import { OutboxService } from '../services/outbox.service';

/**
 * StepRunner shell for executing workflow steps
 * Based on corekit.foundation.v1.yml (lines 199-207)
 *
 * This is a "shell" - provides the framework for step execution.
 * Actual step implementations are provided by the workflow service or generated code.
 */
@Injectable()
export class StepRunner {
  constructor(private readonly outboxService: OutboxService) {}

  /**
   * Execute a single step within a transaction
   *
   * @param step Step to execute
   * @param context Execution context
   * @param queryRunner Database query runner
   * @returns Step result
   */
  async executeStep(
    step: Step,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    try {
      switch (step.kind) {
        case StepKind.READ:
          return await this.executeRead(step, context, queryRunner);

        case StepKind.INSERT:
          return await this.executeInsert(step, context, queryRunner);

        case StepKind.UPDATE:
          return await this.executeUpdate(step, context, queryRunner);

        case StepKind.UPSERT:
          return await this.executeUpsert(step, context, queryRunner);

        case StepKind.COUNT:
          return await this.executeCount(step, context, queryRunner);

        case StepKind.GUARD:
          return await this.executeGuard(step, context);

        case StepKind.WHEN:
          return await this.executeWhen(step, context, queryRunner);

        case StepKind.OUTBOX_EMIT:
          return await this.executeOutboxEmit(step, context, queryRunner);

        case StepKind.HOOK:
          return await this.executeHook(step, context);

        case StepKind.CALL:
          return await this.executeCall(step, context);

        default:
          throw new Error(`Unknown step kind: ${(step as any).kind}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Execute multiple steps in sequence
   *
   * @param steps Steps to execute
   * @param context Execution context
   * @param queryRunner Database query runner
   * @returns Final context with accumulated state
   */
  async executeSteps(
    steps: Step[],
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepContext> {
    let currentContext = context;

    for (const step of steps) {
      const result = await this.executeStep(step, currentContext, queryRunner);

      if (!result.success) {
        throw result.error;
      }

      // If step produced data, add to context state
      if (result.data !== undefined) {
        const alias = (step as any).as;
        if (alias) {
          currentContext.set(alias, result.data);
        }
      }
    }

    return currentContext;
  }

  // ============================================================================
  // STEP IMPLEMENTATIONS (to be overridden or extended by workflow services)
  // ============================================================================

  /**
   * READ step - read rows from database
   */
  protected async executeRead(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    // Shell implementation - actual implementation in workflow service
    // Example: const result = await queryRunner.manager.find(step.table, { where: step.where });
    throw new Error('READ step not implemented - override in workflow service');
  }

  /**
   * INSERT step - insert row into table
   */
  protected async executeInsert(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    // Shell implementation - actual implementation in workflow service
    // Example: const result = await queryRunner.manager.insert(step.table, step.values);
    throw new Error(
      'INSERT step not implemented - override in workflow service',
    );
  }

  /**
   * UPDATE step - update rows
   */
  protected async executeUpdate(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    // Shell implementation - actual implementation in workflow service
    // Example: await queryRunner.manager.update(step.table, step.where, step.set);
    throw new Error(
      'UPDATE step not implemented - override in workflow service',
    );
  }

  /**
   * UPSERT step - insert or update using unique key
   */
  protected async executeUpsert(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    // Shell implementation - actual implementation in workflow service
    throw new Error(
      'UPSERT step not implemented - override in workflow service',
    );
  }

  /**
   * COUNT step - count rows for guard conditions
   */
  protected async executeCount(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    // Shell implementation - actual implementation in workflow service
    // Example: const count = await queryRunner.manager.count(step.table, { where: step.where });
    throw new Error(
      'COUNT step not implemented - override in workflow service',
    );
  }

  /**
   * GUARD step - enforce condition
   */
  protected async executeGuard(
    step: any,
    context: StepContext,
  ): Promise<StepResult> {
    const condition = context.evaluateCondition(step.expr);
    Guard.assert(condition, step.error_code, step.error_message);

    return { success: true };
  }

  /**
   * WHEN step - conditional branch
   */
  protected async executeWhen(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    const condition = context.evaluateCondition(step.condition);

    const stepsToExecute = condition
      ? step.steps
      : step.else_steps || [];

    if (stepsToExecute.length > 0) {
      await this.executeSteps(stepsToExecute, context, queryRunner);
    }

    return { success: true };
  }

  /**
   * OUTBOX_EMIT step - emit outbox event
   */
  protected async executeOutboxEmit(
    step: any,
    context: StepContext,
    queryRunner: QueryRunner,
  ): Promise<StepResult> {
    const aggregateId = context.resolve(step.aggregate_id);

    // Build payload by resolving all expressions
    const payload: Record<string, any> = {};
    if (step.payload) {
      for (const [key, expr] of Object.entries(step.payload)) {
        payload[key] = context.resolve(expr as string);
      }
    }

    await this.outboxService.enqueue(
      {
        event_name: step.event,
        event_version: 1,
        aggregate_type: step.aggregate_type,
        aggregate_id: String(aggregateId),
        actor_user_id: context.actor.actor_user_id,
        occurred_at: new Date(),
        correlation_id: context.actor.correlation_id || 'unknown',
        causation_id: context.actor.causation_id || 'unknown',
        payload,
      },
      queryRunner,
    );

    return { success: true };
  }

  /**
   * HOOK step - call local extension logic
   */
  protected async executeHook(
    step: any,
    context: StepContext,
  ): Promise<StepResult> {
    // Shell implementation - hooks are implemented by plugins
    // Example hooks: bcrypt_hash, jwt_sign, send_email, etc.
    throw new Error(`Hook '${step.name}' not implemented - provide hook registry`);
  }

  /**
   * CALL step - invoke another plugin command API
   */
  protected async executeCall(
    step: any,
    context: StepContext,
  ): Promise<StepResult> {
    // Shell implementation - cross-plugin calls
    // Example: await this.walletService.creditReward(...)
    throw new Error(
      `Call to ${step.service}.${step.command} not implemented - provide service registry`,
    );
  }
}
