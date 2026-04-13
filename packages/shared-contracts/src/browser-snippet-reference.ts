type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<unknown>;

type PixelEvent = {
  event_id: string;
  event_name: string;
  event_data: Record<string, unknown>;
  session_id: string;
};

type TrackOptions = {
  event_id?: string;
  sendPixel?: boolean;
  onPixelEvent?: (event: PixelEvent) => void;
};

type TrackTarget = {
  track?: TrackClient;
};

type SessionState = {
  session_id: string;
  last_activity_at: number;
};

type InstallOptions = {
  target?: TrackTarget;
  endpointUrl?: string;
  fetchImpl?: FetchLike;
  storage?: StorageLike;
  now?: () => number;
  randomUUID?: () => string;
  sessionTimeoutMs?: number;
};

type TrackClient = (eventName: string, eventData?: Record<string, unknown>, options?: TrackOptions) => Promise<{ event_id: string; session_id: string }>;

const SESSION_KEY = 'tracking_session';
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function defaultRandomUUID(): string {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `evt_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function defaultStorage(): StorageLike | null {
  const storage = globalThis.localStorage;
  if (!storage) {
    return null;
  }

  return storage;
}

function defaultFetch(): FetchLike | null {
  const fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    return null;
  }

  return fetchImpl.bind(globalThis);
}

function readSession(storage: StorageLike | null): SessionState | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (typeof parsed.session_id !== 'string' || typeof parsed.last_activity_at !== 'number') {
      return null;
    }

    return parsed as SessionState;
  } catch {
    return null;
  }
}

function writeSession(storage: StorageLike | null, session: SessionState): void {
  storage?.setItem(SESSION_KEY, JSON.stringify(session));
}

function ensureSession(
  storage: StorageLike | null,
  now: number,
  randomUUID: () => string,
  sessionTimeoutMs: number
): SessionState {
  const existing = readSession(storage);
  const expired = !existing || now - existing.last_activity_at >= sessionTimeoutMs;

  const session = expired
    ? {
        session_id: randomUUID(),
        last_activity_at: now
      }
    : {
        session_id: existing.session_id,
        last_activity_at: now
      };

  writeSession(storage, session);

  return session;
}

export function buildBrowserSnippetReference(endpointUrl = '/track'): string {
  return [
    '<script>',
    '  // Lightweight browser contract: one global track() and a shared event_id for pixel callbacks.',
    '  window.track = function (event_name, event_data, options) {',
    `    return fetch(${JSON.stringify(endpointUrl)}, {`,
    "      method: 'POST',",
    "      headers: { 'content-type': 'application/json' },",
    '      body: JSON.stringify({',
    '        event_name: event_name,',
    '        event_data: event_data || {},',
    '        event_id: (options && options.event_id) || crypto.randomUUID()',
    '      })',
    '    });',
    '  };',
    '  window.track("page_view");',
    '</script>'
  ].join('\n');
}

export function installBrowserTrack(options: InstallOptions = {}) {
  const storage = options.storage ?? defaultStorage();
  const fetchImpl = options.fetchImpl ?? defaultFetch();
  const now = options.now ?? Date.now;
  const randomUUID = options.randomUUID ?? defaultRandomUUID;
  const endpointUrl = options.endpointUrl ?? '/track';
  const sessionTimeoutMs = options.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;
  const target = options.target ?? (globalThis as TrackTarget);

  const track: TrackClient = async (eventName, eventData = {}, trackOptions = {}) => {
    const session = ensureSession(storage, now(), randomUUID, sessionTimeoutMs);
    const event_id = trackOptions.event_id ?? randomUUID();
    const payload = {
      event_name: eventName,
      event_data: eventData,
      event_id,
      session: {
        session_id: session.session_id
      }
    };

    if (trackOptions.sendPixel && trackOptions.onPixelEvent) {
      try {
        trackOptions.onPixelEvent({
          event_id,
          event_name: eventName,
          event_data: eventData,
          session_id: session.session_id
        });
      } catch {
        // Pixel callbacks must never break the page.
      }
    }

    try {
      await fetchImpl?.(endpointUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch {
      // Fail silently when the transport is unavailable or rejects.
    }

    return {
      event_id,
      session_id: session.session_id
    };
  };

  target.track = track;
  void track('page_view', {}, { sendPixel: false });

  return {
    track,
    getSessionId: () => ensureSession(storage, now(), randomUUID, sessionTimeoutMs).session_id
  };
}
