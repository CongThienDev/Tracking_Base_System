import { describe, expect, it, vi } from 'vitest';
import { TikTokEventsAdapter } from '../src/adapters/tiktok-events-adapter.js';
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
      destination: 'tiktok',
      requestedAt: '2026-04-13T10:00:00.000Z'
    },
    event
  };
}

describe('TikTokEventsAdapter', () => {
  it('maps purchase to CompletePayment and sends ttclid in context', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }));
    const adapter = new TikTokEventsAdapter({
      endpointUrl: 'https://example.com/tiktok',
      accessToken: 'secret-token',
      fetchImpl: fetchMock as unknown as typeof fetch
    });
    const job = buildJob({
      eventId: 'evt-001',
      eventName: 'purchase',
      eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
      emailHash: null,
      ingestIp: '203.0.113.1',
      userAgent: 'Mozilla/5.0',
      gclid: null,
      ttclid: 'ttclid-123',
      eventValue: 49.99,
      currency: 'USD',
      payload: {}
    });

    await adapter.deliver(job);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.com/tiktok');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer secret-token'
      }
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      event: 'CompletePayment',
      event_id: 'evt-001',
      timestamp: '2026-04-13T10:00:00.000Z',
      context: {
        ip: '203.0.113.1',
        user_agent: 'Mozilla/5.0',
        ttclid: 'ttclid-123'
      },
      properties: {
        value: 49.99,
        currency: 'USD'
      }
    });
  });

  it('omits optional fields when null', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }));
    const adapter = new TikTokEventsAdapter({
      endpointUrl: 'https://example.com/tiktok',
      fetchImpl: fetchMock as unknown as typeof fetch
    });
    const job = buildJob({
      eventId: 'evt-002',
      eventName: 'view_content',
      eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
      emailHash: null,
      ingestIp: null,
      userAgent: null,
      gclid: null,
      ttclid: null,
      eventValue: null,
      currency: null,
      payload: {}
    });

    await adapter.deliver(job);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      event: 'ViewContent',
      event_id: 'evt-002',
      timestamp: '2026-04-13T10:00:00.000Z'
    });
  });

  it('throws RetryableDeliveryError for 503 responses', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 503 }));
    const adapter = new TikTokEventsAdapter({
      endpointUrl: 'https://example.com/tiktok',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-003',
          eventName: 'page_view',
          eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
          emailHash: null,
          ingestIp: null,
          userAgent: null,
          gclid: null,
          ttclid: null,
          eventValue: null,
          currency: null,
          payload: {}
        })
      )
    ).rejects.toBeInstanceOf(RetryableDeliveryError);
  });

  it('throws TerminalDeliveryError for 422 responses', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 422 }));
    const adapter = new TikTokEventsAdapter({
      endpointUrl: 'https://example.com/tiktok',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-004',
          eventName: 'add_to_cart',
          eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
          emailHash: null,
          ingestIp: null,
          userAgent: null,
          gclid: null,
          ttclid: null,
          eventValue: null,
          currency: null,
          payload: {}
        })
      )
    ).rejects.toBeInstanceOf(TerminalDeliveryError);
  });
});
