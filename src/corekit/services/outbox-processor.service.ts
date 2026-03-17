import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { EventBusService } from './event-bus.service';

/**
 * Outbox Processor Service
 * Polls outbox_event table and delivers events to consumers
 *
 * Implements the Outbox Pattern for reliable event delivery
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Start processing on module initialization
   */
  onModuleInit() {
    this.startProcessing();
  }

  /**
   * Start the outbox processor
   * Polls every 2 seconds for new events
   */
  startProcessing() {
    if (this.intervalId) {
      this.logger.warn('Outbox processor already running');
      return;
    }

    this.logger.log('🚀 Starting outbox processor...');
    this.logger.log('📮 Polling interval: 2 seconds');

    // Process immediately on start
    this.processEvents();

    // Then poll every 2 seconds
    this.intervalId = setInterval(() => {
      this.processEvents();
    }, 2000);
  }

  /**
   * Stop the outbox processor
   */
  stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Outbox processor stopped');
    }
  }

  /**
   * Process pending events from outbox
   */
  private async processEvents() {
    if (this.isProcessing) {
      return; // Skip if already processing
    }

    this.isProcessing = true;

    try {
      // Fetch unprocessed events (status = 'new')
      const events = await this.outboxRepo.find({
        where: { status: 'new' },
        order: { created_at: 'ASC' },
        take: 10, // Process 10 events at a time
      });

      if (events.length === 0) {
        return; // No events to process
      }

      this.logger.log(`📦 Processing ${events.length} event(s)...`);

      for (const event of events) {
        await this.processEvent(event);
      }

    } catch (error) {
      this.logger.error(`Error processing outbox: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: OutboxEvent) {
    try {
      this.logger.log(`📨 Delivering event: ${event.event_type} (ID: ${event.id})`);

      // Extract payload and metadata
      const payload = { ...event.payload_json };
      delete payload._meta; // Remove metadata from payload

      // Add IDs from event to payload
      const eventPayload = {
        ...payload,
        ...payload._meta, // Include metadata fields
      };

      // Publish to event bus using event_type (which is the event_name)
      await this.eventBus.publish(event.event_type!, eventPayload);

      // Mark as published
      await this.outboxRepo.update(event.id, {
        status: 'published',
        attempts: event.attempts + 1,
      });

      this.logger.log(`✅ Event ${event.id} (${event.event_type}) published successfully`);

    } catch (error) {
      this.logger.error(
        `❌ Failed to process event ${event.id}: ${error.message}`,
        error.stack,
      );

      // Increment attempts
      await this.outboxRepo.update(event.id, {
        attempts: event.attempts + 1,
      });

      // If too many attempts, we could mark as failed or archived
      if (event.attempts >= 5) {
        this.logger.error(`Event ${event.id} failed after ${event.attempts} attempts`);
        await this.outboxRepo.update(event.id, {
          status: 'archived',
        });
      }
    }
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
    };
  }
}
