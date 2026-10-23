# Scope 001 - Evidence

- **Status:** signed off with notes (2026-10-23); human approved; MEDIUM follow-ups tracked
- **Date:** 2026-10-22
- **Scope:** `docs/scopes/001-exposure-to-hedge-preview.md`

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC1 LP amounts | met | `packages/core/test/uniswapV3.fixture.test.ts` uses `tests/fixtures/uniswap-v3-1387878.json` (block 26252256) and matches Uniswap SDK amounts within 1e-6. |
| AC2 net delta | met | `packages/core/test/exposure.test.ts`; live API returned ETH delta `0.8813...`. |
| AC3 provenance | met | Normalized positions carry chain/protocol/external id/block/timestamp/status/version; Cardano now derives `blockReference` from the UTXO height. |
| AC4 unsupported/partial | met | `exposure.test.ts` excludes `unsupported` and marks `partial` unhedgeable. |
| AC5 Strike freshness | met | `packages/adapters/strike/test/client.test.ts`; per-source timestamps fail closed; live API returns fresh/stale and blocks stale previews. |
| AC6 proposal fields | met | `hedge.test.ts` + live API preview includes size, VWAP, slippage, fee, funding, IM/MM, residual, tier, step rounding. |
| AC7 missing market/depth | met | `hedge.test.ts` covers insufficient depth, missing market, min/max size; missing snapshots keep positions visible as partial/unhedgeable with an `unhedgeable` response array. |
| AC8 constraints | met | `hedge.test.ts` covers notional, slippage, margin unknown/zero/utilization, residual, tier/step, divergence, leverage cap. |
| AC9 UI honesty | met | `apps/web/app/page.tsx` shows `SIMULATE`, `No orders submitted`, the literal `Preview only - no order submitted` banner, source timestamps, and blocked `not executable` markers. |
| AC10 no order call | met | No `/v2/order` in shipped source; static guard `packages/core/test/no-order-path.test.ts` + read-only surface test `packages/adapters/strike/test/no-order-method.test.ts`. |
| AC11 stale blocks | met | `hedge.test.ts` and `client.test.ts`; stale data returns `blocked` with `DATA_STALE`. |

## Test/build evidence

```text
pnpm test        -> 11 files, 32 tests passed
pnpm typecheck   -> exit 0
pnpm --filter @strikeel/web build -> success
pnpm test:e2e    -> E2E PASS (Next start + Chrome, live APIs, banner + preview row)
GET /api/preview (ETH+SOL+ADA, margin=10000) -> HTTP 200
```

Live UI screenshots:

- `docs/evidence/slice-001-e2e.png` (current: banner + timestamps + preview)
- `docs/evidence/slice-001.png` (earlier capture)

Live sample (2026-10-22):

- Portfolio value: ~$5,879 (ETH spot + Uniswap V3 LP)
- ETH: delta `0.8813...`, preview `proposed` SELL, size floored to `0.001`
- SOL/ADA: previews available when addresses are supplied; constraints/blocked reasons shown
- Market data: ETH/SOL/ADA `fresh`, live Strike mainnet

## Persistence

- `packages/db` uses `node:sqlite` with `position_snapshots` and `risk_decisions`.
- The `/api/preview` route saves every run; E2E produced 2 position snapshots and 1 risk decision.
- Database path: `apps/web/data/strikeel.sqlite` (gitignored).
- `packages/db/test/store.test.ts` verifies both tables.

## Known gaps

2. **Wallet connectors:** address input only; wagmi/Phantom/CIP-30 connectors are not wired.
3. **Solana/Cardano:** spot only; protocol LP/lending positions are scope 003.
4. **A11y:** no keyboard/contrast audit yet; frontend reviewer pending.
5. **Fee source:** `takerFeeBps` is assumed 5 bps; account-specific fee tier is scope 002.
6. **Liquidation buffer:** `marginHeadroomUsd` is margin headroom (IM - MM), not a liquidation price distance.

## Next review

`@orchestrator` -> `/validate 001`; QA + frontend are the remaining independent gates.


