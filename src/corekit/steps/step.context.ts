import { Actor } from '../types/actor.type';

/**
 * StepContext for workflow execution
 * Based on corekit.foundation.v1.yml (lines 156-160)
 *
 * Maintains state across workflow steps
 */

/**
 * Step execution context
 *
 * Stores:
 * - actor: Who is executing the workflow
 * - input: Original request input
 * - state: Accumulated state from previous steps (e.g., auto_inc IDs, intermediate values)
 */
export class StepContext {
  constructor(
    public readonly actor: Actor,
    public readonly input: Record<string, any>,
    public readonly state: Record<string, any> = {},
  ) {}

  /**
   * Get value from context (checks state, then input)
   */
  get(key: string): any {
    // First check state (results from previous steps)
    if (this.state.hasOwnProperty(key)) {
      return this.state[key];
    }

    // Then check input (original request)
    if (this.input.hasOwnProperty(key)) {
      return this.input[key];
    }

    // Return undefined if not found
    return undefined;
  }

  /**
   * Set value in state
   */
  set(key: string, value: any): void {
    this.state[key] = value;
  }

  /**
   * Check if key exists in context
   */
  has(key: string): boolean {
    return (
      this.state.hasOwnProperty(key) || this.input.hasOwnProperty(key)
    );
  }

  /**
   * Resolve expression using context
   * Handles references like "user_id", "request.phone_e164", "account_id"
   *
   * @param expr Expression to resolve (e.g., "user_id", "request.email")
   * @returns Resolved value
   */
  resolve(expr: string): any {
    // Handle special functions
    if (expr === 'auto_inc()') {
      // This should be handled by the database, not here
      return null;
    }

    // Handle request.field syntax
    if (expr.startsWith('request.')) {
      const field = expr.substring('request.'.length);
      return this.input[field];
    }

    // Handle simple field reference (check state first, then input)
    return this.get(expr);
  }

  /**
   * Evaluate boolean expression
   * Simple implementation - in production, use a proper expression evaluator
   *
   * @param expr Boolean expression (e.g., "status == 'active'")
   * @returns Boolean result
   */
  evaluateCondition(expr: string): boolean {
    // This is a simplified implementation
    // In production, use a proper expression parser/evaluator

    // Handle == operator
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map((s) => s.trim());
      const leftValue = this.resolve(left);
      const rightValue = right.replace(/['"]/g, ''); // Remove quotes
      return leftValue == rightValue;
    }

    // Handle != operator
    if (expr.includes('!=')) {
      const [left, right] = expr.split('!=').map((s) => s.trim());
      const leftValue = this.resolve(left);
      const rightValue = right.replace(/['"]/g, '');
      return leftValue != rightValue;
    }

    // Handle > operator
    if (expr.includes('>')) {
      const [left, right] = expr.split('>').map((s) => s.trim());
      const leftValue = Number(this.resolve(left));
      const rightValue = Number(right);
      return leftValue > rightValue;
    }

    // Handle >= operator
    if (expr.includes('>=')) {
      const [left, right] = expr.split('>=').map((s) => s.trim());
      const leftValue = Number(this.resolve(left));
      const rightValue = Number(right);
      return leftValue >= rightValue;
    }

    // Handle < operator
    if (expr.includes('<')) {
      const [left, right] = expr.split('<').map((s) => s.trim());
      const leftValue = Number(this.resolve(left));
      const rightValue = Number(right);
      return leftValue < rightValue;
    }

    // Handle <= operator
    if (expr.includes('<=')) {
      const [left, right] = expr.split('<=').map((s) => s.trim());
      const leftValue = Number(this.resolve(left));
      const rightValue = Number(right);
      return leftValue <= rightValue;
    }

    // Handle len() function
    if (expr.includes('len(')) {
      const match = expr.match(/len\(([^)]+)\)\s*([><=!]+)\s*(\d+)/);
      if (match) {
        const field = match[1].trim();
        const operator = match[2];
        const value = Number(match[3]);
        const fieldValue = this.resolve(field);
        const length = fieldValue ? fieldValue.length : 0;

        switch (operator) {
          case '>=':
            return length >= value;
          case '>':
            return length > value;
          case '<=':
            return length <= value;
          case '<':
            return length < value;
          case '==':
            return length == value;
          case '!=':
            return length != value;
          default:
            return false;
        }
      }
    }

    // Default: try to resolve as boolean value
    const value = this.resolve(expr);
    return Boolean(value);
  }

  /**
   * Create a new context with additional state
   */
  withState(additionalState: Record<string, any>): StepContext {
    return new StepContext(this.actor, this.input, {
      ...this.state,
      ...additionalState,
    });
  }

  /**
   * Clone the context
   */
  clone(): StepContext {
    return new StepContext(this.actor, { ...this.input }, { ...this.state });
  }
}
