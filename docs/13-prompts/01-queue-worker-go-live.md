# 01 - Queue Worker Go-Live

You are a Senior Engineer.

Goal:
Make queue/worker flow run end-to-end so events move out of `queued`.

Tasks:

1. Follow `docs/07-ops/queue-worker-go-live-checklist.md`
2. Validate env for API and worker
3. Start Redis, API, worker, console in correct order
4. Send test events and verify status transition `queued -> success/failed`
5. If failed, replay from console/admin endpoint and verify update
6. Record evidence and blockers

Constraints:

- No large refactor
- Fix only blockers to go-live path

Done criteria:

- /health and /ready are healthy
- Delivery states update correctly
- Replay works for failed deliveries
