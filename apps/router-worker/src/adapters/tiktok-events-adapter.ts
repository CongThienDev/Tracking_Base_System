import { RetryableDeliveryError, TerminalDeliveryError } from '../processor/delivery-errors.js';
import type { CanonicalEventRecord, DeliveryJobEnvelope } from '../types.js';
import type { DestinationAdapter } from './destination-adapter.js';

type FetchLike = typeof fetch;

type TikTokPayload = {
  event: string;
  event_id: string;
  timestamp: string;
  context?: {
    ip?: string;
    user_agent?: string;
    ttclid?: string;
  };
  properties?: {
    value?: number;
    currency?: string;
  };
};

export type TikTokEventsAdapterOptions = {
  endpointUrl: string;
  accessToken?: string;
  fetchImpl?: FetchLike;
};

function mapEventName(eventName: string): string {
  switch (eventName) {
    case 'purchase':
      return 'CompletePayment';
    case 'initiate_checkout':
      return 'InitiateCheckout';
    case 'add_to_cart':
      return 'AddToCart';
    case 'view_content':
      return 'ViewContent';
    case 'page_view':
      return 'PageView';
    default:
      return eventName;
  }
}

function readEvent(job: DeliveryJobEnvelope): CanonicalEventRecord {
  if (!job.event) {
    throw new TerminalDeliveryError('TikTok delivery job is missing event data');
  }

  if (!job.event.eventId || !job.event.eventName || !(job.event.eventTimestamp instanceof Date)) {
    throw new TerminalDeliveryError('TikTok delivery job has invalid event data');
  }

  return job.event;
}

function buildPayload(event: CanonicalEventRecord): TikTokPayload {
  const payload: TikTokPayload = {
    event: mapEventName(event.eventName),
    event_id: event.eventId,
    timestamp: event.eventTimestamp.toISOString()
  };

  if (event.ingestIp || event.userAgent || event.ttclid) {
    payload.context = {
      ...(event.ingestIp ? { ip: event.ingestIp } : {}),
      ...(event.userAgent ? { user_agent: event.userAgent } : {}),
      ...(event.ttclid ? { ttclid: event.ttclid } : {})
    };
  }

  if (typeof event.eventValue === 'number' || event.currency) {
    payload.properties = {
      ...(typeof event.eventValue === 'number' ? { value: event.eventValue } : {}),
      ...(event.currency ? { currency: event.currency } : {})
    };
  }

  return payload;
}

function classifyErrorStatus(status: number): 'retryable' | 'terminal' {
  if (status === 429 || status >= 500) {
    return 'retryable';
  }

  return 'terminal';
}

export class TikTokEventsAdapter implements DestinationAdapter {
  public readonly destination = 'tiktok';
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly options: TikTokEventsAdapterOptions
  ) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async deliver(job: DeliveryJobEnvelope): Promise<void> {
    const event = readEvent(job);
    const payload = buildPayload(event);

    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };

    if (this.options.accessToken) {
      headers.authorization = `Bearer ${this.options.accessToken}`;
    }

    let response: Response;

    try {
      response = await this.fetchImpl(this.options.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new RetryableDeliveryError('TikTok delivery request failed due to a network error', { cause: error });
    }

    if (response.ok) {
      return;
    }

    const message = `TikTok delivery failed with HTTP ${response.status}`;

    if (classifyErrorStatus(response.status) === 'retryable') {
      throw new RetryableDeliveryError(message);
    }

    throw new TerminalDeliveryError(message);
  }
}
