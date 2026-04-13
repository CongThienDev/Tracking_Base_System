import type { CanonicalEventRecord, DeliveryJobEnvelope } from '../types.js';
import { RetryableDeliveryError, TerminalDeliveryError } from '../processor/delivery-errors.js';
import type { DestinationAdapter } from './destination-adapter.js';

type FetchLike = typeof fetch;

type MetaUserData = {
  em?: [string];
  client_ip_address?: string;
  client_user_agent?: string;
};

type MetaCustomData = {
  value?: number;
  currency?: string;
};

type MetaEventPayload = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: 'website';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
};

type MetaConversionsPayload = {
  data: MetaEventPayload[];
  test_event_code?: string;
};

export type MetaConversionsAdapterOptions = {
  endpointUrl: string;
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  fetchImpl?: FetchLike;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeErrorBody(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }

  return compact.length > 160 ? `${compact.slice(0, 160)}...` : compact;
}

function buildHttpErrorMessage(status: number, statusText: string, body: string): string {
  const summary = normalizeErrorBody(body);
  const details = summary ? `: ${summary}` : '';
  return `Meta conversions request failed with HTTP ${status}${statusText ? ` ${statusText}` : ''}${details}`;
}

function mapEventName(eventName: string): string {
  switch (eventName) {
    case 'page_view':
      return 'PageView';
    case 'view_content':
      return 'ViewContent';
    case 'add_to_cart':
      return 'AddToCart';
    case 'initiate_checkout':
      return 'InitiateCheckout';
    case 'purchase':
      return 'Purchase';
    default:
      return eventName;
  }
}

function readEvent(job: DeliveryJobEnvelope): CanonicalEventRecord {
  if (!job.event || !isRecord(job.event)) {
    throw new TerminalDeliveryError('Meta delivery job is missing event data');
  }

  const eventId = readOptionalString(job.event.eventId);
  const eventName = readOptionalString(job.event.eventName);
  const eventTimestamp = job.event.eventTimestamp instanceof Date ? job.event.eventTimestamp : null;

  if (!eventId || !eventName || !eventTimestamp) {
    throw new TerminalDeliveryError('Meta delivery job has invalid event data');
  }

  return {
    ...job.event,
    eventId,
    eventName,
    eventTimestamp,
    emailHash: readOptionalString(job.event.emailHash) ?? null,
    ingestIp: readOptionalString(job.event.ingestIp) ?? null,
    userAgent: readOptionalString(job.event.userAgent) ?? null,
    gclid: readOptionalString(job.event.gclid) ?? null,
    ttclid: readOptionalString(job.event.ttclid) ?? null,
    eventValue: readOptionalNumber(job.event.eventValue) ?? null,
    currency: readOptionalString(job.event.currency) ?? null
  };
}

function buildPayload(event: CanonicalEventRecord, testEventCode?: string): MetaConversionsPayload {
  const userData: MetaUserData = {};

  if (event.emailHash) {
    userData.em = [event.emailHash];
  }

  if (event.ingestIp) {
    userData.client_ip_address = event.ingestIp;
  }

  if (event.userAgent) {
    userData.client_user_agent = event.userAgent;
  }

  const payload: MetaConversionsPayload = {
    data: [
      {
        event_name: mapEventName(event.eventName),
        event_time: Math.floor(event.eventTimestamp.getTime() / 1000),
        event_id: event.eventId,
        action_source: 'website',
        user_data: userData
      }
    ]
  };

  if (typeof event.eventValue === 'number' || event.currency) {
    payload.data[0]!.custom_data = {
      ...(typeof event.eventValue === 'number' ? { value: event.eventValue } : {}),
      ...(event.currency ? { currency: event.currency } : {})
    };
  }

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  return payload;
}

function buildRequestUrl(endpointUrl: string, pixelId: string, accessToken: string): string {
  const url = new URL(endpointUrl);
  const normalizedPath = url.pathname.replace(/\/$/, '');
  url.pathname = `${normalizedPath}/${encodeURIComponent(pixelId)}/events`;
  url.searchParams.set('access_token', accessToken);
  return url.toString();
}

export class MetaConversionsAdapter implements DestinationAdapter {
  public readonly destination = 'meta';

  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: MetaConversionsAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async deliver(job: DeliveryJobEnvelope): Promise<void> {
    const event = readEvent(job);
    const payload = buildPayload(event, this.options.testEventCode);
    const requestUrl = buildRequestUrl(this.options.endpointUrl, this.options.pixelId, this.options.accessToken);

    let response: Response;

    try {
      response = await this.fetchImpl(requestUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new RetryableDeliveryError('Meta conversions request failed due to a network error', { cause: error });
    }

    if (response.ok) {
      return;
    }

    const body = normalizeErrorBody(await response.text().catch(() => ''));
    const message = buildHttpErrorMessage(response.status, response.statusText, body);

    if (response.status === 429 || response.status >= 500) {
      throw new RetryableDeliveryError(message);
    }

    throw new TerminalDeliveryError(message);
  }
}
