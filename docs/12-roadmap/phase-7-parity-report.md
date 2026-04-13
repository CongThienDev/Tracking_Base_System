# Phase 7 Parity Report

## Purpose

Track parity between canary/new tracking path and previous tracking path during cutover.

## Command

```bash
npm run parity:check -- \
  --new-path <new-aggregate.json> \
  --legacy-path <legacy-aggregate.json> \
  --threshold 0.05
```

## Input Contract

- new path JSON: aggregated counts by event name
- legacy path JSON: aggregated counts by event name
- supported shapes are defined by:
  - `apps/tracking-api/scripts/check-conversion-parity.ts`

## Report Template

- report time window: `<start_utc> -> <end_utc>`
- owner: `<name>`
- threshold: `<number>`
- status: `<pass|fail>`
- global metrics:
  - new total: `<number>`
  - legacy total: `<number>`
  - absolute delta: `<number>`
  - mismatch ratio: `<number>`
- per-event review:
  - list top mismatches by absolute delta
- decision:
  - `<continue canary|hold|rollback>`
- notes:
  - `<assumptions, anomalies, caveats>`

## Baseline Dry-run (2026-04-13)

This dry-run validates parity tooling flow only, not production canary acceptance.

- threshold: `0.20`
- input totals:
  - new: `120`
  - legacy: `120`
- global mismatch ratio: `0.03333333333333333`
- result: `pass`

Top per-event deltas:

- `purchase`: new `100`, legacy `98`, delta `2`
- `signup`: new `20`, legacy `22`, delta `2`

## Production Sign-off Checklist

- [ ] report generated from real canary window aggregates
- [ ] mismatch ratio within approved threshold
- [ ] outlier events explained and accepted
- [ ] data owner + release lead sign-off
