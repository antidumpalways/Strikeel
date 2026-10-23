# Scope 002 - Hedge Studio + Simulated Execution

- **Status:** Implemented - ready for independent review; not signed off
- **Date:** 2026-10-23
- **Depends on:** Scope 001 (signed off), `ADR-0001` (simulation), `ADR-0002` (delivery cut)
- **Master sections:** 14 (optimizer), 19 (mandates), 20 (execution), 21 (margin), 32-35 (Hedge Studio, strategy monitor, risk center, activity)
- **Workstreams:** D (risk), E (execution), A (UI), F (platform/QA)

## 1. Goal

Turn the signed-off preview into a product workflow: a user creates a hedge strategy, explicitly authorizes a mandate, and runs a **simulated** order lifecycle against the live Strike order book. Pending is never treated as filled; every decision and transition is persisted and auditable. No orders are sent to Strike.

## 2. User story

As a portfolio owner, I see my exposure, open Hedge Studio, choose a target ratio and constraints, review the margin/cost/residual preview, authorize a mandate, and simulate the hedge. I then see the strategy state, simulated fill, remaining risk, and the full audit trail after reload.

## 3. In scope

1. **Hedge Studio UI:** source selection (portfolio/asset), target ratio, constraints, simulated margin, preview, authorize, activate.
2. **Strategy + mandate model:** allowed markets/sides, max notional, max leverage, max margin utilization, max slippage, expiry, automation flag (default off), revoke.
3. **Execution intent state machine:** `INTENT_CREATED -> RISK_VALIDATED -> USER_AUTHORIZED -> ORDER_PREPARED -> SUBMISSION_IN_PROGRESS -> SUBMISSION_PENDING -> ENGINE_RECONCILIATION -> FILLED | PARTIALLY_FILLED | REJECTED | CANCELED | UNKNOWN_REQUIRES_REVIEW`.
4. **Simulation transport:** paper fill from live depth (VWAP, partial fill, slippage, fees, funding); label `SIMULATED` in API/DB/UI.
5. **Reconciliation:** deterministic simulator; no blind retry; duplicate-intent suppression; single writer per strategy.
6. **Persistence:** SQLite tables for `hedge_strategies`, `hedge_mandates`, `execution_intents`, `simulated_orders`, `simulated_fills`, `audit_events`.
7. **API:** create strategy, activate mandate, revoke, simulate execution, list strategies, read activity.
8. **UI:** Live Strategy Monitor + Activity timeline, coverage/residual/margin status, `SIMULATED` badges.
9. **Audit:** every create/activate/simulate/skip/reject/fill event with reason codes.

### 3.1 Scope amendment (2026-10-23)

- The mandate record stores `active` and `expiresAt`; notional/leverage/margin/slippage limits live in the strategy constraints and are enforced by the preview engine. The allowed market is the strategy symbol; the side is derived from the delta.
- Full `allowedMarkets`/`allowedSides`/automation flag/revoke flow is deferred to scope 003. AC2 and AC8 therefore remain **partial**.
- The UI exposes target ratio and simulated margin; other constraints use documented defaults.
- The simulator supports full, partial (`PARTIALLY_FILLED`), and timeout (`UNKNOWN_REQUIRES_REVIEW`) outcomes; fills use live VWAP.


## 4. Acceptance criteria

| ID | Criterion |
|---|---|
| AC1 | A strategy can be created from the current exposure and persisted with target, constraints, margin, and expiry. |
| AC2 | Execution is impossible without an active, unexpired mandate; revoked/expired mandates block with a reason. |
| AC3 | The state machine rejects invalid transitions and records every transition with timestamps and evidence. |
| AC4 | Duplicate simulate requests return the same intent (idempotency); no duplicate intents per strategy/action. |
| AC5 | Simulated fill uses live depth/VWAP; insufficient depth or size limits produce a blocked/rejected state, never a partial silent fill. |
| AC6 | `pending` is never treated as filled; unresolved/timeout paths end in `UNKNOWN_REQUIRES_REVIEW` and require REST-style reconciliation. |
| AC7 | Every strategy decision, including "skip", is persisted in `audit_events` and visible in Activity. |
| AC8 | UI shows strategy state, coverage ratio, residual delta, margin utilization, and `SIMULATED` labels; no live claims. |
| AC9 | No `/v2/order`, no API-wallet headers, no builder-fee header; guard tests prove the simulate transport cannot submit. |
| AC10 | Reloading the page shows the persisted strategy, mandate, simulated fill, and history. |
| AC11 | Stale market/position data, unknown margin, or insufficient margin blocks risk-increasing simulation. |

## 5. Required tests

- Unit: state machine transitions, invalid transitions, idempotency, mandate expiry/revoke, policy limits, simulator VWAP/partial fill, audit events.
- Integration: API create/activate/simulate/list/activity; DB round-trip; reload.
- Failure injection: stale data, unknown margin, zero margin, empty book, insufficient depth, duplicate request, simulated timeout.
- E2E: create strategy -> authorize -> activate -> simulate -> filled -> reload -> history.
- Guard: no order/auth headers; simulate transport has no write method.

## 6. Out of scope

- Live or testnet order submission; API wallet keys; builder fee (all deferred until written authorization and a superseding ADR).
- Real wallet connectors (address input remains).
- Solana/Cardano protocol positions; autonomous worker/rebalancing; SDK/webhooks.
- Liquidation-price engine; current margin headroom remains labeled as headroom.

## 7. Risks

| Risk | Mitigation |
|---|---|
| State machine allows invalid/false fill | Explicit transition table + tests; pending != filled |
| Duplicate simulation | Durable idempotency key + unique index |
| Misleading demo | `SIMULATED` in API/DB/UI + demo disclaimer |
| Mandate bypass | Policy check at the execution boundary, not UI-only |
| Persistence drift | DB round-trip + reload E2E; schema version |

## 8. Evidence

- Test output, E2E screenshot (strategy + fill + activity), DB rows (strategy/mandate/intent/fill/audit), API logs.
- Validation log entries from two independent reviewers.

## 9. Definition of done

All ACs pass; tests/build/typecheck/gates PASS; 2 independent reviewers + human approval; no live orders. Until then status is in progress.

## 10. Next

Scope 003: Solana/Cardano protocol adapters; scope 004: adaptive rebalance; scope 005: demo/submission packaging.


