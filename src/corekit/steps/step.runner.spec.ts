import { Test, TestingModule } from '@nestjs/testing';
import { StepRunner } from './step.runner';
import { StepContext } from './step.context';
import { StepKind, GuardStep, WhenStep, OutboxEmitStep } from './step.types';
import { OutboxService } from '../services/outbox.service';
import { Actor } from '../types/actor.type';
import { DomainError } from '../errors';

describe('StepRunner', () => {
  let stepRunner: StepRunner;
  let mockOutboxService: jest.Mocked<OutboxService>;

  const mockActor: Actor = {
    actor_user_id: '123',
    actor_role: 'ADMIN',
    correlation_id: 'corr-123',
    causation_id: 'cause-123',
  };

  const mockQueryRunner: any = {
    manager: {},
  };

  beforeEach(async () => {
    mockOutboxService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepRunner,
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
      ],
    }).compile();

    stepRunner = module.get<StepRunner>(StepRunner);
  });

  describe('executeStep', () => {
    it('should route to correct step handler', async () => {
      const guardStep: GuardStep = {
        kind: StepKind.GUARD,
        expr: "status == 'active'",
        error_code: 'INVALID_STATUS',
      };

      const context = new StepContext(mockActor, { status: 'active' });
      const result = await stepRunner.executeStep(guardStep, context, mockQueryRunner);

      expect(result.success).toBe(true);
    });

    it('should return error result on exception', async () => {
      const guardStep: GuardStep = {
        kind: StepKind.GUARD,
        expr: "status == 'active'",
        error_code: 'INVALID_STATUS',
      };

      const context = new StepContext(mockActor, { status: 'inactive' });
      const result = await stepRunner.executeStep(guardStep, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
    });

    it('should throw error for unknown step kind', async () => {
      const invalidStep: any = {
        kind: 'INVALID_STEP',
      };

      const context = new StepContext(mockActor, {});
      const result = await stepRunner.executeStep(invalidStep, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('executeSteps', () => {
    it('should execute multiple steps in sequence', async () => {
      const steps: GuardStep[] = [
        {
          kind: StepKind.GUARD,
          expr: "status == 'active'",
          error_code: 'NOT_ACTIVE',
        },
        {
          kind: StepKind.GUARD,
          expr: 'amount > 0',
          error_code: 'INVALID_AMOUNT',
        },
      ];

      const context = new StepContext(mockActor, { status: 'active', amount: 100 });
      const resultContext = await stepRunner.executeSteps(steps, context, mockQueryRunner);

      expect(resultContext).toBeInstanceOf(StepContext);
      expect(resultContext.actor).toBe(mockActor);
    });

    it('should throw on first failed step', async () => {
      const steps: GuardStep[] = [
        {
          kind: StepKind.GUARD,
          expr: "status == 'active'",
          error_code: 'NOT_ACTIVE',
        },
        {
          kind: StepKind.GUARD,
          expr: 'amount > 0',
          error_code: 'INVALID_AMOUNT',
        },
      ];

      const context = new StepContext(mockActor, { status: 'inactive', amount: 100 });

      await expect(
        stepRunner.executeSteps(steps, context, mockQueryRunner)
      ).rejects.toThrow(DomainError);
    });
  });

  describe('executeGuard', () => {
    it('should pass when condition is true', async () => {
      const step: GuardStep = {
        kind: StepKind.GUARD,
        expr: "status == 'active'",
        error_code: 'INVALID_STATUS',
      };

      const context = new StepContext(mockActor, { status: 'active' });
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(true);
    });

    it('should fail when condition is false', async () => {
      const step: GuardStep = {
        kind: StepKind.GUARD,
        expr: "status == 'active'",
        error_code: 'INVALID_STATUS',
      };

      const context = new StepContext(mockActor, { status: 'inactive' });
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError).code).toBe('INVALID_STATUS');
    });

    it('should use custom error message', async () => {
      const step: GuardStep = {
        kind: StepKind.GUARD,
        expr: "status == 'active'",
        error_code: 'INVALID_STATUS',
        error_message: 'Custom error message',
      };

      const context = new StepContext(mockActor, { status: 'inactive' });
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.error?.message).toBe('Custom error message');
    });
  });

  describe('executeWhen', () => {
    it('should execute steps when condition is true', async () => {
      const whenStep: WhenStep = {
        kind: StepKind.WHEN,
        condition: 'amount > 50',
        steps: [
          {
            kind: StepKind.GUARD,
            expr: "status == 'active'",
            error_code: 'NOT_ACTIVE',
          },
        ],
      };

      const context = new StepContext(mockActor, { amount: 100, status: 'active' });
      const result = await stepRunner.executeStep(whenStep, context, mockQueryRunner);

      expect(result.success).toBe(true);
    });

    it('should skip steps when condition is false', async () => {
      const whenStep: WhenStep = {
        kind: StepKind.WHEN,
        condition: 'amount > 50',
        steps: [
          {
            kind: StepKind.GUARD,
            expr: "status == 'active'",
            error_code: 'NOT_ACTIVE',
          },
        ],
      };

      const context = new StepContext(mockActor, { amount: 10, status: 'inactive' });
      const result = await stepRunner.executeStep(whenStep, context, mockQueryRunner);

      // Should succeed because steps are skipped when condition is false
      expect(result.success).toBe(true);
    });

    it('should execute else_steps when condition is false', async () => {
      const whenStep: WhenStep = {
        kind: StepKind.WHEN,
        condition: 'amount > 50',
        steps: [
          {
            kind: StepKind.GUARD,
            expr: "status == 'active'",
            error_code: 'NOT_ACTIVE',
          },
        ],
        else_steps: [
          {
            kind: StepKind.GUARD,
            expr: "status == 'pending'",
            error_code: 'NOT_PENDING',
          },
        ],
      };

      const context = new StepContext(mockActor, { amount: 10, status: 'pending' });
      const result = await stepRunner.executeStep(whenStep, context, mockQueryRunner);

      expect(result.success).toBe(true);
    });
  });

  describe('executeOutboxEmit', () => {
    it('should emit event to outbox', async () => {
      const step: OutboxEmitStep = {
        kind: StepKind.OUTBOX_EMIT,
        event: 'USER_CREATED',
        aggregate_type: 'USER',
        aggregate_id: 'user_id',
        payload: {
          user_id: 'user_id',
          email: 'request.email',
        },
      };

      const context = new StepContext(mockActor, { email: 'user@example.com' });
      context.set('user_id', 42);

      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(true);
      expect(mockOutboxService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: 'USER_CREATED',
          event_version: 1,
          aggregate_type: 'USER',
          aggregate_id: '42',
          actor_user_id: '123',
          payload: {
            user_id: 42,
            email: 'user@example.com',
          },
        }),
        mockQueryRunner,
      );
    });

    it('should resolve expressions in payload', async () => {
      const step: OutboxEmitStep = {
        kind: StepKind.OUTBOX_EMIT,
        event: 'MISSION_ASSIGNED',
        aggregate_type: 'MISSION',
        aggregate_id: 'mission_id',
        payload: {
          mission_id: 'mission_id',
          user_id: 'user_id',
          status: 'assigned',
        },
      };

      const context = new StepContext(mockActor, {});
      context.set('mission_id', 10);
      context.set('user_id', 999);

      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(true);
      expect(mockOutboxService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            mission_id: 10,
            user_id: 999,
            status: 'assigned',
          },
        }),
        mockQueryRunner,
      );
    });

    it('should include correlation and causation IDs', async () => {
      const step: OutboxEmitStep = {
        kind: StepKind.OUTBOX_EMIT,
        event: 'TEST_EVENT',
        aggregate_type: 'TEST',
        aggregate_id: 'test_id',
      };

      const context = new StepContext(mockActor, {});
      context.set('test_id', 1);

      await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(mockOutboxService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          correlation_id: 'corr-123',
          causation_id: 'cause-123',
        }),
        mockQueryRunner,
      );
    });
  });

  describe('unimplemented steps', () => {
    it('should throw for READ step (not implemented)', async () => {
      const step: any = {
        kind: StepKind.READ,
        table: 'user',
        where: { id: 1 },
      };

      const context = new StepContext(mockActor, {});
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not implemented');
    });

    it('should throw for INSERT step (not implemented)', async () => {
      const step: any = {
        kind: StepKind.INSERT,
        table: 'user',
        values: { name: 'test' },
      };

      const context = new StepContext(mockActor, {});
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not implemented');
    });

    it('should throw for HOOK step (not implemented)', async () => {
      const step: any = {
        kind: StepKind.HOOK,
        name: 'bcrypt_hash',
        input: { password: 'secret' },
      };

      const context = new StepContext(mockActor, {});
      const result = await stepRunner.executeStep(step, context, mockQueryRunner);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not implemented');
    });
  });
});
