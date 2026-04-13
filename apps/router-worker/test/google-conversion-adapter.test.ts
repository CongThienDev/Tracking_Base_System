import { describe, expect, it, vi } from 'vitest';
import { GoogleConversionAdapter } from '../src/adapters/google-conversion-adapter.js';
import { RetryableDeliveryError, TerminalDeliveryError } from '../src/processor/delivery-errors.js';
import type { CanonicalEventRecord, DeliveryJobEnvelope } from '../src/types.js';

function buildJob(event: CanonicalEventRecord): DeliveryJobEnvelope {
  return {
    id: 'job-001',
    queueName: 'router-deliveries',
    attemptsMade: 0,
    attempts: 3,
    data: {
      eventId: event.eventId,
      destination: 'google',
      requestedAt: '2026-04-13T10:00:00.000Z'
    },
    event
  };
}

describe('GoogleConversionAdapter', () => {
  it('includes gclid when present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const adapter = new GoogleConversionAdapter('https://example.test/conversions', undefined, fetchImpl as typeof fetch);

    await adapter.deliver(
      buildJob({
        eventId: 'evt-001',
        eventName: 'purchase',
        eventTimestamp: new Date('2026-04-13T03:00:00.000Z'),
        emailHash: null,
        ingestIp: null,
        userAgent: null,
        gclid: 'Cj0KCQiA',
        eventValue: 123.45,
        currency: 'USD',
        ttclid: null,
        payload: {}
      })
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/conversions');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });

    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      event_id: 'evt-001',
      conversion_action: 'purchase',
      conversion_date_time: '2026-04-13T03:00:00.000Z',
      gclid: 'Cj0KCQiA',
      conversion_value: 123.45,
      currency_code: 'USD'
    });
  });

  it('omits gclid when null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const adapter = new GoogleConversionAdapter('https://example.test/conversions', undefined, fetchImpl as typeof fetch);

    await adapter.deliver(
      buildJob({
        eventId: 'evt-002',
        eventName: 'purchase',
        eventTimestamp: new Date('2026-04-13T03:00:00.000Z'),
        emailHash: null,
        ingestIp: null,
        userAgent: null,
        gclid: null,
        eventValue: null,
        currency: null,
        ttclid: null,
        payload: {}
      })
    );

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(payload).toMatchObject({
      event_id: 'evt-002',
      conversion_action: 'purchase',
      conversion_date_time: '2026-04-13T03:00:00.000Z'
    });
    expect(payload).not.toHaveProperty('gclid');
  });

  it('throws RetryableDeliveryError for HTTP 500', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('server error', { status: 500, statusText: 'Internal Server Error' }));
    const adapter = new GoogleConversionAdapter('https://example.test/conversions', undefined, fetchImpl as typeof fetch);

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-003',
          eventName: 'purchase',
          eventTimestamp: new Date('2026-04-13T03:00:00.000Z'),
          emailHash: null,
          ingestIp: null,
          userAgent: null,
          gclid: null,
          eventValue: null,
          currency: null,
          ttclid: null,
          payload: {}
        })
      )
    ).rejects.toBeInstanceOf(RetryableDeliveryError);
  });

  it('throws TerminalDeliveryError for HTTP 400', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('bad request', { status: 400, statusText: 'Bad Request' }));
    const adapter = new GoogleConversionAdapter('https://example.test/conversions', undefined, fetchImpl as typeof fetch);

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-004',
          eventName: 'purchase',
          eventTimestamp: new Date('2026-04-13T03:00:00.000Z'),
          emailHash: null,
          ingestIp: null,
          userAgent: null,
          gclid: null,
          eventValue: null,
          currency: null,
          ttclid: null,
          payload: {}
        })
      )
    ).rejects.toBeInstanceOf(TerminalDeliveryError);
  });

  it('throws RetryableDeliveryError when fetch rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const adapter = new GoogleConversionAdapter('https://example.test/conversions', undefined, fetchImpl as typeof fetch);

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-005',
          eventName: 'purchase',
          eventTimestamp: new Date('2026-04-13T03:00:00.000Z'),
          emailHash: null,
          ingestIp: null,
          userAgent: null,
          gclid: null,
          eventValue: null,
          currency: null,
          ttclid: null,
          payload: {}
        })
      )
    ).rejects.toBeInstanceOf(RetryableDeliveryError);
  });
});
