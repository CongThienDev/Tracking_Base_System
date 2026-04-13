# AGENT.md

## Purpose

This repository builds a first-party tracking and event-routing system.

The system is the source of truth for tracked events. External platforms are downstream consumers only.

Primary goals:

- receive events from frontend and backend clients
- validate, normalize, deduplicate, and persist events
- propagate the same `event_id` end-to-end
- forward stored events to Meta, Google Ads, TikTok, and optional analytics sinks
- preserve attribution integrity and avoid duplicate conversions

## Non-negotiable invariants

### 1. `event_id` is mandatory end-to-end

- Every real-world event must have a globally unique `event_id`
- If the client provides `event_id`, reuse it unchanged
- If missing, generate it once at the tracking boundary and propagate that exact value everywhere
- Never regenerate `event_id` in downstream services
- Never transform `event_id` into another identifier format

### 2. Storage is the source of truth

- Persist the event before calling external marketing APIs
- External delivery failures must not delete or corrupt stored events
- Retry downstream delivery independently of ingestion

### 3. Deduplication happens before side effects

- Duplicate `event_id` values must be detected and blocked or treated as idempotent
- No duplicate row insert
- No duplicate platform delivery for the same stored event

### 4. Client and server must use the same event identity

- Browser tracking, backend tracking, database rows, router jobs, and platform payloads must all reference the same `event_id`
- If browser pixel events exist, they must use the same `event_id` as the server event for platform deduplication

### 5. PII handling is strict

- Hash email before platform delivery when required
- Do not store raw personal data unless the docs explicitly allow it
- Prefer minimal payloads and tokenized identifiers

## Architecture guardrails

### Separation of concerns

- Ingestion API: receive, validate, enrich, persist
- Processing layer: normalize, deduplicate, classify, annotate
- Router layer: select destinations and enqueue delivery jobs
- Integration adapters: convert internal event format into vendor payloads

### Ingestion performance

- `/track` must stay fast
- Any slow work must be async after persistence
- Do not block ingestion on vendor API availability

### Event immutability

- Core identity fields must not change after persistence
- Derived fields may be added, but not by silently changing identity semantics

### Explicit mappings only

- Keep internal schema separate from Meta, Google, and TikTok payloads
- Use dedicated mapping functions and version them if necessary

### Deterministic idempotency

- Retries must be safe
- Replays must be safe
- Duplicate platform sends for one canonical event are not allowed

## Required reading order

1. `README.md`
2. `docs/README.md`
3. `docs/00-start-here/system-summary.md`
4. `docs/01-product/requirements.md`
5. `docs/03-data/event-contract.md`
6. `docs/03-data/deduplication.md`
7. `docs/04-api/tracking-api.md`
8. `docs/05-integrations/meta-capi.md`
9. `docs/07-ops/retries-and-queues.md`
10. `docs/09-testing/test-strategy.md`

## Working rules

### Before coding

- Read the relevant docs for the component you are changing
- Check whether the change affects contracts, schema, routing, security, or tests
- Do not guess on `event_id`, deduplication, or privacy rules

### While coding

- Keep modules small and explicit
- Add tests for identity, deduplication, and routing behavior
- Keep vendor credentials in environment variables only
- Document any contract or schema change in `docs/`

### After coding

- Verify the end-to-end event flow
- Confirm `event_id` is preserved through API, DB, queue, and vendor payloads
- Confirm duplicate requests are handled safely
- Confirm downstream failures do not block persistence
- Update docs if behavior changed
- Update roadmap progress for the current working day in `docs/12-roadmap/daily-progress.md`

## Implementation expectations

### API

- Expose `POST /track`
- Accept JSON only
- Validate required fields
- Auto-enrich timestamp, IP, and user-agent when available
- Return `{ status: "ok", event_id }`

### Persistence

- Store events in PostgreSQL or Supabase Postgres
- Enforce uniqueness on `event_id`
- Keep payloads queryable and analytics-friendly

### Processing

- Normalize incoming payloads
- Compute derived fields in a dedicated layer
- Reject spam, invalid payloads, and duplicates early

### Routing

- Send events only after storage
- Use one adapter per downstream platform
- Retry transient failures with bounded attempts and DLQ support
- Log success, failure, and response summaries safely

### Frontend contract

- Generate or reuse `event_id` on the client
- Send the same `event_id` to the tracking API and browser pixel when used
- Keep the client snippet lightweight and fail-safe

## Definition of done

A change is complete only when all of the following remain true:

- events are accepted through `/track`
- events are normalized and stored in the database
- `event_id` is generated or reused correctly and propagated unchanged
- duplicate events are blocked or safely deduplicated
- events are routed asynchronously to configured platforms
- retry logic and failure logging exist for outbound sends
- docs and tests reflect the actual behavior

## If unsure

Choose the option that best preserves:

- source-of-truth integrity
- `event_id` consistency
- idempotency
- data privacy
- explicit contracts and testability

## Progress tracking rule

- Phase tracking source: `docs/12-roadmap/implementation-phases.md`
- Daily tracking source: `docs/12-roadmap/daily-progress.md`
- Requirement: every working day with project activity must append one daily log entry
