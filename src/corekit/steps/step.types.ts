/**
 * Step type definitions for workflow orchestration
 * Based on corekit.foundation.v1.yml (lines 58-127)
 *
 * These are the allowed workflow step primitives used by generated command services.
 */

/**
 * Base step interface
 */
export interface BaseStep {
  kind: StepKind;
}

/**
 * Step kind enum - matches foundation spec (lines 63-125)
 */
export enum StepKind {
  READ = 'read',
  INSERT = 'insert',
  UPDATE = 'update',
  UPSERT = 'upsert',
  COUNT = 'count',
  GUARD = 'guard',
  WHEN = 'when',
  OUTBOX_EMIT = 'outbox_emit',
  HOOK = 'hook',
  CALL = 'call',
}

/**
 * READ step - read rows from database (lines 65-69)
 */
export interface ReadStep extends BaseStep {
  kind: StepKind.READ;
  table: string;
  where: Record<string, any>;
  select?: string[]; // Optional: specify columns
  as?: string; // Optional: alias for storing result in context
}

/**
 * INSERT step - insert row into table (lines 71-75)
 */
export interface InsertStep extends BaseStep {
  kind: StepKind.INSERT;
  table: string;
  values: Record<string, any>;
  as?: string; // Optional: alias for storing generated ID
}

/**
 * UPDATE step - update rows (lines 77-82)
 */
export interface UpdateStep extends BaseStep {
  kind: StepKind.UPDATE;
  table: string;
  set: Record<string, any>;
  where: Record<string, any>;
}

/**
 * UPSERT step - insert or update using unique key (lines 84-89)
 */
export interface UpsertStep extends BaseStep {
  kind: StepKind.UPSERT;
  table: string;
  values: Record<string, any>;
  conflict_key: string | string[]; // Unique key for conflict detection
  update_on_conflict?: Record<string, any>; // Values to update on conflict
}

/**
 * COUNT step - count rows for guard conditions (lines 91-95)
 */
export interface CountStep extends BaseStep {
  kind: StepKind.COUNT;
  table: string;
  where: Record<string, any>;
  as?: string; // Optional: alias for storing count in context
}

/**
 * GUARD step - enforce condition (lines 97-101)
 */
export interface GuardStep extends BaseStep {
  kind: StepKind.GUARD;
  expr: string; // Expression to evaluate
  error_code: string; // Error code if guard fails
  error_message?: string; // Optional error message
}

/**
 * WHEN step - conditional branch (lines 103-107)
 */
export interface WhenStep extends BaseStep {
  kind: StepKind.WHEN;
  condition: string; // Condition expression
  steps: Step[]; // Steps to execute if condition is true
  else_steps?: Step[]; // Optional: steps to execute if condition is false
}

/**
 * OUTBOX_EMIT step - emit outbox event (lines 109-114)
 */
export interface OutboxEmitStep extends BaseStep {
  kind: StepKind.OUTBOX_EMIT;
  event: string; // Event name
  aggregate_type: string; // Aggregate type
  aggregate_id: string; // Aggregate ID (can be expression like 'user_id')
  payload?: Record<string, any>; // Event payload
}

/**
 * HOOK step - call local extension logic (lines 116-119)
 */
export interface HookStep extends BaseStep {
  kind: StepKind.HOOK;
  name: string; // Hook name (e.g., 'bcrypt_hash')
  input?: Record<string, any>; // Input parameters
  as?: string; // Optional: alias for storing result in context
}

/**
 * CALL step - invoke another plugin command API (lines 121-125)
 */
export interface CallStep extends BaseStep {
  kind: StepKind.CALL;
  service: string; // Service name (e.g., 'Wallet')
  command: string; // Command name (e.g., 'CreditReward')
  input?: Record<string, any>; // Input parameters
  as?: string; // Optional: alias for storing result in context
}

/**
 * Union type of all step types
 */
export type Step =
  | ReadStep
  | InsertStep
  | UpdateStep
  | UpsertStep
  | CountStep
  | GuardStep
  | WhenStep
  | OutboxEmitStep
  | HookStep
  | CallStep;

/**
 * Workflow definition
 */
export interface Workflow {
  name: string;
  steps: Step[];
}

/**
 * Step execution result
 */
export interface StepResult {
  success: boolean;
  data?: any;
  error?: Error;
}
