export type DeliveryRowStatus = 'pending' | 'retrying' | 'failed' | 'delivered';

export type DeliveryRow = {
  destination: string;
  status: DeliveryRowStatus;
  attemptCount: number;
  updatedAt: string;
  lastErrorMessage: string | null;
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

export interface EventReadRepository {
  listRecentEvents(input: {
    limit: number;
    offset: number;
    eventName?: string;
    source?: string;
    deliveryOverallStatus?: 'queued' | 'success' | 'failed';
  }): Promise<ListEventsResult>;
}
