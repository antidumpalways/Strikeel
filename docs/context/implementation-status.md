# STRIKEEL — Implementation Status

**Snapshot:** 2026-10-23  
**Last pushed commit:** `fbe4e6f` — Initial commit: STRIKEEL cross-chain hedge simulator  
**Execution mode:** simulate only; Strike mainnet read-only; no order submission.

This document is the single-page answer to three questions: what we intend to build, what exists today, and what comes next. Detailed requirements remain in `docs/scopes/` and `docs/context/traceability.md`.

## 1. Product goal

STRIKEEL is an independent cross-chain DeFi risk-management application. It discovers a user's external positions on Ethereum, Solana, and Cardano, converts them into comparable market exposure, and previews a hedge against live Strike Finance perpetual markets.

**North star:** verified notional of external DeFi exposure actively managed under explicit risk mandates.

**What the product must do**

- Read positions without custody or private keys.
- Normalize multi-chain positions into units, USD notional, and delta.
- Preview a hedge using Strike market data: mark/index, funding, depth, margin tiers.
- Require a scoped, unexpired mandate before any execution action.
- Simulate the execution lifecycle and persist intents, fills, and audit events.
- Label every simulated action clearly in UI, API, and database.
- Block risk-increasing actions when data is stale or margin is insufficient.

**What it must not do (current phase)**

- No seed phrases, private keys, or custody.
- No live or testnet order submission.
- No `POST /v2/order` or API-wallet/builder headers.
- No claim of guaranteed protection or profit.
- No public deployment without authentication and ownership checks.

**Restricted-mode context:** Indonesia is a restricted jurisdiction under Strike's policy. Execution remains simulated. See `docs/decisions/ADR-0001-execution-mode.md`.

## 2. Status at a glance

| Area | Status | Notes |
|---|---|---|
| Scope 001 — exposure to hedge preview | Signed off with notes | Read-only three-chain exposure, Uniswap V3 delta, Strike preview, persistence, E2E |
| Scope 002 — Hedge Studio + simulated execution | Implemented; hardening A complete; **not signed off** | Contracts/security/QA returned `PASS_WITH_NOTES`; strike/frontend review and human approval pending |
| Scope 003 — protocol adapters | Planned | Solana/Cardano protocol positions beyond spot |
| Scope 005 — demo and submission pack | Planned | Demo script, submission copy, evidence pack |
| Quality gates | Passing | 14 test files / 43 tests, typecheck, lint, build, E2E |
| Repository | Pushed | `origin/main` at `fbe4e6f` |

## 3. What we set out to build

1. **Position discovery** across Ethereum, Solana, and Cardano using public RPC/APIs.
2. **Canonical exposure model** with units, USD value, delta, freshness, and provenance.
3. **Strike market integration** for mark/index price, funding, order-book depth, margin tiers, and server time.
4. **Hedge preview** with target ratio, VWAP, slippage, fees, funding, margin utilization, residual delta, and reason codes.
5. **Risk mandates** that scope and expire trading permission.
6. **Simulated execution state machine** with idempotency, pending/unknown states, partial/timeout outcomes, and audit events.
7. **Persistence** for positions, risk decisions, strategies, mandates, intents, simulated orders/fills, and audit activity.
8. **Operator UI** for exposure review, hedge preview, strategy creation, mandate activation, simulation, and activity.
9. **Evidence** that the flow works without an order path.

## 4. What is achieved

### 4.1 Multi-chain discovery

- Ethereum wallet discovery and Uniswap V3 position reads via public RPC (`packages/adapters/evm`).
- Solana SOL/USDC spot discovery (`packages/adapters/solana`).
- Cardano ADA discovery via Koios (`packages/adapters/cardano`).
- Normalized positions include source, observed timestamp, data status, and adapter version.
- Uniswap V3 concentrated-liquidity delta is computed in `packages/core/src/uniswapV3.ts`.

### 4.2 Core risk and hedge math

- Decimal-string money math; no float arithmetic for financial values.
- Exposure aggregation across chains and assets.
- Hedge preview in `packages/core/src/hedge.ts`: target ratio, existing hedge, adjustment size, VWAP from depth, slippage, fee, funding, initial/maintenance margin, margin headroom, margin utilization, leverage, residual delta, and reason codes.
- Blocking reasons include stale data, non-fresh positions, market not trading, price divergence, insufficient depth, min/max size, min notional, max notional, max slippage, leverage cap, and max margin utilization.

### 4.3 Strike integration

- Public market snapshot endpoint integration with clock sync.
- Market config cache (`STRIKEEL_MARKET_CACHE_MS`, default 10s).
- Taker fee default is configurable through `STRIKEEL_TAKER_FEE_BPS` (default 5 bps).
- No order method exists in the adapter; guard tests enforce this.

### 4.4 Simulated execution

- Explicit state machine: `INTENT_CREATED -> RISK_VALIDATED -> USER_AUTHORIZED -> ORDER_PREPARED -> SUBMISSION_IN_PROGRESS -> SUBMISSION_PENDING -> ENGINE_RECONCILIATION -> FILLED` plus `REJECTED`, `PARTIALLY_FILLED`, and `UNKNOWN_REQUIRES_REVIEW`.
- `EXECUTION_MODE` is a shared constant, not scattered string literals.
- Idempotency by key; replay returns the existing intent.
- Existing fills are summed so a duplicate key does not create a second fill.
- Unresolved intents block new simulations.
- Per-strategy in-process lock prevents concurrent double execution.
- Simulated fills persist market source, market observed time, adapter version, margin utilization, and schema version.

### 4.5 Persistence and audit

- SQLite store in `packages/db/src/index.ts` using `node:sqlite`.
- Tables: `position_snapshots`, `risk_decisions`, `hedge_strategies`, `hedge_mandates`, `execution_intents`, `simulated_orders`, `simulated_fills`, `audit_events`.
- Audit events cover create, activate, blocked execution, replayed execution, and every execution state.
- Migrations add provenance columns for existing local databases.

### 4.6 API and safety guards

- `GET /api/preview` — read-only portfolio, exposure, previews, markets.
- `GET/POST /api/strategies` — list/create strategies and mandates.
- `POST /api/strategies/[id]/activate` — activate/pause mandate with expiry audit.
- `POST /api/strategies/[id]/simulate` — execute the simulated lifecycle with idempotency.
- `GET /api/activity` — audit timeline, optionally filtered by strategy.
- Loopback guard by default (`STRIKEEL_LOCAL_ONLY=true`); opt out explicitly for non-local demos.
- In-process rate limits on create/activate/simulate.
- API responses include `executionMode` and `schemaVersion`.
- Error paths include stable reason codes.

### 4.7 UI

- Next.js Hedge Studio (`apps/web/app/hedge-studio.tsx`).
- `SIMULATE` and `Preview only` labels.
- Exposure summary, hedge preview, target/margin inputs.
- Create strategy, activate/pause mandate, simulate hedge, show activity.
- Live Strategies shows target, filled, residual, latest state, and reasons.
- Fill card shows size, price, notional, fee, margin utilization, market source, and observed time.
- Activity shows event payload/reason.
- Reload persistence is covered by E2E.

### 4.8 Tests and evidence

```text
pnpm test        -> 14 files, 43 tests passed
pnpm typecheck   -> exit 0
pnpm lint        -> exit 0
pnpm build       -> exit 0
pnpm test:e2e    -> PASS: create -> activate -> simulate -> FILLED -> reload
```

- Route-level tests cover inactive/expired mandates, idempotent replay, and single-fill behavior.
- Guard tests cover loopback decisions and rate limiting.
- No-order-path tests enforce the absence of write endpoints.
- Screenshots: `docs/evidence/slice-001-e2e.png`, `docs/evidence/slice-002-e2e.png`.
- Validation history: `docs/agents/validation-log.md` entries 014–017.

## 5. Scope 002 acceptance criteria

| AC | Status | Remaining gap |
|---|---|---|
| AC1 create + persist strategy | Met | — |
| AC2 mandate gate | Partial | Full allowed-markets/sides/automation/revoke schema deferred |
| AC3 state machine | Met | — |
| AC4 idempotency | Met | Duplicate and replay covered by API tests |
| AC5 simulated fill | Met | — |
| AC6 pending != filled | Partial | No reconcile route yet |
| AC7 audit | Met | — |
| AC8 UI | Met | Margin utilization and fill provenance now shown |
| AC9 no order path | Met | — |
| AC10 reload | Met | — |
| AC11 stale/margin blocks | Partial | Exposure provenance is still client-supplied |

## 6. What remains

### 6.1 B hardening — before or alongside Scope 002 sign-off

1. **Server-side preview provenance.** Persist preview snapshots and reference a snapshot ID when creating a strategy instead of trusting client exposure fields.
2. **Canonical asset identity.** Store chain + contract/policy + decimals, not symbol alone.
3. **Full mandate schema.** Allowed markets, allowed sides, automation permission, max order size, and explicit revoke.
4. **Reconciliation route.** Resolve `UNKNOWN_REQUIRES_REVIEW` and pending intents safely.
5. **Authentication and ownership.** Localhost guard is not user authentication; add identity and per-record ownership before any shared deployment.

### 6.2 Additional accepted gaps

- Partial-fill path uses full-size VWAP; not exercised end-to-end.
- Wallet connectors remain address inputs.
- Margin headroom is `IM - MM`, not a liquidation-price distance.
- Taker fee defaults to 5 bps; it is configurable but not sourced from the account tier.
- `next build` warns that the Next.js ESLint plugin is not installed; `pnpm lint` still passes.
- Project license is undecided; no `LICENSE` file has been added.
- Strike/frontend reviewers and human approval for Scope 002 are still pending.

### 6.3 Scope 003 — protocol adapters

- Solana protocol positions beyond spot (e.g. Raydium/Kamino).
- Cardano protocol positions beyond spot (e.g. Minswap).
- Preserve the same provenance, freshness, and risk-blocking rules.

### 6.4 Scope 005 — demo and submission pack

- Deterministic demo flow and script.
- Submission copy with honest limitations.
- Final evidence pack and screenshot set.
- Accessibility and honesty review.

## 7. Next sequence

1. Human reviews the running UI (in progress).
2. Choose: approve Scope 002 with notes, or complete B hardening first.
3. Dispatch strike and frontend reviewers for Scope 002.
4. Record validation entry, then orchestrator sign-off and human approval.
5. Start Scope 003 after sign-off.
6. Finish with Scope 005 demo/submission pack.

## 8. How to run and review

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @strikeel/web dev
```

Open `http://localhost:3000`.

Review path:

1. Check the `SIMULATE` / `Preview only` labels.
2. Click **Analyze portfolio** with the prefilled Ethereum wallet.
3. Inspect portfolio value, exposure, hedge preview, and market provenance.
4. Create a hedge strategy.
5. Activate the mandate.
6. Simulate the hedge and inspect the persisted fill.
7. Open activity and reload the page to verify persistence.
8. Pause the mandate and attempt simulation; it must be blocked.

Useful environment variables (see `.env.example`):

```bash
STRIKEEL_DB_PATH=./data/strikeel.sqlite
STRIKEEL_TAKER_FEE_BPS=5
STRIKEEL_LOCAL_ONLY=true
STRIKEEL_MARKET_CACHE_MS=10000
```

## 9. Open decisions and risks

| Decision / risk | Impact | Current stance |
|---|---|---|
| License choice | Blocks a clean public release | Undecided; no license file |
| Auth/ownership model | Blocks shared or public deployment | Local-only demo guard |
| Exposure provenance trust | Risk of client-supplied stale/incorrect exposure | Deferred to B |
| Reconcile behavior | Unknown intents can block a strategy | Manual/deferred |
| Partial fills | Simulator does not model partial VWAP | Accepted gap |
| Live API dependency | Preview/simulation need Strike network access | Public endpoints; failures are surfaced |
| Deadline | B plus Scope 003/005 may exceed remaining time | Prioritize sign-off and demo path |

## 10. Source-of-truth map

- Product blueprint: `Strikeel.txt` (outside the app tree).
- Scope 001: `docs/scopes/001-exposure-to-hedge-preview.md`.
- Scope 002: `docs/scopes/002-hedge-studio-simulated-execution.md`.
- Evidence: `docs/scopes/001-evidence.md`, `docs/scopes/002-evidence.md`.
- Validation: `docs/agents/validation-log.md`.
- Execution policy: `docs/decisions/ADR-0001-execution-mode.md`.
- Traceability: `docs/context/traceability.md`.
