import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

export type EventCounts = Record<string, number>;

export interface ParityCheckOptions {
  newPath: string;
  legacyPath: string;
  threshold: number;
}

export interface PerEventParity {
  eventName: string;
  newCount: number;
  legacyCount: number;
  absoluteDelta: number;
  mismatchRatio: number;
}

export interface ParityCheckReport {
  inputs: ParityCheckOptions;
  totals: {
    newTotal: number;
    legacyTotal: number;
    absoluteDelta: number;
    mismatchRatio: number;
  };
  perEvent: PerEventParity[];
  pass: boolean;
}

const numericCountSchema = z
  .number()
  .int()
  .nonnegative({ message: 'count must be a non-negative integer' });

const eventRowSchema = z
  .object({
    event_name: z.string().min(1).optional(),
    eventName: z.string().min(1).optional(),
    count: numericCountSchema.optional()
  })
  .refine((value) => Boolean(value.event_name || value.eventName), {
    message: 'event row must include event_name or eventName'
  });

const datasetWithEventsSchema = z.object({
  events: z.array(eventRowSchema)
});

const datasetWithCountsSchema = z.object({
  counts: z.record(z.string(), numericCountSchema)
});

const directCountsSchema = z.record(z.string(), numericCountSchema);

export function parseThreshold(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }

  const threshold = Number(raw);

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error('--threshold must be a number between 0 and 1');
  }

  return threshold;
}

export function parseArgs(argv: string[]): ParityCheckOptions {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    args.set(token, next);
    index += 1;
  }

  const newPath = args.get('--new-path');
  const legacyPath = args.get('--legacy-path');

  if (!newPath) {
    throw new Error('--new-path is required');
  }

  if (!legacyPath) {
    throw new Error('--legacy-path is required');
  }

  return {
    newPath,
    legacyPath,
    threshold: parseThreshold(args.get('--threshold'))
  };
}

function toEventCounts(dataset: unknown): EventCounts {
  const withEvents = datasetWithEventsSchema.safeParse(dataset);

  if (withEvents.success) {
    const counts: EventCounts = {};

    for (const row of withEvents.data.events) {
      const eventName = row.event_name ?? row.eventName;
      const nextCount = row.count ?? 1;
      counts[eventName] = (counts[eventName] ?? 0) + nextCount;
    }

    return counts;
  }

  const withCounts = datasetWithCountsSchema.safeParse(dataset);

  if (withCounts.success) {
    return { ...withCounts.data.counts };
  }

  const directCounts = directCountsSchema.safeParse(dataset);

  if (directCounts.success) {
    return { ...directCounts.data };
  }

  throw new Error(
    [
      'Dataset format is invalid.',
      'Accepted formats:',
      '1) { "events": [{ "event_name"|"eventName": string, "count"?: number }] }',
      '2) { "counts": { [eventName]: number } }',
      '3) { [eventName]: number }'
    ].join(' ')
  );
}

export function computeParityReport(
  newCounts: EventCounts,
  legacyCounts: EventCounts,
  options: ParityCheckOptions
): ParityCheckReport {
  const eventNames = Array.from(new Set([...Object.keys(newCounts), ...Object.keys(legacyCounts)])).sort((a, b) =>
    a.localeCompare(b)
  );

  const perEvent = eventNames.map((eventName) => {
    const nextNewCount = newCounts[eventName] ?? 0;
    const nextLegacyCount = legacyCounts[eventName] ?? 0;
    const absoluteDelta = Math.abs(nextNewCount - nextLegacyCount);
    const mismatchRatio = nextLegacyCount === 0 ? (nextNewCount === 0 ? 0 : 1) : absoluteDelta / nextLegacyCount;

    return {
      eventName,
      newCount: nextNewCount,
      legacyCount: nextLegacyCount,
      absoluteDelta,
      mismatchRatio
    };
  });

  const newTotal = Object.values(newCounts).reduce((acc, count) => acc + count, 0);
  const legacyTotal = Object.values(legacyCounts).reduce((acc, count) => acc + count, 0);
  const absoluteDelta = perEvent.reduce((acc, row) => acc + row.absoluteDelta, 0);
  const mismatchRatio = legacyTotal === 0 ? (newTotal === 0 ? 0 : 1) : absoluteDelta / legacyTotal;

  return {
    inputs: options,
    totals: {
      newTotal,
      legacyTotal,
      absoluteDelta,
      mismatchRatio
    },
    perEvent,
    pass: mismatchRatio <= options.threshold
  };
}

export async function loadCountsFromFile(filePath: string): Promise<EventCounts> {
  const absolutePath = resolve(filePath);
  const fileContent = await readFile(absolutePath, 'utf8');

  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${absolutePath}: ${(error as Error).message}`);
  }

  return toEventCounts(parsed);
}

export function toDeterministicOutput(report: ParityCheckReport): string {
  return JSON.stringify(report, null, 2);
}

export interface MainDeps {
  out: (message: string) => void;
  err: (message: string) => void;
  loadCounts: (filePath: string) => Promise<EventCounts>;
}

const defaultMainDeps: MainDeps = {
  out: (message) => {
    console.log(message);
  },
  err: (message) => {
    console.error(message);
  },
  loadCounts: loadCountsFromFile
};

export async function main(argv: string[], deps: MainDeps = defaultMainDeps): Promise<number> {
  try {
    const options = parseArgs(argv);
    const [newCounts, legacyCounts] = await Promise.all([
      deps.loadCounts(options.newPath),
      deps.loadCounts(options.legacyPath)
    ]);

    const report = computeParityReport(newCounts, legacyCounts, options);
    deps.out(toDeterministicOutput(report));

    if (!report.pass) {
      deps.err(`Parity check failed: mismatch ratio ${report.totals.mismatchRatio} exceeded threshold ${options.threshold}`);
      return 2;
    }

    return 0;
  } catch (error) {
    deps.err((error as Error).message);
    return 1;
  }
}

function isEntrypoint(): boolean {
  const current = process.argv[1];

  if (!current) {
    return false;
  }

  return import.meta.url === pathToFileURL(current).href;
}

if (isEntrypoint()) {
  main(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
