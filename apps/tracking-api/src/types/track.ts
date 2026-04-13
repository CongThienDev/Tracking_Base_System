export type TrackRequestPayload = {
  event_id?: string;
  event_name: string;
  timestamp?: string | number;
  user?: {
    user_id?: string | null;
    email?: string | null;
    email_hash?: string | null;
    anonymous_id?: string | null;
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
  context?: Record<string, unknown>;
};

export type NormalizedTrackEvent = {
  eventId: string;
  eventName: string;
  eventTimestamp: Date;
  userId: string | null;
  emailHash: string | null;
  anonymousId: string | null;
  sessionId: string;
  source: string | null;
  campaign: string | null;
  adId: string | null;
  gclid: string | null;
  ttclid: string | null;
  eventValue: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
  ingestIp: string | null;
  userAgent: string | null;
};

export type InsertEventResult = {
  inserted: boolean;
};

export interface EventRepository {
  insertIfNotExists(event: NormalizedTrackEvent): Promise<InsertEventResult>;
}
