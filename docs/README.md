# Docs Index

This `docs/` tree is the documentation system for the Tracking Base System.

The layout is designed so humans and coding agents can navigate the repository without guessing where the source of truth lives.

## Recommended reading order

1. [Start here](00-start-here/README.md)
2. [Visual walkthrough (what this system is built for)](00-start-here/how-this-system-works.html)
3. [Requirements](01-product/requirements.md)
4. [Architecture overview](02-architecture/architecture-overview.md)
5. [Canonical event contract](03-data/event-contract.md)
6. [Tracking API](04-api/tracking-api.md)
7. [Deduplication](03-data/deduplication.md)
8. [Meta integration](05-integrations/meta-capi.md)
9. [Operations](07-ops/runbooks.md)
10. [Testing strategy](09-testing/test-strategy.md)

## Source of truth map

- Product intent: `01-product/`
- System design: `02-architecture/`
- Canonical event model: `03-data/event-contract.md`
- Database rules: `03-data/schema.md`
- Public API contract: `04-api/tracking-api.md`
- Vendor mappings: `05-integrations/`
- Frontend integration: `06-frontend/`
- Operational behavior: `07-ops/`
- Security and privacy: `08-security/`
- Test gates: `09-testing/`
- Architecture decisions: `10-adrs/`
- Agent playbooks: `11-agents/`

## Folder map

- [`_meta/`](./_meta/conventions.md): docs governance and terminology
- [`00-start-here/`](00-start-here/README.md): onboarding layer
- [`01-product/`](01-product/requirements.md): product and event semantics
- [`02-architecture/`](02-architecture/architecture-overview.md): system boundaries and flow
- [`03-data/`](03-data/event-contract.md): canonical event and database model
- [`04-api/`](04-api/tracking-api.md): API and worker contracts
- [`05-integrations/`](05-integrations/meta-capi.md): downstream delivery specs
- [`06-frontend/`](06-frontend/tracking-sdk.md): browser and backend client integration
- [`06-frontend/frontend-layout-architecture.md`](06-frontend/frontend-layout-architecture.md): canonical frontend layering rules
- [`07-ops/`](07-ops/deployment.md): deployment and operations
- [`../deploy/vps/README.md`](../deploy/vps/README.md): VPS deployment checklist (compose + proxy)
- [`07-ops/queue-worker-go-live-checklist.md`](07-ops/queue-worker-go-live-checklist.md): step-by-step queue/worker go-live checklist
- [`08-security/`](08-security/privacy-and-gdpr.md): privacy and security controls
- [`09-testing/`](09-testing/test-strategy.md): quality gates
- [`10-adrs/`](10-adrs/README.md): architecture decisions
- [`11-agents/`](11-agents/README.md): agent operating docs
- [`12-roadmap/`](12-roadmap/backlog.md): delivery phases, daily tracking, non-MVP evolution
