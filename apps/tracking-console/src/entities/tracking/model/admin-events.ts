export type DeliveryStatus = 'pending' | 'retrying' | 'failed' | 'delivered';

export interface DeliveryState {
  destination: string;
  status: DeliveryStatus;
  attemptCount: number;
  updatedAt: string;
  lastErrorMessage: string | null;
}

export interface AdminEventItem {
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
  deliveries: DeliveryState[];
  deliveryOverallStatus: 'queued' | 'success' | 'failed';
}

export type EventSortField = 'createdAt' | 'eventTimestamp' | 'eventName' | 'source' | 'deliveryOverallStatus';
export type SortDirection = 'asc' | 'desc';

export interface AdminEventsQueryInput {
  limit?: number;
  offset?: number;
  eventId?: string;
  eventName?: string;
  source?: string;
  destination?: string;
  deliveryStatus?: 'queued' | 'success' | 'failed' | 'all';
  from?: string;
  to?: string;
  sortBy?: EventSortField;
  sortDirection?: SortDirection;
}

export interface AdminEventsResponse {
  status: 'ok';
  paging: {
    limit: number;
    offset: number;
    total: number;
  };
  items: AdminEventItem[];
}

export interface DeliveryTimelineEntry {
  destination: string;
  status: DeliveryState['status'];
  attemptCount: number;
  updatedAt: string;
  lastErrorMessage: string | null;
}

export interface AdminEventDetail extends AdminEventItem {
  payload: Record<string, unknown>;
  deliveryTimeline: DeliveryTimelineEntry[];
}

export interface AdminEventDetailResponse {
  status: 'ok';
  item: AdminEventDetail;
}

export interface ReplayEventResponse {
  status: 'ok';
  event: AdminEventDetail;
  replayedDestinations: string[];
}
