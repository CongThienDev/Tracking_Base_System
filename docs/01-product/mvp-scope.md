# MVP Scope

## In scope

- one public ingestion endpoint
- one canonical event contract
- one events table and one users table
- async event router
- Meta, Google Ads, TikTok integrations
- optional limited Umami forwarding
- operational logging and recovery documentation

## Out of scope

- full admin UI
- warehouse sync
- streaming analytics
- model-driven scoring beyond lightweight derived flags
- multi-tenant billing or workspace management

## Success definition

A separate frontend repository can send events to this service, this service stores them, and then the router can deliver those stored events downstream with stable identity.

## Related docs

- [Scope and non-goals](../00-start-here/scope-and-non-goals.md)
- [Roadmap backlog](../12-roadmap/backlog.md)
