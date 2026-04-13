import type { CanonicalEventRecord, DeliveryJobEnvelope } from '../types.js';
import { RetryableDeliveryError, TerminalDeliveryError } from '../processor/delivery-errors.js';
import type { DestinationAdapter } from './destination-adapter.js';

type GoogleConversionPayload = {
  event_id: string;
  conversion_action: string;
  conversion_date_time: string;
  gclid?: string;
  conversion_value?: number;
  currency_code?: string;
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
  return `Google conversion request failed with HTTP ${status}${statusText ? ` ${statusText}` : ''}${details}`;
}

function buildPayload(event: CanonicalEventRecord): GoogleConversionPayload {
  const payload: GoogleConversionPayload = {
    event_id: event.eventId,
    conversion_action: event.eventName,
    conversion_date_time: event.eventTimestamp.toISOString()
  };

  const gclid = readOptionalString(event.gclid);
  if (gclid) {
    payload.gclid = gclid;
  }

  const conversionValue = readOptionalNumber(event.eventValue);
  if (conversionValue !== undefined) {
    payload.conversion_value = conversionValue;
  }

  const currencyCode = readOptionalString(event.currency);
  if (currencyCode) {
    payload.currency_code = currencyCode;
  }

  return payload;
}

function readEvent(job: DeliveryJobEnvelope): CanonicalEventRecord {
  if (!job.event || !isRecord(job.event)) {
    throw new TerminalDeliveryError('Google conversion job is missing event data');
  }

  const eventId = readOptionalString(job.event.eventId);
  const eventName = readOptionalString(job.event.eventName);
  const eventTimestamp = job.event.eventTimestamp instanceof Date ? job.event.eventTimestamp : null;

  if (!eventId || !eventName || !eventTimestamp) {
    throw new TerminalDeliveryError('Google conversion job has invalid event data');
  }

  return {
    ...job.event,
    eventId,
    eventName,
    eventTimestamp,
    gclid: readOptionalString(job.event.gclid) ?? null,
    eventValue: readOptionalNumber(job.event.eventValue) ?? null,
    currency: readOptionalString(job.event.currency) ?? null
  };
}

export class GoogleConversionAdapter implements DestinationAdapter {
  public readonly destination = 'google';

  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly endpointUrl: string,
    private readonly apiKey?: string,
    fetchImpl?: typeof fetch
  ) {
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
  }

  async deliver(job: DeliveryJobEnvelope): Promise<void> {
    const event = readEvent(job);
    const payload = buildPayload(event);
    const headers: HeadersInit = {
      'content-type': 'application/json'
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    let response: Response;

    try {
      response = await this.fetchImpl(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new RetryableDeliveryError('Google conversion request failed due to a network error', { cause: error });
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
