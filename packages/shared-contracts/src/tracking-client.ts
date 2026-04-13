export type TrackingRecord = Record<string, unknown>;

export interface TrackingIdentityInput {
  user_id?: string | null;
  email?: string | null;
  email_hash?: string | null;
  anonymous_id?: string | null;
}

export interface TrackingAttributionInput {
  source?: string;
  campaign?: string;
  adId?: string;
  gclid?: string;
  ttclid?: string;
}

export interface TrackingStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface TrackingFetchResponseLike {
  ok?: boolean;
  status?: number;
}

export interface TrackingFetchInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  keepalive?: boolean;
}

export type TrackingFetchLike = (
  input: string,
  init?: TrackingFetchInitLike
) => Promise<TrackingFetchResponseLike | void>;

export interface TrackingContextInput extends TrackingRecord {
  page_url?: string;
  referrer?: string;
}

export interface TrackingPixelEvent {
  eventId: string;
  eventName: string;
  eventData?: TrackingRecord;
  user: TrackingIdentityInput;
  context?: TrackingContextInput;
  session: TrackingSessionPayload;
  timestamp: string;
}

export interface TrackingClientOptions extends TrackingAttributionInput {
  endpoint: string;
  fetchImpl?: TrackingFetchLike;
  storage?: TrackingStorageLike;
  now?: () => number | Date;
  onPixelEvent?: (event: TrackingPixelEvent) => void | Promise<void>;
  autoPageView?: boolean;
}

export interface TrackingTrackOptions {
  eventId?: string;
  user?: TrackingIdentityInput;
  context?: TrackingContextInput;
  session?: TrackingAttributionInput;
  sendPixel?: boolean;
}

export interface TrackingSessionPayload {
  session_id: string;
  source?: string;
  campaign?: string;
  ad_id?: string;
  gclid?: string;
  ttclid?: string;
}

export interface TrackingEventPayload {
  event_id: string;
  event_name: string;
  timestamp: string;
  user?: TrackingIdentityInput;
  session: TrackingSessionPayload;
  event_data?: TrackingRecord;
  context?: TrackingContextInput;
}

export interface TrackingTrackResult {
  eventId: string;
  sessionId: string;
  anonymousId: string;
  delivered: boolean;
  pixelSent: boolean;
  status?: number;
}

export interface TrackingClient {
  track(
    eventName: string,
    eventData?: TrackingRecord,
    options?: TrackingTrackOptions
  ): Promise<TrackingTrackResult>;
}

type BrowserGlobals = typeof globalThis & {
  localStorage?: TrackingStorageLike;
  fetch?: TrackingFetchLike;
  location?: { href?: string };
  document?: { referrer?: string };
  crypto?: {
    randomUUID?: () => string;
    getRandomValues?: (array: Uint8Array) => Uint8Array;
  };
};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const STORAGE_KEYS = {
  anonymousId: 'tracking_base_system:anonymous_id',
  sessionId: 'tracking_base_system:session_id',
  sessionLastActivity: 'tracking_base_system:session_last_activity'
} as const;

class MemoryStorage implements TrackingStorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function getBrowserGlobals(): BrowserGlobals {
  return globalThis as BrowserGlobals;
}

function createSafeStorage(preferred?: TrackingStorageLike): TrackingStorageLike {
  const browserStorage = preferred ?? getBrowserGlobals().localStorage;
  const memoryStorage = new MemoryStorage();

  if (!browserStorage) {
    return memoryStorage;
  }

  return {
    getItem(key: string): string | null {
      try {
        const value = browserStorage.getItem(key);
        if (value !== null) {
          memoryStorage.setItem(key, value);
        }
        return value;
      } catch {
        return memoryStorage.getItem(key);
      }
    },
    setItem(key: string, value: string): void {
      try {
        browserStorage.setItem(key, value);
      } catch {
        memoryStorage.setItem(key, value);
      }
    },
    removeItem(key: string): void {
      try {
        browserStorage.removeItem(key);
      } catch {
        memoryStorage.removeItem(key);
      }
      memoryStorage.removeItem(key);
    }
  };
}

function readNowMs(now?: () => number | Date): number {
  const value = now?.() ?? Date.now();
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : Date.now();
  }

  return Number.isFinite(value) ? value : Date.now();
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEventName(eventName: string): string {
  return eventName.trim().toLowerCase().replace(/\s+/g, '_');
}

function buildId(): string {
  const crypto = getBrowserGlobals().crypto;
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const toHex = (byte: number): string => byte.toString(16).padStart(2, '0');
    return `${toHex(bytes[0])}${toHex(bytes[1])}${toHex(bytes[2])}${toHex(bytes[3])}-` +
      `${toHex(bytes[4])}${toHex(bytes[5])}-` +
      `${toHex(bytes[6])}${toHex(bytes[7])}-` +
      `${toHex(bytes[8])}${toHex(bytes[9])}-` +
      `${toHex(bytes[10])}${toHex(bytes[11])}${toHex(bytes[12])}${toHex(bytes[13])}${toHex(bytes[14])}${toHex(bytes[15])}`;
  }

  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorageText(storage: TrackingStorageLike, key: string): string | undefined {
  try {
    return storage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStorageText(storage: TrackingStorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Silent fallback only.
  }
}

function buildDefaultContext(): TrackingContextInput | undefined {
  const globals = getBrowserGlobals();
  const pageUrl = trimString(globals.location?.href);
  const referrer = trimString(globals.document?.referrer);

  if (!pageUrl && !referrer) {
    return undefined;
  }

  return {
    ...(pageUrl ? { page_url: pageUrl } : {}),
    ...(referrer ? { referrer } : {})
  };
}

function mergeContext(
  defaultContext: TrackingContextInput | undefined,
  context: TrackingContextInput | undefined
): TrackingContextInput | undefined {
  const merged = {
    ...(defaultContext ?? {}),
    ...(context ?? {})
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeIdentity(
  storedAnonymousId: string,
  inputIdentity: TrackingIdentityInput | undefined
): TrackingIdentityInput {
  const userId = trimString(inputIdentity?.user_id);
  const email = trimString(inputIdentity?.email);
  const emailHash = trimString(inputIdentity?.email_hash);
  const anonymousId = trimString(inputIdentity?.anonymous_id) ?? storedAnonymousId;

  return {
    ...(userId ? { user_id: userId } : {}),
    ...(email ? { email } : {}),
    ...(emailHash ? { email_hash: emailHash } : {}),
    anonymous_id: anonymousId
  };
}

function mergeAttribution(
  base: TrackingAttributionInput,
  override: TrackingAttributionInput | undefined
): Partial<Omit<TrackingSessionPayload, 'session_id'>> {
  const merged = {
    source: trimString(override?.source) ?? trimString(base.source),
    campaign: trimString(override?.campaign) ?? trimString(base.campaign),
    ad_id: trimString(override?.adId) ?? trimString(base.adId),
    gclid: trimString(override?.gclid) ?? trimString(base.gclid),
    ttclid: trimString(override?.ttclid) ?? trimString(base.ttclid)
  };

  return {
    ...(merged.source ? { source: merged.source } : {}),
    ...(merged.campaign ? { campaign: merged.campaign } : {}),
    ...(merged.ad_id ? { ad_id: merged.ad_id } : {}),
    ...(merged.gclid ? { gclid: merged.gclid } : {}),
    ...(merged.ttclid ? { ttclid: merged.ttclid } : {})
  };
}

function getAnonymousId(storage: TrackingStorageLike): string {
  const existing = trimString(readStorageText(storage, STORAGE_KEYS.anonymousId));
  if (existing) {
    return existing;
  }

  const anonymousId = buildId();
  writeStorageText(storage, STORAGE_KEYS.anonymousId, anonymousId);
  return anonymousId;
}

function getSessionState(storage: TrackingStorageLike, nowMs: number): { sessionId: string; sessionLastActivity: number } {
  const existingSessionId = trimString(readStorageText(storage, STORAGE_KEYS.sessionId));
  const lastActivityText = trimString(readStorageText(storage, STORAGE_KEYS.sessionLastActivity));
  const lastActivity = lastActivityText ? Number(lastActivityText) : Number.NaN;
  const sessionIsFresh = Boolean(
    existingSessionId &&
      Number.isFinite(lastActivity) &&
      nowMs - lastActivity < SESSION_TIMEOUT_MS
  );

  if (sessionIsFresh && existingSessionId) {
    writeStorageText(storage, STORAGE_KEYS.sessionLastActivity, String(nowMs));
    return {
      sessionId: existingSessionId,
      sessionLastActivity: nowMs
    };
  }

  const sessionId = buildId();
  writeStorageText(storage, STORAGE_KEYS.sessionId, sessionId);
  writeStorageText(storage, STORAGE_KEYS.sessionLastActivity, String(nowMs));

  return {
    sessionId,
    sessionLastActivity: nowMs
  };
}

function normalizeEventData(eventData?: TrackingRecord): TrackingRecord | undefined {
  if (eventData === undefined) {
    return undefined;
  }

  if (eventData === null || typeof eventData !== 'object' || Array.isArray(eventData)) {
    return undefined;
  }

  return eventData;
}

function buildEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/track') ? withoutTrailingSlash : `${withoutTrailingSlash}/track`;
}

async function dispatchPixelEvent(
  onPixelEvent: TrackingClientOptions['onPixelEvent'],
  event: TrackingPixelEvent
): Promise<boolean> {
  if (!onPixelEvent) {
    return false;
  }

  try {
    await onPixelEvent(event);
    return true;
  } catch {
    return false;
  }
}

export function createTrackingClient(options: TrackingClientOptions): TrackingClient {
  const storage = createSafeStorage(options.storage);
  const defaultContext = buildDefaultContext();
  const endpoint = buildEndpoint(options.endpoint);
  const fetchImpl = options.fetchImpl ?? getBrowserGlobals().fetch;
  const autoPageView = options.autoPageView ?? true;

  async function track(
    eventName: string,
    eventData?: TrackingRecord,
    trackOptions?: TrackingTrackOptions
  ): Promise<TrackingTrackResult> {
    const nowMs = readNowMs(options.now);
    const anonymousId = getAnonymousId(storage);
    const sessionState = getSessionState(storage, nowMs);
    const sessionPayload = {
      session_id: sessionState.sessionId,
      ...mergeAttribution(options, trackOptions?.session)
    };
    const eventId = trimString(trackOptions?.eventId) ?? buildId();
    const normalizedEventName = trimString(eventName);
    const shouldSendPixel = Boolean(normalizedEventName && trackOptions?.sendPixel && options.onPixelEvent);
    const payloadContext = mergeContext(defaultContext, trackOptions?.context);
    const payloadUser = mergeIdentity(anonymousId, trackOptions?.user);
    const payloadEventData = normalizeEventData(eventData);
    const timestamp = new Date(nowMs).toISOString();
    let delivered = false;
    let status: number | undefined;

    if (!normalizedEventName || !endpoint || !fetchImpl) {
      const pixelSent = shouldSendPixel
        ? await dispatchPixelEvent(options.onPixelEvent, {
            eventId,
            eventName: normalizedEventName ? normalizeEventName(normalizedEventName) : '',
            eventData: payloadEventData,
            user: payloadUser,
            context: payloadContext,
            session: sessionPayload,
            timestamp
          })
        : false;

      return {
        eventId,
        sessionId: sessionState.sessionId,
        anonymousId,
        delivered: false,
        pixelSent
      };
    }

    const body: TrackingEventPayload = {
      event_id: eventId,
      event_name: normalizeEventName(normalizedEventName),
      timestamp,
      user: payloadUser,
      session: sessionPayload,
      ...(payloadEventData ? { event_data: payloadEventData } : {}),
      ...(payloadContext ? { context: payloadContext } : {})
    };

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body),
        keepalive: true
      });

      status = response?.status;
      delivered = Boolean(response === undefined || response?.ok !== false);
    } catch {
      delivered = false;
    }

    const pixelSent = shouldSendPixel
      ? await dispatchPixelEvent(options.onPixelEvent, {
          eventId,
          eventName: body.event_name,
          eventData: payloadEventData,
          user: payloadUser,
          context: payloadContext,
          session: sessionPayload,
          timestamp
        })
      : false;

    return {
      eventId,
      sessionId: sessionState.sessionId,
      anonymousId,
      delivered,
      pixelSent,
      ...(status !== undefined ? { status } : {})
    };
  }

  if (autoPageView) {
    void track('page_view', undefined, { sendPixel: false });
  }

  return {
    track
  };
}
