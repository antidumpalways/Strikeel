# Scope 001 - Exposure to Hedge Preview (Ethereum + Uniswap V3)

- **Status:** Signed off with notes (2026-10-23); human approved; MEDIUM follow-ups tracked
- **Date:** 2026-10-22
- **Depends on:** `docs/context/project-brief.md`, `docs/architecture/overview.md`, `docs/decisions/ADR-0001-execution-mode.md`, `docs/decisions/ADR-0002-hackathon-delivery-cut.md`
- **Master sections:** 12-14 (exposure, LP, optimizer), 17 (Strike data), 20 (intent states), 32 (Hedge Studio), 42-43 (testing/acceptance)
- **Workstreams:** C (EVM adapter), D (risk), E (Strike read), A (UI), F (platform/QA)
- **Owner:** builder agent (implementation), orchestrator (scope control)

## 1. Goal

Prove the core loop end-to-end on the hardest case: read an Ethereum wallet and a Uniswap V3 LP position, compute the portfolio's ETH delta, and produce a capital-aware hedge preview using live Strike market data. No orders are submitted.

This slice establishes the risk engine, the Strike read adapter, and the explainable proposal that later slices extend to simulation, other chains, and rebalancing.

## 2. User story

As an ETH/USDC liquidity provider, I connect my wallet, see my current ETH exposure (spot + LP), choose an 80% hedge target, and receive a preview showing the required ETH-USD short, margin, funding, slippage, and residual exposure - with every number traceable to a source.

## 3. In scope

1. **Wallet access (read-only):** connect via wagmi/viem, or paste an address as fallback. No signatures required beyond connection.
2. **Position discovery (Ethereum):**
   - native ETH and USDC balances;
   - Uniswap V3 LP positions (NFT positions) with pool address, token IDs, ticks, liquidity, and current pool state (`sqrtPriceX96`, `tick`, decimals).
3. **Normalization:** `NormalizedPosition` with chain, protocol, external ID, assets, value, block reference, freshness, adapter version, and `unsupported` handling.
4. **Exposure engine:** ETH units delta, USD delta, LP effective delta at current price, net portfolio delta.
5. **Strike read adapter:** `exchangeInfo`, mark/index price, funding (`premiumIndex`), order-book depth, and margin-tier inputs for `ETH-USD`.
6. **Hedge preview:** target ratio (0-100%), required short size, VWAP/limit estimate from depth, estimated fee/slippage/funding, initial margin, residual delta, and reason codes.
7. **Persistence:** snapshot + proposal saved with inputs, timestamps, and engine version; reload is deterministic.
8. **UI:** one screen that shows positions, net exposure, hedge preview, data freshness, and an explicit "Preview only - no order submitted" banner.
9. **Audit trail:** a `risk_decisions` row for the preview (including the decision not to propose when constraints fail).

## 4. Acceptance criteria

| ID | Criterion |
|---|---|
| AC1 | Given a recorded wallet + pool fixture at block `B`, LP token amounts and USD value match the fixture within `1e-6` relative tolerance. |
| AC2 | Net ETH delta equals spot ETH + LP effective delta; USDC contributes zero ETH delta; aggregation is unit-consistent. |
| AC3 | Every position carries chain, protocol, external position ID, block/slot, observed timestamp, adapter version, and freshness status. |
| AC4 | Unsupported or partially decoded positions remain visible with `unsupported`/`partial` status and are excluded from the hedgeable delta. |
| AC5 | Strike snapshot includes symbol metadata, mark, index, funding, depth, and timestamps; data older than the configured TTL blocks the preview with a visible reason. |
| AC6 | For a target of 80%, the proposal reports required short size, residual delta, estimated slippage, fee, funding, initial margin, and liquidation buffer; recalculating from the same inputs produces identical output. |
| AC7 | If `ETH-USD` is unavailable or depth is insufficient, no order is proposed; residual unhedgeable exposure is reported. |
| AC8 | The proposal cannot exceed configured max notional, max leverage, max margin utilization, or max slippage; violations produce a rejection reason, not a clamped silent order. |
| AC9 | UI displays source timestamps and "Preview only - no order submitted"; no copy implies a live position or fill. |
| AC10 | The codebase contains no call to Strike `POST /v2/order`; a test asserts the simulate/read adapter cannot submit. |
| AC11 | A failed RPC or missing price marks data stale and disables the preview instead of using an unbounded fallback. |

## 5. Required tests

**Unit (pure, no network)**

- Decimal parsing/rounding; no IEEE-754 floats for money.
- Tick to price conversion; `amount0/amount1` from `sqrtPriceX96`, ticks, liquidity.
- LP effective delta and gamma estimate at in-range, boundary, and out-of-range prices.
- Net delta aggregation across assets.
- Hedge target: `target = -h * external delta`; existing-hedge adjustment.
- VWAP from depth; slippage and fee estimation.
- Margin/initial-margin estimate against a recorded market spec.
- Constraint enforcement (notional, leverage, margin, slippage, min size).
- Determinism: same inputs produce byte-identical proposal JSON (modulo timestamps).

**Integration**

- Fixture adapter -> normalized positions -> exposure vector.
- Recorded Strike responses (exchangeInfo, premiumIndex, depth) -> proposal.
- Live read smoke test is opt-in and never submits orders.
- Persistence round-trip preserves inputs and outputs.

**E2E**

- Address/connect -> positions -> exposure -> 80% preview -> reload -> identical proposal.
- Stale data and missing-market paths show the correct blocked state.

**Failure injection**

- RPC timeout, rate limit, reorg/out-of-range block, malformed pool response, empty order book, zero liquidity, token decimals mismatch.

**Property/invariant**

- Sum of position deltas equals portfolio delta.
- A target of 0% produces no hedge; 100% produces hedge <= external delta (subject to constraints).
- No proposal is produced from stale data.
- No simulated/live order state is created in this slice.

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Uniswap subgraph/indexer limits | No LP discovery | Prefer direct RPC + NFT enumeration; cache fixtures; allow manual token ID |
| Tick/liquidity math errors | Wrong delta | Spec tests against known positions; independent reviewer |
| Public RPC rate limits | Demo failure | Local fixture mode + one reliable RPC key |
| Decimal/precision mistakes | Financial error | `decimal.js` + BigInt boundaries; property tests |
| Wallet connect complexity | Time sink | Address-import fallback is first-class |
| Scope creep (Aave, Solana, Cardano) | Slice never finishes | Enforced out-of-scope list |
| Misleading UI | Trust/judging risk | "Preview only" gate + frontend review |

## 7. Out of scope

- Order submission, API wallet auth, builder connect, execution intents, simulated fills (slice 002).
- Solana/Cardano **protocol** adapters (Raydium, Kamino, Minswap). Spot adapters are included via the addendum below.
- Aave and other lending protocols.
- Historical exposure charts, scenario engine, autonomous rebalancing.
- Multi-user auth, roles, webhooks, SDK.
- Mobile, landing page polish beyond a minimal shell.

## 8. Evidence to produce

- `pnpm test` output (unit + integration) with pass counts.
- Fixture files (wallet, pool state, Strike responses) and their block/timestamp metadata.
- Screenshot of the preview and the blocked/stale state.
- Recorded Strike request/response log (no secrets).
- A short `docs/scopes/001-evidence.md` linking each AC to evidence.

## 9. Definition of done

All ACs pass; required tests exist and pass; build/typecheck/lint pass; security, originality, and evidence gates PASS; validation log entry signed by two independent reviewers; human approval recorded. Until then, status is **in progress**, never "done".

## 10. Next slices (recommended order)

| Slice | Content | Why |
|---|---|---|
| 002 | Execution intent + simulator + reconciliation + audit | Completes the Strike life-cycle story without violating policy |
| 003 | Solana (Raydium/Kamino) and Cardano (Minswap) protocol positions | Delivers the full three-chain promise beyond spot |
| 004 | Adaptive rebalance triggers + margin guardian | Stretch: shows continuous risk management |
| 005 | Demo script, README, submission packaging | Required for submission; converts working code into a judged submission |

## 11. Addendum (2026-10-22) - three-chain spot coverage

The owner made three-chain coverage mandatory for the submission. This slice therefore also includes read-only spot adapters for Solana (SOL/USDC) and Cardano (ADA via Koios), in addition to the EVM/Uniswap V3 path. This is a scope expansion, not a reduction: EVM LP remains the protocol-depth case, and Solana/Cardano protocol positions (Raydium, Kamino, Minswap) remain in slice 003. The evidence file records the live three-chain run.

