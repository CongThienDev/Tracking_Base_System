# Frontend Layout Architecture

This document defines the canonical frontend structure for this repository.

## Design goals

- Keep business behavior isolated from page composition
- Keep API contracts strongly typed and traceable to backend docs
- Allow multiple contributors to work in parallel without merge chaos
- Preserve testability and replaceability of UI layers

## Canonical layers

1. `app`
- app bootstrap, provider tree, router, global layout
- no domain logic except app wiring

2. `pages`
- route-level composition only
- imports from widgets/features/entities/shared
- avoid direct HTTP calls in pages

3. `widgets`
- medium/large UI blocks composed for screens
- can call feature hooks/components

4. `features`
- user actions and flows (forms, command actions, mutations)
- owns interaction logic and client validation

5. `entities`
- domain model, DTOs, small pure helpers around core entities
- no framework-specific side effects

6. `shared`
- reusable technical primitives: API client, config, formatting, UI atoms
- never import from upper layers

## Dependency direction rule

Allowed direction:

`app -> pages -> widgets -> features -> entities -> shared`

Forbidden:

- importing upward (example: `shared` importing `features`)
- cross-linking between unrelated feature modules without shared contracts

## App currently implementing this architecture

- `apps/tracking-console`

## Naming and boundaries

- use kebab-case for files
- one responsibility per module
- route pages end with `-page.tsx`
- widgets include `ui/` if they are view-centric
- shared API modules end with `-api.ts`

## State and networking

- use React Query for server state
- keep fetch code in `shared/api`
- expose typed API adapters (example: `tracking-api.ts`)

## Practical delivery map

- `Overview` page: operational status + purpose context
- `Event Debugger`: test `POST /track`
- `Flow Explorer`: explain system runtime
- `Phase 7 Cutover`: controlled rollout checklist execution
