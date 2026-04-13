# Privacy and GDPR

## Privacy posture

This system should collect only what is needed for event integrity, attribution usefulness, and operational recovery.

## Core rules

- avoid raw PII storage unless explicitly justified
- hash email with SHA256 before long-term storage or vendor delivery when required
- support delete-by-user workflows
- define retention windows and enforce them
- validate delete-by-user flows against `events`, `event_deliveries`, and `users` before release
- verify that delete operations return explicit counts for auditability and incident review

## Consent note

Consent enforcement logic may live upstream in the frontend or orchestration layer, but this repository must be designed to respect suppression or routing disablement signals when they are present.

## Deletion controls

- delete-by-user requests must remove routing state before canonical event rows and user profile rows
- validation should confirm that only the target user scope is removed and unrelated users remain intact
- operational checks should be run from a dedicated `TEST_DATABASE_URL` target, not production
- retain the delete validation script as a release gate for changes to privacy handling

## Related docs

- [PII handling](pii-handling.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
