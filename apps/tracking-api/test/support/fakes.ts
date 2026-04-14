import { vi } from 'vitest';
import type { DeliveryJobDispatcher } from '../../src/services/delivery-job-dispatcher.js';
import type { EventListItem, EventReadRepository, ListEventsResult } from '../../src/types/admin-events.js';
import type { EventRepository, InsertEventResult, NormalizedTrackEvent } from '../../src/types/track.js';

export class InMemoryEventRepository implements EventRepository {
  private readonly events = new Map<string, NormalizedTrackEvent>();

  async insertIfNotExists(event: NormalizedTrackEvent): Promise<InsertEventResult> {
    if (this.events.has(event.eventId)) {
      return { inserted: false };
    }

    this.events.set(event.eventId, event);
    return { inserted: true };
  }

  count(): number {
    return this.events.size;
  }
}

export class RecordingDeliveryJobDispatcher implements DeliveryJobDispatcher {
  private readonly enqueuedEvents: NormalizedTrackEvent[] = [];

  constructor(private readonly options: { fail?: boolean } = {}) {}

  async enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void> {
    this.enqueuedEvents.push(event);

    if (this.options.fail) {
      throw new Error('delivery queue unavailable');
    }
  }

  count(): number {
    return this.enqueuedEvents.length;
  }

  lastEvent(): NormalizedTrackEvent | null {
    return this.enqueuedEvents.at(-1) ?? null;
  }
}

export class InMemoryEventReadRepository implements EventReadRepository {
  constructor(private readonly result: ListEventsResult = { total: 0, items: [] }) {}

  async listRecentEvents(): Promise<ListEventsResult> {
    return this.result;
  }
}

export function createEventListItem(overrides: Partial<EventListItem> = {}): EventListItem {
  return {
    eventId: 'evt-001',
    eventName: 'purchase',
    eventTimestamp: '2026-04-14T00:00:00.000Z',
    sessionId: 'sess-001',
    source: 'meta',
    campaign: 'spring_sale',
    routeStatus: 'pending',
    eventValue: 49.99,
    currency: 'USD',
    createdAt: '2026-04-14T00:00:00.000Z',
    deliveries: [],
    deliveryOverallStatus: 'queued',
    ...overrides
  };
}

export function createLoggerSpy() {
  return {
    error: vi.fn()
  };
}
