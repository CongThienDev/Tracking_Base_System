# Privacy and GDPR

## Privacy posture

This system should collect only what is needed for event integrity, attribution usefulness, and operational recovery.

## Core rules

- avoid raw PII storage unless explicitly justified
- hash email with SHA256 before long-term storage or vendor delivery when required
- support delete-by-user workflows
- define retention windows and enforce them

## Consent note

Consent enforcement logic may live upstream in the frontend or orchestration layer, but this repository must be designed to respect suppression or routing disablement signals when they are present.

## Related docs

- [PII handling](pii-handling.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
