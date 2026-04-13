import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { sha256 } from './hash.js';
import type { NormalizedTrackEvent, TrackRequestPayload } from '../types/track.js';

const trackPayloadSchema = z.object({
  event_id: z.string().trim().optional(),
  event_name: z.string().trim().min(1),
  timestamp: z.union([z.string(), z.number()]).optional(),
  user: z
    .object({
      user_id: z.string().trim().optional().nullable(),
      email: z.string().trim().email().optional().nullable(),
      email_hash: z.string().trim().optional().nullable(),
      anonymous_id: z.string().trim().optional().nullable()
    })
    .optional(),
  session: z.object({
    session_id: z.string().trim().min(1),
    source: z.string().trim().optional(),
    campaign: z.string().trim().optional(),
    ad_id: z.string().trim().optional(),
    gclid: z.string().trim().optional(),
    ttclid: z.string().trim().optional()
  }),
  event_data: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional()
});

type NormalizeInput = {
  payload: unknown;
  ip: string | null;
  userAgent: string | null;
  now?: Date;
  generateEventId?: () => string;
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function parseTimestamp(value: string | number | undefined, now: Date): Date {
  if (value === undefined) {
    return now;
  }

  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const fromNumber = new Date(ms);
    if (Number.isNaN(fromNumber.getTime())) {
      throw new ValidationError('timestamp is invalid');
    }
    return fromNumber;
  }

  const fromString = new Date(value);
  if (Number.isNaN(fromString.getTime())) {
    throw new ValidationError('timestamp is invalid');
  }

  return fromString;
}

function normalizeEventName(eventName: string): string {
  return eventName.trim().toLowerCase().replace(/\s+/g, '_');
}

function extractEmailHash(user: TrackRequestPayload['user'] | undefined): string | null {
  if (!user) {
    return null;
  }

  if (user.email_hash && user.email_hash.trim().length > 0) {
    return user.email_hash.trim().toLowerCase();
  }

  if (user.email && user.email.trim().length > 0) {
    return sha256(user.email.trim().toLowerCase());
  }

  return null;
}

export function normalizeTrackEvent(input: NormalizeInput): NormalizedTrackEvent {
  const parseResult = trackPayloadSchema.safeParse(input.payload);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const path = firstIssue.path.length > 0 ? firstIssue.path.join('.') : 'payload';
    throw new ValidationError(`${path}: ${firstIssue.message}`);
  }

  const data = parseResult.data;
  const now = input.now ?? new Date();
  const eventTimestamp = parseTimestamp(data.timestamp, now);
  const eventId = data.event_id && data.event_id.length > 0 ? data.event_id : (input.generateEventId ?? randomUUID)();

  return {
    eventId,
    eventName: normalizeEventName(data.event_name),
    eventTimestamp,
    userId: data.user?.user_id ?? null,
    emailHash: extractEmailHash(data.user),
    anonymousId: data.user?.anonymous_id ?? null,
    sessionId: data.session.session_id,
    source: data.session.source ?? null,
    campaign: data.session.campaign ?? null,
    adId: data.session.ad_id ?? null,
    gclid: data.session.gclid ?? null,
    ttclid: data.session.ttclid ?? null,
    eventValue: typeof data.event_data?.value === 'number' ? data.event_data.value : null,
    currency: typeof data.event_data?.currency === 'string' ? data.event_data.currency : null,
    payload: {
      event_data: data.event_data ?? {},
      context: data.context ?? {},
      user: {
        user_id: data.user?.user_id ?? null,
        anonymous_id: data.user?.anonymous_id ?? null
      },
      session: data.session
    },
    ingestIp: input.ip,
    userAgent: input.userAgent
  };
}
