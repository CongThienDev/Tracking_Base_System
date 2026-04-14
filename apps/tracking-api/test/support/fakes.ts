import { vi } from 'vitest';
import type { DeliveryJobDispatcher } from '../../src/services/delivery-job-dispatcher.js';
import type {
  DeliveryRowDetail,
  EventDetail,
  EventListItem,
  EventReadRepository,
  ListEventsInput,
  ListEventsResult,
  ReplayEventDeliveriesResult
} from '../../src/types/admin-events.js';
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
  private readonly replayRequests: Array<{
    eventId: string;
    destinations: readonly string[];
    replayTag?: string;
  }> = [];

  constructor(private readonly options: { fail?: boolean } = {}) {}

  async enqueueDeliveryJob(event: NormalizedTrackEvent): Promise<void> {
    this.enqueuedEvents.push(event);

    if (this.options.fail) {
      throw new Error('delivery queue unavailable');
    }
  }

  async enqueueDeliveryJobs(input: {
    eventId: string;
    destinations: readonly string[];
    replayTag?: string;
  }): Promise<void> {
    this.replayRequests.push(input);

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

  replayCount(): number {
    return this.replayRequests.length;
  }

  lastReplayRequest(): {
    eventId: string;
    destinations: readonly string[];
    replayTag?: string;
  } | null {
    return this.replayRequests.at(-1) ?? null;
  }
}

type InMemoryEventReadRepositoryOptions = {
  listResult?: ListEventsResult;
  eventById?: EventDetail | null;
  replayResult?: ReplayEventDeliveriesResult;
};

export class InMemoryEventReadRepository implements EventReadRepository {
  public lastListInput: ListEventsInput | null = null;
  public lastGetEventId: string | null = null;
  public lastReplayInput: { eventId: string; destinations?: string[] } | null = null;

  constructor(private readonly options: InMemoryEventReadRepositoryOptions = {}) {}

  async listRecentEvents(input: ListEventsInput): Promise<ListEventsResult> {
    this.lastListInput = input;
    return this.options.listResult ?? { total: 0, items: [] };
  }

  async getEventById(eventId: string): Promise<EventDetail | null> {
    this.lastGetEventId = eventId;
    return this.options.eventById ?? null;
  }

  async replayEventDeliveries(input: { eventId: string; destinations?: string[] }): Promise<ReplayEventDeliveriesResult> {
    this.lastReplayInput = input;
    if (this.options.replayResult) {
      return this.options.replayResult;
    }

    return {
      eventId: input.eventId,
      destinations: input.destinations ?? []
    };
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

export function createEventDetail(overrides: Partial<EventDetail> = {}): EventDetail {
  const deliveries: DeliveryRowDetail[] = [
    {
      destination: 'meta',
      status: 'failed',
      attemptCount: 2,
      updatedAt: '2026-04-14T00:02:00.000Z',
      lastErrorCode: 'timeout',
      lastErrorMessage: 'meta timeout',
      lastResponseSummary: { worker: 'router-worker-1' },
      nextAttemptAt: '2026-04-14T00:03:00.000Z',
      deliveredAt: null,
      createdAt: '2026-04-14T00:01:00.000Z'
    }
  ];

  return {
    ...createEventListItem({
      deliveries,
      deliveryOverallStatus: 'failed'
    }),
    userId: 'user-001',
    emailHash: 'hash-001',
    anonymousId: 'anon-001',
    adId: 'ad-001',
    gclid: 'gclid-001',
    ttclid: 'ttclid-001',
    customerType: 'consumer',
    payload: {
      value: 49.99,
      currency: 'USD'
    },
    ingestIp: '203.0.113.10',
    userAgent: 'vitest-agent',
    updatedAt: '2026-04-14T00:01:30.000Z',
    ...overrides
  };
}

export function createLoggerSpy() {
  return {
    error: vi.fn()
  };
}
