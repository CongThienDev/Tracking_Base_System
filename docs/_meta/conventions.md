# Documentation Conventions

## Purpose

This file defines how this repository writes and maintains documentation.

## Rules

- One concept per file
- One canonical source for each contract or rule
- Product docs describe what and why
- Architecture docs describe how components interact
- Data docs define schemas and invariants
- API docs define request and response contracts
- Integration docs define platform-specific mapping and delivery requirements
- Operational docs define how to run and recover the system

## Naming conventions

- `event_id`: globally unique event identity, UUID preferred
- `session_id`: 30-minute inactivity session boundary identifier
- `anonymous_id`: client-generated pseudonymous browser identity
- `user_id`: authenticated internal identity
- `event_name`: snake_case internal event name
- `event_time`: Unix seconds when required by vendor payloads
- `timestamp`: canonical event occurrence time in ISO 8601 or database timestamptz

## Event naming rules

- Use snake_case only
- Internal names are stable once public
- Standard events must keep semantic consistency across clients
- Custom events must have explicit trigger conditions

## Link rules

- Every substantive doc ends with a `Related docs` section
- API docs link to the canonical event contract instead of redefining fields
- Integration docs link to data and API docs instead of copying them

## Change control

Update docs when any of the following changes:

- event schema
- API contract
- database schema
- platform mappings
- retry policy
- security posture
