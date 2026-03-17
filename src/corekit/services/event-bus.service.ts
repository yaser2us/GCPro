import { Injectable, Logger } from '@nestjs/common';

/**
 * Event Bus Service
 * Routes events to registered consumers
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly consumers = new Map<string, Function[]>();

  /**
   * Register a consumer for an event
   */
  subscribe(eventName: string, handler: Function): void {
    if (!this.consumers.has(eventName)) {
      this.consumers.set(eventName, []);
    }
    this.consumers.get(eventName)!.push(handler);
    this.logger.log(`Registered consumer for event: ${eventName}`);
  }

  /**
   * Publish an event to all registered consumers
   */
  async publish(eventName: string, payload: any): Promise<void> {
    const handlers = this.consumers.get(eventName) || [];

    if (handlers.length === 0) {
      this.logger.warn(`No consumers registered for event: ${eventName}`);
      return;
    }

    this.logger.log(`Publishing ${eventName} to ${handlers.length} consumer(s)`);

    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        this.logger.error(
          `Error in consumer for ${eventName}: ${error.message}`,
          error.stack,
        );
        throw error; // Re-throw to mark event as failed
      }
    }
  }

  /**
   * Get registered events (for debugging)
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.consumers.keys());
  }
}
