import { getJson, postJson } from './http-client';
import type { HealthResponse, MetricsResponse, TrackPayload, TrackResponse } from '../../entities/tracking/model/types';
import type { AdminEventsResponse } from '../../entities/tracking/model/admin-events';

export const trackingApi = {
  health: () => getJson<HealthResponse>('/health'),
  ready: () => getJson<HealthResponse>('/ready'),
  metrics: () => getJson<MetricsResponse>('/metrics'),
  track: (payload: TrackPayload) => postJson<TrackResponse>('/track', payload),
  listRecentEvents: (input?: {
    limit?: number;
    offset?: number;
    eventName?: string;
    source?: string;
    deliveryStatus?: 'queued' | 'success' | 'failed' | 'all';
  }) => {
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset)
    });

    if (input?.eventName && input.eventName.trim().length > 0) {
      query.set('event_name', input.eventName.trim());
    }

    if (input?.source && input.source.trim().length > 0) {
      query.set('source', input.source.trim());
    }

    if (input?.deliveryStatus && input.deliveryStatus !== 'all') {
      query.set('delivery_status', input.deliveryStatus);
    }

    return getJson<AdminEventsResponse>(`/admin/events?${query.toString()}`);
  }
};
