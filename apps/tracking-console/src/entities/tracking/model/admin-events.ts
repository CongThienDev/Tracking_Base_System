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

export interface AdminEventsResponse {
  status: 'ok';
  paging: {
    limit: number;
    offset: number;
    total: number;
  };
  items: AdminEventItem[];
}
