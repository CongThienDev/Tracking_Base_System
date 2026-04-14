export type DeliveryRowStatus = 'pending' | 'retrying' | 'failed' | 'delivered';

export type DeliveryRow = {
  destination: string;
  status: DeliveryRowStatus;
  attemptCount: number;
  updatedAt: string;
  lastErrorMessage: string | null;
};

export type DeliveryRowDetail = DeliveryRow & {
  lastErrorCode: string | null;
  lastResponseSummary: Record<string, unknown> | null;
  deliveredAt: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventListItem = {
  eventId: string;
  eventName: string;
  eventTimestamp: string;
  sessionId: string;
  source: string | null;
  campaign: string | null;
  routeStatus: string;
  eventValue: number | null;
  currency: string | null;
  createdAt: string;
  deliveries: DeliveryRow[];
  deliveryOverallStatus: 'queued' | 'success' | 'failed';
};

export type ListEventsResult = {
  total: number;
  items: EventListItem[];
};

export type EventDetail = EventListItem & {
  userId: string | null;
  emailHash: string | null;
  anonymousId: string | null;
  adId: string | null;
  gclid: string | null;
  ttclid: string | null;
  customerType: string | null;
  payload: Record<string, unknown>;
  ingestIp: string | null;
  userAgent: string | null;
  updatedAt: string;
  deliveries: DeliveryRowDetail[];
};

export type ListEventsInput = {
  limit: number;
  offset: number;
  eventName?: string;
  source?: string;
  deliveryOverallStatus?: 'queued' | 'success' | 'failed';
  from?: string;
  to?: string;
  destination?: string;
  eventId?: string;
  eventIdLike?: string;
  sortBy?: 'created_at' | 'event_timestamp' | 'event_name';
  sortOrder?: 'asc' | 'desc';
};

export type ReplayEventDeliveriesResult = {
  eventId: string;
  destinations: string[];
};

export interface EventReadRepository {
  listRecentEvents(input: ListEventsInput): Promise<ListEventsResult>;
  getEventById(eventId: string): Promise<EventDetail | null>;
  replayEventDeliveries(input: { eventId: string; destinations?: string[] }): Promise<ReplayEventDeliveriesResult>;
}
