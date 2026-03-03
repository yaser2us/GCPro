/**
 * Actor represents the user/system performing an action
 * Based on corekit.v1.yaml Actor type definition
 */
export interface Actor {
  actor_user_id: string; // UUID of the acting user
  actor_role: string; // Role of the actor (e.g., 'ADMIN', 'USER', 'SYSTEM')
  correlation_id?: string; // For tracing requests across services
  causation_id?: string; // ID of the event/command that caused this action
}
