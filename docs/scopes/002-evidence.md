# Scope 002 - Evidence

- **Status:** implemented - ready for independent review; not signed off
- **Date:** 2026-10-23
- **Scope:** `docs/scopes/002-hedge-studio-simulated-execution.md`

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC1 create + persist strategy | met | `POST /api/strategies` 201; `hedge_strategies` row; GET returns the strategy with mandate. |
| AC2 mandate gate | partial | Inactive/expired mandates return 400 with reason codes and are audited; `apps/web/test/strategies.test.ts` covers inactive and expired activation. Full allowed-markets/sides/automation/revoke schema is deferred (scope amendment). |
| AC3 state machine | met | `execution.test.ts`: proposed -> FILLED, blocked -> REJECTED, invalid transition throws, timeout -> UNKNOWN_REQUIRES_REVIEW, partial -> PARTIALLY_FILLED. |
| AC4 idempotency | met | Same key returns `idempotent: true` (API test); a different key after a fill recomputes existing hedge and produces `REJECTED WITHIN_TOLERANCE`; one fill. |
| AC5 simulated fill | met | API/E2E: fill at live VWAP with size/notional/fee/funding; UI `SIMULATED FILLED`. Values drift with live market data. |
| AC6 pending != filled | partial | `SUBMISSION_PENDING -> ENGINE_RECONCILIATION -> FILLED`; timeout/partial outcomes tested; unresolved intents block new simulate. No reconcile route yet (deferred). |
| AC7 audit | met | Activity includes create/activate, every execution state, `execution.blocked` and `execution.replayed`; screenshot `docs/evidence/slice-002-e2e.png`. |
| AC8 UI | met | Hedge Studio target/margin input, Live Strategies target/filled/residual/state, Activity payloads, `SIMULATE` labels. Fill card shows persisted margin utilization and market provenance. |
| AC9 no order path | met | `no-order-path.test.ts`, `no-order-method.test.ts` pass; no `/v2/order`/API-wallet headers. |
| AC10 reload | met | E2E reload: strategy, active mandate, FILLED intent, persisted fill (size/price/notional/fee), and activity. |
| AC11 stale/margin blocks | partial | `exposureObservedAt`/`exposureDataQuality` stored and stale data blocks; provenance is client-supplied in the demo, not server-derived. Unknown/zero margin blocks. |

## Test/build evidence

```text
pnpm test        -> 14 files, 43 tests passed
pnpm typecheck   -> exit 0
pnpm --filter @strikeel/web build -> success
pnpm lint        -> exit 0 (ESLint 9 + typescript-eslint)\npnpm test:e2e    -> PASS: create -> activate -> simulate -> FILLED -> reload persisted
pnpm audit --prod -> no known vulnerabilities
```

Live API flow (temp DB):

- strategy 201; activate 200; simulate 200 -> FILLED; duplicate simulate -> `idempotent: true`
- DB: 1 strategy, 1 mandate, 1 intent, 1 simulated order, 1 simulated fill, 10 audit events
- No order submitted; `simulated: true`

Screenshot: `docs/evidence/slice-002-e2e.png`

## Known gaps

Closed in the A hardening pass: route-level inactive/expired/idempotency tests; `EXECUTION_MODE` constant; configurable taker fee; `marginHeadroomUsd` naming; activity payloads in UI; schemaVersion; per-strategy lock; localhost guard; rate limiting; market cache; fill source/observedAt/adapterVersion; margin utilization in UI.

1. **Partial fills:** simulator currently fills the full size; partial-fill path is modeled but not exercised.
2. **Wallet connectors:** still address input only.
3. **Liquidation price:** margin headroom remains `IM - MM`, not a liquidation distance.
4. **Fee source:** defaults to 5 bps; override with `STRIKEEL_TAKER_FEE_BPS`.
5. **Auth:** localhost guard only; no user auth or ownership checks.
6. **Provenance:** exposure timestamps are still client-supplied; server-side preview snapshots deferred.
7. **Reconciliation:** unresolved intents block new simulations, but no reconcile route yet.

## Next review

Contracts, security, strike, frontend, QA; then human approval.



