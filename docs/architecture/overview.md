# STRIKEEL â€” Architecture Overview

- **Status:** Proposed â€” awaiting approval
- **Version:** 0.1
- **Date:** 2026-10-20
- **Related:** `docs/context/project-brief.md`, `docs/context/traceability.md`, `docs/decisions/ADR-0001-execution-mode.md`, `docs/decisions/ADR-0002-hackathon-delivery-cut.md`, `docs/agents/workstreams.md`
- **Owner decisions:** mainnet-only (no testnet); three chains mandatory (Ethereum, Solana, Cardano); execution simulated.

## 1. System boundary

STRIKEEL is an independent web application with its own identity, database, risk engine, and execution orchestration. It does **not** custody user assets, deploy smart contracts, or act as an exchange.

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Browser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Next.js UI: Portfolio Â· Exposure Â· Hedge Studio Â· Risk Center     â”‚
â”‚  Wallet connectors (EVM / Solana / Cardano CIP-30; read-only)       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                â”‚ HTTPS (same-origin API)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  App API / BFF (Next.js route handlers, Zod validation, session)    â”‚
â”‚  Identity Â· Portfolio Â· Risk Â· Strategies Â· Execution Â· Audit       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚                               â”‚
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Domain packages (pure TS)   â”‚  â”‚  Adapters                         â”‚
â”‚  asset registry              â”‚  â”‚  EVM RPC / Uniswap / Aave         â”‚
â”‚  positions â†’ exposure        â”‚  â”‚  Solana RPC / Raydium / Kamino    â”‚
â”‚  hedge optimizer             â”‚  â”‚  Cardano CIP-30 / Blockfrost      â”‚
â”‚  policy + mandate            â”‚  â”‚  Strike REST + WS                 â”‚
â”‚  execution state machine     â”‚  â”‚                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                â”‚                               â”‚
        â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”              â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ SQLite/Postgresâ”‚              â”‚ Strike API     â”‚
        â”‚ Drizzle schema â”‚              â”‚ (read + sim)   â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## 2. Layers

| Layer | Responsibility | Must not |
|---|---|---|
| `apps/web` | UI, session, route handlers | Contain risk math or signing logic |
| `packages/core` | Assets, positions, exposure, hedge, policy, state machine | Call the network or read env directly |
| `packages/adapters/*` | Chain/protocol/Strike I/O, normalization | Make trade decisions |
| `packages/db` | Schema, migrations, repositories | Leak SQL into UI |
| `tools/reconcile` | Manual/CLI reconciliation job for the demo | Run inside a request handler |

The MVP is a **modular monolith**. A separate always-on worker and queue (BullMQ/Redis) is post-hackathon; the execution intent table remains the durable source of truth. The deviation from master spec Â§23 is recorded in `ADR-0002`.

### 2.1 Bounded contexts (Â§24)

| Context | Owns | Package | Must not |
|---|---|---|---|
| Identity | Users, sessions, wallet links, challenges | `packages/core/identity` | Calculate risk or place orders |
| Portfolio | Adapters, discovery, snapshots, normalization | `packages/adapters/*`, `packages/core/portfolio` | Decide hedges |
| Risk | Exposure, LP valuation, optimizer, scenarios | `packages/core/risk` | Call Strike or sign |
| Trading | Strike connection, orders, fills, reconciliation | `packages/adapters/strike`, `packages/core/trading` | Redefine portfolio normalization |
| Automation | Mandates, triggers, policy, scheduling, kill switch | `packages/core/policy` | Bypass trading reconciliation |
| Reporting | Audit, attribution, exports, notifications | `packages/core/reporting` | Mutate source records |

Contexts communicate through typed contracts and versioned events, never through each other's internals.

### 2.2 Core domain objects (Â§10, Â§12, Â§14, Â§19, Â§20)

| Object | Purpose | Source of truth |
|---|---|---|
| `NormalizedPosition` | Chain/protocol position with assets, liabilities, freshness | Portfolio context |
| `ExposureVector` | Per-asset delta/gamma, USD notional, hedge availability | Risk context |
| `HedgeProposal` | Target, order, cost, margin, residual, reason codes | Risk context |
| `HedgeMandate` | User-approved limits, markets, expiry, automation | Automation context |
| `ExecutionIntent` | Durable, idempotent trade intention + state | Trading context |
| `AuditEvent` | Append-only decision/execution record | Reporting context |

All financial fields are decimal strings; identifiers are UUID/ULID; no object is considered valid without timestamps and provenance.


## 3. Data flow

1. **Link/read wallets** â†’ ownership challenge or read-only address import. Wallet connection is not trading permission.
2. **Index positions** â†’ adapters produce `NormalizedPosition` with chain, protocol, external ID, assets, liabilities, block/slot, status, adapter version.
3. **Compute exposure** â†’ per asset: units delta, USD delta, gamma estimate, hedge market availability.
4. **Snapshot Strike market** â†’ metadata, mark/index, funding, depth, margin tier.
5. **Optimize hedge** â†’ target = `âˆ’h Ã— external delta`, constrained by notional, leverage, margin, slippage, min size, market support.
6. **Authorize mandate** â†’ explicit, scoped, expiring permissions.
7. **Create execution intent** â†’ durable, idempotent, single-writer per strategy.
8. **Submit or simulate** â†’ `EXECUTION_MODE=simulate` records a paper order against the live book; never calls `POST /v2/order`.
9. **Reconcile** â†’ REST/WS in live mode; deterministic simulator in demo mode. Pending â‰  filled.
10. **Audit** â†’ append-only event with reason codes and evidence.

### 3.1 Domain events (Â§26)

```text
wallet.linked / wallet.unlinked
portfolio.position.discovered / portfolio.position.updated / portfolio.snapshot.completed
exposure.updated / risk.threshold.breached
hedge.target.changed / hedge.rebalance.proposed / hedge.rebalance.skipped
mandate.created / mandate.revoked
execution.intent.created / execution.order.submitted / execution.order.reconciled
execution.fill.confirmed / execution.order.failed
system.data.stale / system.execution.paused
```

Events are versioned, immutable, and carry `occurredAt`, `correlationId`, and provenance. The demo may persist events in a single `audit_events` table; the schema is queue-ready for post-hackathon workers.

### 3.2 Data model (hackathon subset of Â§25)

| Table | Purpose | Slice |
|---|---|---|
| `users`, `sessions` | Identity | 003 |
| `wallet_links`, `wallet_challenges` | Verified wallets, single-use challenges | 003 |
| `asset_registry` | Canonical chain asset IDs + decimals | 001 |
| `protocol_registry`, `protocol_positions`, `position_snapshots` | Normalized positions + history | 001 |
| `price_observations` | Price, source, timestamp, block/slot | 001 |
| `exposure_snapshots` | Risk state per computation | 001 |
| `strike_connections`, `trading_key_references` | Authorized venue links / key refs (not in demo) | 003 |
| `hedge_strategies`, `hedge_mandates`, `hedge_targets` | Strategy + mandate + target | 002 |
| `risk_decisions` | Allow/adjust/reject/skip + reason codes | 001 |
| `execution_intents`, `simulated_orders`, `simulated_fills` | Durable execution state | 002 |
| `hedge_rebalances`, `funding_events` | Adjustment + funding history | 004 |
| `audit_events`, `system_health` | Audit + adapter/worker health | 001 |

Post-hackathon tables (`webhook_deliveries`, multi-tenant fields, worker leases) are defined in the production schema, not the demo.


## 4. Proposed stack (hackathon)

| Concern | Choice | Why |
|---|---|---|
| Web | Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, TanStack Query | Fast UI, same-origin API |
| Domain | Pure TypeScript packages, `decimal.js`, BigInt for raw token units | Deterministic math |
| Validation | Zod at every boundary | Runtime safety |
| DB | SQLite via 
ode:sqlite (demo); Postgres + Drizzle is the production target | Zero-ops demo |
| EVM | viem + wagmi | Standard, typed |
| Solana | `@solana/web3.js`, Wallet Standard | Read-only balances first |
| Cardano | CIP-30 connector + Blockfrost/Maestro if key exists | Degrade to address import |
| Charts | Lightweight Charts or Recharts | Exposure/coverage visuals |
| Monorepo | pnpm workspaces | Package ownership |

**Not in MVP:** Redis, BullMQ, managed Postgres, KMS, separate API server. Revisit when live execution is authorized.

### 4.1 Product surfaces (master Â§27â€“35)

| Surface | Purpose | Hackathon |
|---|---|---|
| Overview | Portfolio value, exposure, coverage, margin health | Minimal cards |
| Portfolio | Wallets, positions by chain/protocol, inspector | Slice 001 |
| Exposure | Net/gross delta, attribution, stress | Slice 001 (net delta) |
| Hedge Studio | Sources â†’ objective â†’ constraints â†’ preview â†’ authorize â†’ activate | Slice 001 (preview only) |
| Live Strategies | Strategy state, rebalances, pause/revoke | Slice 002/004 |
| Risk Center | Limits, margin guardian, kill switch | Slice 004 |
| Activity | Timeline of decisions, orders, fills, funding | Slice 002 |
| Integrations | Wallet/Strike connections, API keys | Slice 003 |
| Settings | Profile, policy defaults, disclosures | Slice 005 |
| Landing | Positioning, how it works, security, FAQ | Slice 005 |

Navigation, landing copy, and full visual design are intentionally deferred; the master spec Â§28â€“35 remains the reference. **Submission requires all three chains**; the EVM-first build order is a sequencing choice, not a scope reduction.


## 5. Strike integration (verified 2026-10-20)

### 5.1 Base URLs

| Purpose | URL |
|---|---|
| Main REST | `https://api.strikefinance.org` |
| Price REST | `https://api.strikefinance.org/price` |
| Stats REST | `https://api.strikefinance.org/stat` |
| Public market WS | `wss://api.strikefinance.org/ws/price` |
| User WS (API wallet) | `wss://api.strikefinance.org/ws/user-api` |
| Testnet | Not used â€” owner decision: mainnet-only, read-only |

### 5.2 Endpoints used by the MVP

| Need | Endpoint | Auth |
|---|---|---|
| Connectivity / clock | `GET /v2/ping`, `GET /v2/time` | Public |
| Market metadata | `GET /price/v2/exchangeInfo`, `GET /v2/markets` | Public |
| Prices / funding | `GET /price/v2/markPrice`, `/premiumIndex` | Public |
| Order book | `GET /price/v2/depth?symbol=ETH-USD&limit=â€¦` | Public |
| Candles | `GET /price/v2/klines` | Public |
| Open interest | `GET /price/v2/openInterest` | Public |
| Funding comparison | `GET /stat/v1/stats/coin/funding-rate-comparison` | Public |
| Account (future) | `GET /v2/account`, `/v2/balances`, `/v2/positions`, `/v2/openOrders` | API wallet |
| Order (future) | `POST /v2/order`, `DELETE /v2/order/cancel` | API wallet |
| Builder connect (future) | `POST /auth/builder/request-signature`, `/verify-signature` | Public |

Observed market set includes crypto and 24/7 equities/commodities (BTC, ETH, SOL, ADA, HYPE, TSLA, NVDA, SP500, XAU, WTI, â€¦). Do not assume a market exists; resolve from `exchangeInfo`.

### 5.3 Auth model

- Ed25519 API wallet keypair generated client-side.
- Headers: `X-API-Wallet-Public-Key`, `X-API-Wallet-Signature`, `X-API-Wallet-Timestamp` (seconds), `X-API-Wallet-Nonce`.
- Signed message: `METHOD:PATH:TIMESTAMP:NONCE:BODY_HASH`; `BODY_HASH` = SHA-256 of raw JSON body (empty-body hash for GET).
- Timestamp window Â±3 minutes; nonce single-use; user WS logs on with `session.logon:{ts_ms}:{apiKey}`.
- **Clock skew:** use `GET /v2/time` and sign with server time. Observed local offset was ~4 minutes; a local-clock signature returned `401 signature expired or invalid timestamp`.
- Public data requires no key. Trading requires an authorized account and is disabled in this project.

### 5.4 Simulation contract

`EXECUTION_MODE=simulate` is enforced at the adapter boundary:

- the only allowed network calls are reads;
- a test asserts `POST /v2/order` is never invoked in simulate mode;
- paper fills are generated from the live order book with explicit `SIMULATED` provenance;
- UI, API responses, audit events, and demo footage must label the mode.

### 5.5 Execution and margin semantics (Â§20â€“21)

The risk engine mirrors Strike's published math (verified against `strike-builder-reference/src/math`):

| Quantity | Formula |
|---|---|
| Notional | `mark Ã— |size|` |
| Unrealized PnL | `(mark âˆ’ entry) Ã— size` (signed size) |
| Initial margin | `notional / leverage` |
| Maintenance margin | `notional Ã— MMR âˆ’ MA` (tier lookup) |
| Funding | `âˆ’size Ã— mark Ã— hourlyRate` at HH:00 UTC |
| Order cost | limit/market reserve per symbol leverage, plus opening-fee reserve |

Rules: margin tiers and leverage come from `/v2/markets`; liquidation price uses cross/isolated formulas from the reference implementation; fees, funding, and builder fees are estimated separately and disclosed. The engine must reject proposals that violate margin, notional, leverage, or slippage constraints.

## 6. Trust model

| Actor/data | Trust assumption | Mitigation |
|---|---|---|
| Chain RPC | Returns canonical state; may lag or reorg | Block/slot reference, finality check, staleness block |
| Protocol adapters | Correctly decode positions | Versioned adapters, fixtures, `unsupported` status |
| Strike market data | Authoritative venue data, not infallible | Timestamp checks, REST reconciliation |
| Strike execution | Async and may reject/partially fill | Durable intents, no blind retry, actual fills only |
| Operator | Holds any trading key in live mode | KMS, minimize scope, disclose in UI; not applicable to simulation |
| Price sources | Can diverge | Provenance per observation; block decisions on divergence |

STRIKEEL never holds user chain private keys or seed phrases. External positions remain under user custody.

## 7. Execution state machine

```text
INTENT_CREATED â†’ RISK_VALIDATED â†’ USER_AUTHORIZED â†’ ORDER_PREPARED
   â†’ SUBMISSION_IN_PROGRESS â†’ SUBMISSION_PENDING â†’ ENGINE_RECONCILIATION
       â”œâ”€â”€ WORKING
       â”œâ”€â”€ PARTIALLY_FILLED
       â”œâ”€â”€ FILLED
       â”œâ”€â”€ REJECTED
       â”œâ”€â”€ CANCELED
       â””â”€â”€ UNKNOWN_REQUIRES_REVIEW
```

Rules: one durable intent per strategy/account action; unique internal ID; never infer fills from `pending`; on timeout reconcile before retry; a confirmed fill mutates the ledger exactly once; crash recovery resumes from the DB.

## 8. Failure behavior (summary)

| Failure | Behavior |
|---|---|
| Chain RPC down / stale | Mark positions stale; block risk-increasing actions |
| LP indexer behind | Show age; disable unsafe rebalance |
| Price divergence | Suspend affected decisions; show reason |
| Strike read timeout | Use last snapshot only if within TTL; otherwise block |
| Simulated submission timeout | Reconcile simulated state; never auto-resubmit |
| Missing market | Report residual unhedgeable exposure; no synthetic symbol |
| Insufficient margin | Reject the proposal; suggest smaller coverage |
| Mandate revoked | Block new intent; keep existing hedge state visible |

### 8.1 Adaptive rebalancing and scenarios (Â§15â€“16)

- **Triggers:** residual delta beyond tolerance, LP composition change, position open/close, collateral/liability change, volatility regime, funding spike, margin insufficiency, mandate change, manual request.
- **Policies:** threshold, time-gated, cost-aware, volatility-adaptive, capital-aware.
- **Anti-churn:** minimum adjustment, cooldown, hysteresis, depth check, duplicate-intent suppression, per-window cap.
- **Scenarios:** deterministic shocks (ETH âˆ’10%, SOL âˆ’20%, ADA +30%, broad decline, correlation break, liquidity drop, funding reversal, LP withdrawal, oracle divergence, Strike rejection, hedge liquidation, RPC failure) compared unhedged vs current vs proposed vs proposed-with-costs.
- **Disclosure:** delta hedging does not eliminate impermanent loss; scenario results are deterministic, not probabilities.

Slice 001 computes exposure only; slices 002/004 implement intents, rebalancing, and the margin guardian.

## 9. What the system does not do

- Custody, transfer, bridge, or withdraw user assets.
- Guarantee hedge effectiveness, profit, or liquidation safety.
- Submit live mainnet orders while the restricted-jurisdiction policy applies; no testnet is used.
- Treat wallet connection as trading authorization.
- Replace legal, tax, or investment advice.

## 10. Deployment (demo)

- Local: `pnpm dev`, SQLite file, no secrets committed.
- Optional: web on Vercel with a hosted Postgres; no worker in the request path.
- Secrets: `.env.local` only, gitignored. Simulation needs no Strike key.
- Evidence: recorded endpoint logs, test output, screenshots, and a labeled demo script.

### 10.1 Developer surface (Â§36â€“38)

Post-hackathon only: `@strikeel/core|identity|portfolio|exposure|hedge|strike-adapter|sdk`, internal REST API (`/api/v1/...`), signed webhooks, SDK examples. The hackathon exposes only the same-origin BFF needed by the UI; no public API, no webhook secrets, no published packages.

### 10.2 Delivery phases (Â§47) mapped to slices

| Master phase | Hackathon slice | Exit evidence |
|---|---|---|
| A â€” Architecture foundation | Phase 1 docs | Approved context pack |
| B â€” Unified portfolio | 001 (EVM) + 003 (SOL/ADA, required) | Positions + freshness on all three chains |
| C â€” Exposure intelligence | 001 | Delta + USD exposure |
| D â€” Hedge planning | 001/002 | Preview + mandate |
| E â€” Strike execution | 002 (simulated) | Intent state machine + reconciliation |
| F â€” Autonomous operations | 004 | Rebalance policy + margin guardian |
| G â€” Platform expansion | post-hackathon | SDK/API/webhooks |

## 11. Open architecture decisions

1. ADR-0002: hackathon delivery cut (monolith, SQLite, no queue/worker) â€” recorded.
2. ADR-0003: asset identity and price provenance schema.
3. ADR-0004: adapter priority (Uniswap â†’ Raydium â†’ Minswap) and MVP coverage.
4. ADR-0005: production key management (KMS/HSM) before any live execution.
5. ADR-0006: live execution authorization, if written permission is granted.

