import { Test, TestingModule } from '@nestjs/testing';
import { QueryRunner } from 'typeorm';
import { OutboxService } from './outbox.service';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { OutboxEventEnvelope } from '../types/outbox-envelope.type';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockManager: any;

  beforeEach(async () => {
    mockManager = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockQueryRunner = {
      manager: mockManager,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('enqueue', () => {
    const baseEnvelope: OutboxEventEnvelope = {
      event_name: 'USER_CREATED',
      event_version: 1,
      aggregate_type: 'USER',
      aggregate_id: '123',
      actor_user_id: 'actor-456',
      occurred_at: new Date('2024-01-01T00:00:00Z'),
      correlation_id: 'corr-789',
      causation_id: 'cause-101',
      payload: {
        user_id: 123,
        email: 'user@example.com',
      },
    };

    it('should save outbox event', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      expect(mockManager.save).toHaveBeenCalledWith(
        OutboxEvent,
        expect.any(OutboxEvent),
      );
    });

    it('should map envelope fields to DDL schema', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;

      expect(savedEvent.topic).toBe('USER');
      expect(savedEvent.event_type).toBe('USER_CREATED');
      expect(savedEvent.aggregate_type).toBe('USER');
      expect(savedEvent.aggregate_id).toBe('123');
      expect(savedEvent.occurred_at).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(savedEvent.request_id).toBe('corr-789');
      expect(savedEvent.status).toBe('new');
      expect(savedEvent.attempts).toBe(0);
    });

    it('should store full envelope in payload_json', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;

      expect(savedEvent.payload_json).toEqual({
        user_id: 123,
        email: 'user@example.com',
        _meta: {
          event_name: 'USER_CREATED',
          event_version: 1,
          actor_user_id: 'actor-456',
          correlation_id: 'corr-789',
          causation_id: 'cause-101',
        },
      });
    });

    it('should handle dedupe_key', async () => {
      const envelopeWithDedupe: OutboxEventEnvelope = {
        ...baseEnvelope,
        dedupe_key: 'unique-key-123',
      };

      await service.enqueue(envelopeWithDedupe, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.idempotency_key).toBe('unique-key-123');
    });

    it('should set idempotency_key to null if dedupe_key not provided', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.idempotency_key).toBeNull();
    });

    it('should handle different event types', async () => {
      const envelope: OutboxEventEnvelope = {
        ...baseEnvelope,
        event_name: 'MISSION_COMPLETED',
        aggregate_type: 'MISSION',
        aggregate_id: '999',
      };

      await service.enqueue(envelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.event_type).toBe('MISSION_COMPLETED');
      expect(savedEvent.aggregate_type).toBe('MISSION');
      expect(savedEvent.aggregate_id).toBe('999');
    });

    it('should handle complex payload', async () => {
      const envelope: OutboxEventEnvelope = {
        ...baseEnvelope,
        payload: {
          user_id: 123,
          account_id: 456,
          profile: {
            name: 'John Doe',
            age: 30,
          },
          roles: ['user', 'admin'],
        },
      };

      await service.enqueue(envelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.payload_json).toMatchObject({
        user_id: 123,
        account_id: 456,
        profile: {
          name: 'John Doe',
          age: 30,
        },
        roles: ['user', 'admin'],
      });
    });

    it('should preserve metadata in payload_json', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.payload_json._meta).toBeDefined();
      expect(savedEvent.payload_json._meta.event_name).toBe('USER_CREATED');
      expect(savedEvent.payload_json._meta.event_version).toBe(1);
      expect(savedEvent.payload_json._meta.actor_user_id).toBe('actor-456');
    });

    it('should use query runner manager for saving', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      // Should use the manager from query runner (for transaction)
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('should handle empty payload', async () => {
      const envelope: OutboxEventEnvelope = {
        ...baseEnvelope,
        payload: {},
      };

      await service.enqueue(envelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1] as OutboxEvent;
      expect(savedEvent.payload_json).toMatchObject({
        _meta: expect.any(Object),
      });
    });

    it('should create new OutboxEvent instance', async () => {
      await service.enqueue(baseEnvelope, mockQueryRunner);

      const savedEvent = mockManager.save.mock.calls[0][1];
      expect(savedEvent).toBeInstanceOf(OutboxEvent);
    });
  });

  describe('getPendingEvents', () => {
    it('should return empty array', async () => {
      const result = await service.getPendingEvents();

      expect(result).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const result = await service.getPendingEvents(50);

      expect(result).toEqual([]);
    });
  });
});
