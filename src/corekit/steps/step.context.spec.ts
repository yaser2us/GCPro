import { StepContext } from './step.context';
import { Actor } from '../types/actor.type';

describe('StepContext', () => {
  const mockActor: Actor = {
    actor_user_id: '123',
    actor_role: 'ADMIN',
    correlation_id: 'corr-123',
    causation_id: 'cause-123',
  };

  const mockInput = {
    phone_e164: '+60123456789',
    email: 'user@example.com',
    amount: 100,
  };

  describe('constructor', () => {
    it('should create context with actor and input', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.actor).toBe(mockActor);
      expect(context.input).toBe(mockInput);
      expect(context.state).toEqual({});
    });

    it('should accept initial state', () => {
      const initialState = { user_id: 42 };
      const context = new StepContext(mockActor, mockInput, initialState);

      expect(context.state).toEqual(initialState);
    });
  });

  describe('get', () => {
    it('should get value from state first', () => {
      const context = new StepContext(mockActor, mockInput);
      context.set('amount', 200);

      // State value (200) should override input value (100)
      expect(context.get('amount')).toBe(200);
    });

    it('should get value from input if not in state', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.get('email')).toBe('user@example.com');
    });

    it('should return undefined if key not found', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.get('nonexistent')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value in state', () => {
      const context = new StepContext(mockActor, mockInput);
      context.set('user_id', 42);

      expect(context.state.user_id).toBe(42);
    });

    it('should overwrite existing state value', () => {
      const context = new StepContext(mockActor, mockInput);
      context.set('user_id', 42);
      context.set('user_id', 99);

      expect(context.state.user_id).toBe(99);
    });
  });

  describe('has', () => {
    it('should return true for value in state', () => {
      const context = new StepContext(mockActor, mockInput);
      context.set('user_id', 42);

      expect(context.has('user_id')).toBe(true);
    });

    it('should return true for value in input', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.has('email')).toBe(true);
    });

    it('should return false for nonexistent key', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.has('nonexistent')).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve simple field from state', () => {
      const context = new StepContext(mockActor, mockInput);
      context.set('user_id', 42);

      expect(context.resolve('user_id')).toBe(42);
    });

    it('should resolve simple field from input', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.resolve('email')).toBe('user@example.com');
    });

    it('should resolve request.field syntax', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.resolve('request.phone_e164')).toBe('+60123456789');
      expect(context.resolve('request.amount')).toBe(100);
    });

    it('should return null for auto_inc()', () => {
      const context = new StepContext(mockActor, mockInput);

      expect(context.resolve('auto_inc()')).toBeNull();
    });
  });

  describe('evaluateCondition', () => {
    describe('== operator', () => {
      it('should evaluate equality with string', () => {
        const context = new StepContext(mockActor, { status: 'active' });

        expect(context.evaluateCondition("status == 'active'")).toBe(true);
        expect(context.evaluateCondition("status == 'inactive'")).toBe(false);
      });

      it('should evaluate equality with number', () => {
        const context = new StepContext(mockActor, { count: 5 });

        expect(context.evaluateCondition('count == 5')).toBe(true);
        expect(context.evaluateCondition('count == 10')).toBe(false);
      });
    });

    describe('!= operator', () => {
      it('should evaluate inequality', () => {
        const context = new StepContext(mockActor, { status: 'active' });

        expect(context.evaluateCondition("status != 'inactive'")).toBe(true);
        expect(context.evaluateCondition("status != 'active'")).toBe(false);
      });
    });

    describe('> operator', () => {
      it('should evaluate greater than', () => {
        const context = new StepContext(mockActor, { amount: 100 });

        expect(context.evaluateCondition('amount > 50')).toBe(true);
        expect(context.evaluateCondition('amount > 100')).toBe(false);
        expect(context.evaluateCondition('amount > 150')).toBe(false);
      });
    });

    describe('>= operator', () => {
      it('should evaluate greater than or equal', () => {
        const context = new StepContext(mockActor, { amount: 100 });

        expect(context.evaluateCondition('amount >= 50')).toBe(true);
        expect(context.evaluateCondition('amount >= 100')).toBe(true);
        expect(context.evaluateCondition('amount >= 150')).toBe(false);
      });
    });

    describe('< operator', () => {
      it('should evaluate less than', () => {
        const context = new StepContext(mockActor, { amount: 100 });

        expect(context.evaluateCondition('amount < 150')).toBe(true);
        expect(context.evaluateCondition('amount < 100')).toBe(false);
        expect(context.evaluateCondition('amount < 50')).toBe(false);
      });
    });

    describe('<= operator', () => {
      it('should evaluate less than or equal', () => {
        const context = new StepContext(mockActor, { amount: 100 });

        expect(context.evaluateCondition('amount <= 150')).toBe(true);
        expect(context.evaluateCondition('amount <= 100')).toBe(true);
        expect(context.evaluateCondition('amount <= 50')).toBe(false);
      });
    });

    describe('len() function', () => {
      it('should evaluate length >= N', () => {
        const context = new StepContext(mockActor, { password: 'password123' });

        expect(context.evaluateCondition('len(password) >= 8')).toBe(true);
        expect(context.evaluateCondition('len(password) >= 15')).toBe(false);
      });

      it('should evaluate length > N', () => {
        const context = new StepContext(mockActor, { password: 'password123' });

        expect(context.evaluateCondition('len(password) > 8')).toBe(true);
        expect(context.evaluateCondition('len(password) > 20')).toBe(false);
      });

      it('should evaluate length == N', () => {
        const context = new StepContext(mockActor, { code: 'ABC' });

        expect(context.evaluateCondition('len(code) == 3')).toBe(true);
        expect(context.evaluateCondition('len(code) == 5')).toBe(false);
      });

      it('should handle null/undefined values', () => {
        const context = new StepContext(mockActor, { empty: null });

        expect(context.evaluateCondition('len(empty) == 0')).toBe(true);
      });
    });

    describe('boolean value resolution', () => {
      it('should evaluate boolean field', () => {
        const context = new StepContext(mockActor, { is_active: true });

        expect(context.evaluateCondition('is_active')).toBe(true);
      });

      it('should evaluate truthy/falsy values', () => {
        const context1 = new StepContext(mockActor, { value: 1 });
        expect(context1.evaluateCondition('value')).toBe(true);

        const context2 = new StepContext(mockActor, { value: 0 });
        expect(context2.evaluateCondition('value')).toBe(false);

        const context3 = new StepContext(mockActor, { value: '' });
        expect(context3.evaluateCondition('value')).toBe(false);
      });
    });
  });

  describe('withState', () => {
    it('should create new context with additional state', () => {
      const context1 = new StepContext(mockActor, mockInput);
      context1.set('user_id', 42);

      const context2 = context1.withState({ account_id: 99 });

      // Original context unchanged
      expect(context1.get('account_id')).toBeUndefined();
      expect(context1.get('user_id')).toBe(42);

      // New context has both values
      expect(context2.get('user_id')).toBe(42);
      expect(context2.get('account_id')).toBe(99);
    });

    it('should preserve actor and input', () => {
      const context1 = new StepContext(mockActor, mockInput);
      const context2 = context1.withState({ user_id: 42 });

      expect(context2.actor).toBe(mockActor);
      expect(context2.input).toBe(mockInput);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const context1 = new StepContext(mockActor, mockInput);
      context1.set('user_id', 42);

      const context2 = context1.clone();

      // Modify original
      context1.set('user_id', 99);

      // Clone unchanged
      expect(context2.get('user_id')).toBe(42);
    });

    it('should preserve actor reference', () => {
      const context1 = new StepContext(mockActor, mockInput);
      const context2 = context1.clone();

      expect(context2.actor).toBe(mockActor);
    });

    it('should create new input object', () => {
      const context1 = new StepContext(mockActor, mockInput);
      const context2 = context1.clone();

      // Input should be copied, not referenced
      context1.input.amount = 999;
      expect(context2.input.amount).toBe(100);
    });
  });
});
