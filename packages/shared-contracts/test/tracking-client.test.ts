import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBrowserSnippetReference, installBrowserTrack } from '../src/browser-snippet-reference.js';
import { createTrackingClient } from '../src/tracking-client.js';

type StorageState = Record<string, string>;

function createStorage(initial: StorageState = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    dump: () => Object.fromEntries(store.entries())
  };
}

function createClock(start = 0) {
  let now = start;

  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    set: (value: number) => {
      now = value;
    }
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('browser tracking client contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and persists session_id and sends page_view on init', async () => {
    const storage = createStorage();
    const clock = createClock(0);
    const fetchMock = vi.fn(async () => undefined);
    const randomUUID = vi.fn().mockReturnValueOnce('session-001').mockReturnValue('event-001');
    const target: { track?: unknown } = {};

    installBrowserTrack({
      target,
      storage,
      fetchImpl: fetchMock,
      now: clock.now,
      randomUUID
    });

    await flushMicrotasks();

    expect(target.track).toEqual(expect.any(Function));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/track');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      event_name: 'page_view',
      event_id: 'event-001',
      session: {
        session_id: 'session-001'
      }
    });
    expect(storage.dump()).toMatchObject({
      tracking_session: JSON.stringify({
        session_id: 'session-001',
        last_activity_at: 0
      })
    });
  });

  it('rotates session_id after 30 minutes inactivity', async () => {
    const storage = createStorage();
    const clock = createClock(0);
    const fetchMock = vi.fn(async () => undefined);
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce('session-001')
      .mockReturnValueOnce('event-page-view-001')
      .mockReturnValueOnce('event-add-to-cart-001')
      .mockReturnValueOnce('session-002')
      .mockReturnValueOnce('event-purchase-001');
    const client = installBrowserTrack({
      storage,
      fetchImpl: fetchMock,
      now: clock.now,
      randomUUID
    });

    await flushMicrotasks();

    clock.advance(29 * 60 * 1000);
    await client.track('add_to_cart', { value: 1 });

    clock.advance(31 * 60 * 1000);
    await client.track('purchase', { value: 2 });

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies[0]).toMatchObject({
      event_name: 'page_view',
      session: { session_id: 'session-001' }
    });
    expect(bodies[1]).toMatchObject({
      event_name: 'add_to_cart',
      session: { session_id: 'session-001' }
    });
    expect(bodies[2]).toMatchObject({
      event_name: 'purchase',
      session: { session_id: 'session-002' }
    });
  });

  it('generates event_id when missing and reuses it for pixel callbacks', async () => {
    const storage = createStorage();
    const clock = createClock(0);
    const fetchMock = vi.fn(async () => undefined);
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce('session-001')
      .mockReturnValueOnce('event-page-view-001')
      .mockReturnValueOnce('event-track-001');
    const pixelEvents: Array<{ event_id: string }> = [];
    const client = installBrowserTrack({
      storage,
      fetchImpl: fetchMock,
      now: clock.now,
      randomUUID
    });

    await flushMicrotasks();

    const result = await client.track('lead', { source: 'landing' }, {
      sendPixel: true,
      onPixelEvent: (event) => {
        pixelEvents.push(event);
      }
    });

    expect(result).toMatchObject({
      event_id: 'event-track-001',
      session_id: 'session-001'
    });
    expect(pixelEvents).toEqual([
      expect.objectContaining({
        event_id: 'event-track-001'
      })
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      event_name: 'lead',
      event_id: 'event-track-001'
    });
  });

  it('fails silently when fetch rejects', async () => {
    const storage = createStorage();
    const clock = createClock(0);
    const fetchMock = vi.fn(async () => {
      throw new Error('network down');
    });
    const randomUUID = vi
      .fn()
      .mockReturnValueOnce('session-001')
      .mockReturnValueOnce('event-page-view-001')
      .mockReturnValueOnce('event-track-001');
    const client = installBrowserTrack({
      storage,
      fetchImpl: fetchMock,
      now: clock.now,
      randomUUID
    });

    await flushMicrotasks();

    await expect(client.track('signup', { plan: 'pro' })).resolves.toMatchObject({
      event_id: 'event-track-001',
      session_id: 'session-001'
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('renders a compact browser snippet reference', () => {
    const snippet = buildBrowserSnippetReference('/collect');

    expect(snippet).toContain('window.track');
    expect(snippet).toContain('page_view');
    expect(snippet).toContain('event_id');
    expect(snippet).toContain('/collect');
  });
});

describe('createTrackingClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-sends page_view and reuses event_id for pixel callback', async () => {
    const storage = createStorage();
    const clock = createClock(0);
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    const pixelEvents: Array<{ eventId: string }> = [];
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('anon-001')
        .mockReturnValueOnce('session-001')
        .mockReturnValueOnce('event-page-view-001')
        .mockReturnValueOnce('event-lead-001')
    });

    const client = createTrackingClient({
      endpoint: 'https://api.example.com',
      storage,
      fetchImpl: fetchMock,
      now: clock.now,
      onPixelEvent: (event) => {
        pixelEvents.push({ eventId: event.eventId });
      }
    });

    await flushMicrotasks();
    const leadResult = await client.track('lead', { value: 10 }, { sendPixel: true });

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));

    expect(firstBody).toMatchObject({
      event_name: 'page_view',
      session: { session_id: 'session-001' }
    });
    expect(secondBody).toMatchObject({
      event_name: 'lead',
      event_id: leadResult.eventId
    });
    expect(pixelEvents).toEqual([{ eventId: leadResult.eventId }]);

    vi.unstubAllGlobals();
  });
});
