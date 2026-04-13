export type DestinationKey = string;

export type CanonicalEventRecord = {
  eventId: string;
  eventName: string;
  eventTimestamp: Date;
  emailHash: string | null;
  ingestIp: string | null;
  userAgent: string | null;
  gclid: string | null;
  ttclid: string | null;
  eventValue: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
};

export type DeliveryJobData = {
  eventId: string;
  destination: DestinationKey;
  requestedAt: string;
  payloadVersion?: number;
};

export type DeliveryJobEnvelope = {
  id: string | null;
  queueName: string;
  attemptsMade: number;
  attempts: number;
  data: DeliveryJobData;
  event?: CanonicalEventRecord;
};
