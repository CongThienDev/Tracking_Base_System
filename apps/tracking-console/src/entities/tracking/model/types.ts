export type ServiceStatus = 'ok' | 'ready' | 'not_ready' | 'unknown';

export interface HealthResponse {
  status: ServiceStatus;
}

export interface MetricsResponse {
  status: 'ok' | 'error';
  counters?: Record<string, number>;
}

export interface TrackPayload {
  event_id?: string;
  event_name: string;
  timestamp?: string;
  user?: {
    user_id?: string;
    email?: string;
    email_hash?: string;
    anonymous_id?: string;
  };
  session: {
    session_id: string;
    source?: string;
    campaign?: string;
    ad_id?: string;
    gclid?: string;
    ttclid?: string;
  };
  event_data?: Record<string, unknown>;
  context?: {
    page_url?: string;
    referrer?: string;
  };
}

export interface TrackResponse {
  status: 'ok' | 'error';
  event_id?: string;
  deduplicated?: boolean;
  code?: string;
  message?: string;
}
