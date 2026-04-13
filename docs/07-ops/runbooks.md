# Runbooks

## Common incidents

### Vendor outage

- confirm ingestion is still healthy
- pause or throttle the affected destination if needed
- allow retries or DLQ capture to absorb failures
- do not disable canonical event persistence

### Duplicate spike

- inspect recent `event_id` collision patterns
- confirm frontend and backend are not generating multiple IDs for the same event
- verify browser pixel and server event parity for Meta

### Queue backlog growth

- identify failing destination or worker bottleneck
- scale workers if safe
- validate that failures are not permanent payload errors

### Privacy deletion request

- locate `user_id`
- execute deletion or redaction workflow
- verify auxiliary tables are handled consistently

### Auth failure incident

- check whether the failing caller is server-to-server or browser-originated
- confirm the active auth mode: shared header, HMAC signature, or gateway auth
- verify the rejection reason in logs: missing header, bad signature, stale timestamp, or unexpected origin
- rotate or revoke the affected secret only after confirming the blast radius
- keep canonical ingestion enabled while the auth path is repaired

### Rate-limit incident

- identify whether the burst is a legitimate client spike or abuse
- confirm the active limit bucket: per-IP, per-client, or per-route
- check whether retries are amplifying the traffic pattern
- increase limits only for the smallest safe scope and only for the shortest safe window
- keep deduplication and request validation on even if limits are temporarily relaxed

### Delete-by-user validation

- run the delete validation script against `TEST_DATABASE_URL`
- confirm the script reports target user rows removed and control rows preserved
- if the script fails, inspect delete ordering first, then the seeded fixture data, then any table constraints
- rerun validation after the fix before marking the workflow ready

## Operator rule

When in doubt, protect ingestion and storage first. Routing can degrade temporarily; source-of-truth integrity cannot.

## Related docs

- [Observability](observability.md)
- [Retention and deletion](../03-data/retention-and-deletion.md)
