export type DestinationKey = string;

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
};
