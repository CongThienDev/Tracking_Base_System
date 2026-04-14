import { getJson, postJson } from './http-client';
import type { HealthResponse, MetricsResponse, TrackPayload, TrackResponse } from '../../entities/tracking/model/types';
import type {
  AdminEventDetailResponse,
  AdminEventDetail,
  AdminEventsQueryInput,
  AdminEventsResponse,
  ReplayEventResponse
} from '../../entities/tracking/model/admin-events';

function setIfPresent(query: URLSearchParams, key: string, value?: string | number | null): void {
  if (value === undefined || value === null) {
    return;
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return;
  }

  query.set(key, stringValue);
}

export const trackingApi = {
  health: () => getJson<HealthResponse>('/health'),
  ready: () => getJson<HealthResponse>('/ready'),
  metrics: () => getJson<MetricsResponse>('/metrics'),
  track: (payload: TrackPayload) => postJson<TrackResponse>('/track', payload),
  listRecentEvents: (input?: AdminEventsQueryInput) => {
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset)
    });

    setIfPresent(query, 'event_id', input?.eventId);
    setIfPresent(query, 'event_name', input?.eventName);
    setIfPresent(query, 'source', input?.source);
    setIfPresent(query, 'destination', input?.destination);
    if (input?.deliveryStatus && input.deliveryStatus !== 'all') {
      query.set('delivery_status', input.deliveryStatus);
    }
    setIfPresent(query, 'from', input?.from);
    setIfPresent(query, 'to', input?.to);
    if (input?.sortBy) {
      const sortByMap: Record<NonNullable<AdminEventsQueryInput['sortBy']>, string> = {
        createdAt: 'created_at',
        eventTimestamp: 'event_timestamp',
        eventName: 'event_name',
        source: 'created_at',
        deliveryOverallStatus: 'created_at'
      };
      setIfPresent(query, 'sort_by', sortByMap[input.sortBy]);
    }

    setIfPresent(query, 'sort_order', input?.sortDirection);

    return getJson<AdminEventsResponse>(`/admin/events?${query.toString()}`);
  },
  getEventDetail: async (eventId: string) => {
    const response = await getJson<{ status: 'ok'; event: AdminEventDetail }>(
      `/admin/events/${encodeURIComponent(eventId)}`
    );
    return {
      status: response.status,
      item: {
        ...response.event,
        deliveryTimeline: response.event.deliveries
      }
    } satisfies AdminEventDetailResponse;
  },
  replayEvent: (input: { eventId: string; destination?: string }) =>
    postJson<ReplayEventResponse>(`/admin/events/${encodeURIComponent(input.eventId)}/replay`, {
      destinations: input.destination ? [input.destination] : undefined
    })
};
