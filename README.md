# STRIKEEL

**Many Chains. One Equilibrium.**

STRIKEEL is an independent cross-chain DeFi risk dashboard. It reads positions on Ethereum, Solana, and Cardano, computes net market exposure, and previews a hedge against live Strike Finance perpetual markets.

> **Local demo only.** Strategy/activity routes are guarded to loopback by default (`STRIKEEL_LOCAL_ONLY=true`) and rate limited in-process, but there is no user auth or ownership model. Do not deploy publicly without adding both.

> **Simulation only.** No orders are sent to Strike. Indonesia is listed in Strike's Restricted Persons policy; live execution requires written authorization. See `docs/decisions/ADR-0001-execution-mode.md`.

## What works now (slices 001-002)

- Ethereum wallet + Uniswap V3 LP discovery via public RPC.
- Solana spot + USDC via public RPC.
- Cardano ADA via Koios.
- Normalized positions with provenance, freshness, and adapter versions.
- ETH LP delta (concentrated liquidity), net exposure in units and USD.
- Live Strike market snapshot: mark/index, funding, depth, margin tier.
- Hedge preview: 80% target, VWAP from depth, slippage, fee, funding, initial/maintenance margin, residual, reason codes.
- Next.js UI with a `SIMULATE` banner, `Preview only` notice, source timestamps, and no order path.
- SQLite persistence (`position_snapshots`, `risk_decisions`, strategies, mandates, intents, simulated orders/fills, audit events).
- Hedge Studio: create strategy -> activate mandate -> simulate -> FILLED -> activity, with reload persistence.
- Playwright E2E covers the full create/activate/simulate/reload flow.
- 43 tests across core math, exposure, hedge, execution state machine, Strike parsing, three adapters, SQLite persistence, and API routes (inactive/expired mandate + idempotency).

## Run

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @strikeel/web build
pnpm test:e2e
pnpm --filter @strikeel/web dev
```

Open http://localhost:3000.

Optional env (public defaults work):

```bash
EVM_RPC_URL=https://ethereum-rpc.publicnode.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
KOIOS_URL=https://api.koios.rest/api/v1
STRIKEEL_TAKER_FEE_BPS=5
STRIKEEL_LOCAL_ONLY=true
STRIKEEL_MARKET_CACHE_MS=10000
```

## Demo inputs

The UI pre-fills an Ethereum wallet with a real Uniswap V3 ETH/USDC position (token id `1387878`). Add Solana/ADA addresses to see three-chain exposure. Blank chains are skipped.

You can also call the API directly:

```bash
curl "http://localhost:3000/api/preview?eth=0x1085C42a2698c4f89251b7c27dbd5cE95CAae38B&ethTokenIds=1387878"
```

## Repository

```text
apps/web/                    Next.js UI + /api/preview
packages/core/               decimals, V3 math, exposure, hedge preview
packages/adapters/strike/    public market data + clock sync
packages/adapters/evm/       viem + Uniswap V3 position discovery
packages/adapters/solana/    SOL/USDC spot
packages/adapters/cardano/   ADA via Koios
docs/                        context pack, ADRs, scope, validation rules
scripts/demo-preview.ts      CLI end-to-end preview
```

## Boundaries

- Read-only external positions; no custody, no seed phrases.
- No live/testnet order submission.
- Solana/Cardano adapters are spot-only in this slice; protocol positions (Raydium, Kamino, Minswap) are planned.
- Not an official Strike Finance product.

## Next

1. Solana/Cardano protocol adapters (scope 003).
2. Demo script, submission copy, and evidence pack (scope 005).

See `docs/context/traceability.md` for mapping to the master spec.



