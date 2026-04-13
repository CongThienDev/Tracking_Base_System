import { describe, expect, it, vi } from 'vitest';
import { MetaConversionsAdapter } from '../src/adapters/meta-conversions-adapter.js';
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
      destination: 'meta',
      requestedAt: '2026-04-13T10:00:00.000Z'
    },
    event
  };
}

describe('MetaConversionsAdapter', () => {
  it('maps purchase payload with hashed email, IP, UA, value, and currency', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await adapter.deliver(
      buildJob({
        eventId: 'evt-001',
        eventName: 'purchase',
        eventTimestamp: new Date('2026-04-13T10:00:00.000Z'),
        emailHash: 'sha256-email-hash',
        ingestIp: '203.0.113.1',
        userAgent: 'Mozilla/5.0',
        gclid: null,
        ttclid: null,
        eventValue: 49.99,
        currency: 'USD',
        payload: {}
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/meta-capi/pixel-123/events?access_token=token-123');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });

    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload).toEqual({
      data: [
        {
          event_name: 'Purchase',
          event_time: 1776074400,
          event_id: 'evt-001',
          action_source: 'website',
          user_data: {
            em: ['sha256-email-hash'],
            client_ip_address: '203.0.113.1',
            client_user_agent: 'Mozilla/5.0'
          },
          custom_data: {
            value: 49.99,
            currency: 'USD'
          }
        }
      ]
    });
  });

  it('omits optional fields when null', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      testEventCode: 'TEST123',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await adapter.deliver(
      buildJob({
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
      })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(payload).toEqual({
      data: [
        {
          event_name: 'ViewContent',
          event_time: 1776074400,
          event_id: 'evt-002',
          action_source: 'website',
          user_data: {}
        }
      ],
      test_event_code: 'TEST123'
    });
  });

  it('includes test_event_code when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      testEventCode: 'TEST-CODE',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await adapter.deliver(
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
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(payload).toMatchObject({
      test_event_code: 'TEST-CODE',
      data: [
        {
          event_name: 'PageView'
        }
      ]
    });
  });

  it('throws RetryableDeliveryError for HTTP 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('server error', { status: 500, statusText: 'Internal Server Error' }));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-004',
          eventName: 'purchase',
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

  it('throws TerminalDeliveryError for HTTP 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad request', { status: 400, statusText: 'Bad Request' }));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-005',
          eventName: 'purchase',
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

  it('throws RetryableDeliveryError when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    const adapter = new MetaConversionsAdapter({
      endpointUrl: 'https://example.test/meta-capi',
      pixelId: 'pixel-123',
      accessToken: 'token-123',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    await expect(
      adapter.deliver(
        buildJob({
          eventId: 'evt-006',
          eventName: 'purchase',
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
});
