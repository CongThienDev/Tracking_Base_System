# 03 - Worker Reliability and Replay

You are a Senior Reliability Engineer.

Goal:
Improve worker reliability with safe retries and replay behavior.

Tasks:

1. Classify errors into retryable vs terminal
2. Tune attempts/backoff per destination
3. Ensure delivery state writes are consistent
4. Ensure replay does not create duplicate dangerous side effects
5. Add tests for retry/fail/replay paths

Done criteria:

- Worker tests pass
- Failed paths are observable
- Replay path is operational and auditable
