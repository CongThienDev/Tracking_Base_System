# Scope and Non-goals

## MVP scope

The MVP must support:

- ingestion from other repositories via `POST /track`
- JSON payload validation
- auto-enrichment of timestamp, IP, and user-agent when missing
- canonical event storage in PostgreSQL or Supabase
- unique `event_id` enforcement
- async routing to Meta, Google Ads, and TikTok
- retry handling with at least 3 attempts
- logs for ingestion, validation failures, and delivery outcomes
- frontend SDK or browser snippet contract for other repos
- GDPR-ready delete-by-user capability

## Non-goals for MVP

The following are deliberately excluded from first implementation:

- attribution modeling
- customer lifetime value service
- visual analytics dashboard
- A/B testing orchestration
- full event replay UI
- advanced consent management product
- warehouse sync pipelines

## Implementation assumptions

- This service is called by separate frontend and backend applications
- The frontend repo may also fire browser pixels, but this service remains authoritative
- Queue infrastructure can be Redis-based or cloud-managed as long as it supports retries and dead lettering

## Related docs

- [Requirements](../01-product/requirements.md)
- [MVP scope](../01-product/mvp-scope.md)
- [Roadmap](../12-roadmap/future-extensions.md)
