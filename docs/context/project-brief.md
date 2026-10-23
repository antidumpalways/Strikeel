# STRIKEEL â€” Project Brief

- **Status:** Phase 1 draft â€” awaiting human approval
- **Version:** 0.1
- **Date:** 2026-10-20
- **Source brief:** `../../../Strikeel.txt` (v1.0, Oct 2026) â€” reference only, not shipped
- **Source of truth:** `Strikeel.txt` is the master product/technical blueprint. This brief is the hackathon cut; `docs/context/traceability.md` maps every master section to a document, a slice, or a deferred item. No section may be silently dropped.
- **Hackathon:** Strike Hackathon. Build window opens 2026-10-21 10:00 EST; submission deadline 2026-10-23 10:00 EST.
- **One-liner:** STRIKEEL turns fragmented cross-chain DeFi positions into one measurable risk portfolio, then uses Strike Finance as the perpetual hedging execution venue.

## 1. Vision

Make cross-chain market risk visible, measurable, and manageable from one application. STRIKEEL is an independent DeFi risk-management dApp, powered by Strike Finance â€” not an official Strike product.

## 2. Problem

A single user can hold liquidity on Uniswap, lending positions on Aave/Kamino, LP tokens on Minswap, and treasury assets across Ethereum, Solana, and Cardano. Each protocol reports its own state, but the user cannot answer cross-protocol questions:

- What is my net ETH / SOL / ADA exposure?
- How much do I lose if the market drops 20%?
- How much hedge is required, and can my Strike margin support it?
- Is the hedge still correct after an LP rebalances?

Portfolio trackers show value. Trading terminals place orders. Neither connects external DeFi exposure to capital-aware, continuously reconciled hedging.

## 3. Target users

| Priority | Persona | Core job |
|---|---|---|
| P0 | DeFi liquidity provider (ETH/SOL/ADA pools) | Measure LP delta and hedge it without leaving the pool |
| P1 | DAO treasury manager | Consolidated exposure, policy-driven downside control, audit trail |
| P2 | DeFi portfolio manager | Net exposure across lending, LP, and perps |
| P3 | Protocol developer | Embed hedging via API/SDK |

### Jobs to be done (Â§6)

| User objective | STRIKEEL responsibility |
|---|---|
| See all DeFi exposure | Discover and normalize positions |
| Understand downside risk | Asset and portfolio stress analyses |
| Reduce directionality | Feasible hedge targets |
| Minimize hedging cost | Evaluate execution, funding, margin, turnover |
| Keep the hedge aligned | Detect changes; propose or execute adjustments |
| Avoid unmanaged trading | Enforce mandates and policies |
| Explain activity | Preserve decision reasons and execution receipts |
| Embed risk management | Developer APIs and SDK |

## 4. Scope

### 4.1 Hackathon MVP (must ship)

1. Read-only portfolio discovery for **Ethereum, Solana, and Cardano** (submission requires all three; build order is EVM first, then SOL/ADA).
2. Normalized position model with explicit freshness and provenance.
3. Exposure engine: spot delta, LP delta (concentrated liquidity aware), net delta in units and USD.
4. Strike integration that is product-critical:
   - live market metadata, mark/index price, funding, order-book depth;
   - margin and liquidation estimate using Strike-published formulas;
   - hedge optimization (target ratio, constraints, residual exposure);
   - durable execution-intent state machine with reconciliation;
   - **simulation mode only** under the current jurisdiction constraint (see ADR-0001).
5. Hedge Studio UI that produces an explainable, auditable proposal.
6. Audit/decision log: why a hedge was proposed, skipped, or simulated.

### 4.2 Post-hackathon

- Live execution after written authorization and jurisdiction eligibility.
- More adapters (Aave, Kamino, Liqwid), Solana/Cardano protocol positions.
- SDK, webhooks, treasury approval workflows, multi-tenant policies.
- Production secrets (KMS), managed Postgres/Redis, always-on workers.

### 4.3 Full product scope (master spec) vs hackathon cut

| Capability area | Master spec | Hackathon cut | Deferred to |
|---|---|---|---|
| Identity & multi-wallet | Â§9; one user, many proven wallets | Read-only connect/address import | Slice 003+ |
| Position indexer | Â§10â€“11; EVM/SOL/ADA, LP/lending | EVM spot + Uniswap V3 first; SOL/ADA required before submission | Slices 001/003 |
| Exposure & risk | Â§12â€“13; delta, gamma, liabilities, stress | Delta + LP delta; preview | Slices 001/004 |
| Hedge optimization | Â§14; cost/capital-aware, proxy rules | Basic target + constraints | Slice 002/004 |
| Strike integration | Â§17â€“21; account, mandate, execution, reconciliation | Read + preview + simulated intent | Slices 001/002 |
| Automation | Â§15; rebalance, margin guardian, anti-churn | Not in MVP | Slice 004 |
| Scenarios | Â§16; shocks, correlation, failures | Deterministic preview only | Post-hackathon |
| UX | Â§27â€“35; nine product surfaces | Overview + Hedge Preview | Slices 001/005 |
| Developer infra | Â§36â€“38; SDK, REST, webhooks | Internal read API only | Post-hackathon |
| Business/metrics | Â§48â€“51 | Narrative only | Post-hackathon |

The full product is a cross-chain risk operating system. The hackathon delivers a credible vertical slice of it, not a reduced definition of the product.

## 5. Non-goals

- No new L1, bridge, custodial wallet, or perpetual exchange.
- No guarantee of profit, full protection, or liquidation prevention.
- No insurance product.
- No live or testnet order submission from a restricted jurisdiction.
- No custom smart contracts in the MVP.
- No mobile app, no token launch, no yield product.

## 6. Constraints

| Constraint | Detail |
|---|---|
| Time | ~48 hours of build time; demo + docs + repo required by 2026-10-23 10:00 EST |
| Jurisdiction | Indonesia is listed as a Restricted Jurisdiction in Strike's policy (verified 2026-10-20 at `/restricted`). Public API access does not grant trading authorization. |
| Network | **Mainnet-only.** No testnet endpoints. Market data from `api.strikefinance.org`; execution stays simulated. |
| Coverage | **Three chains mandatory for submission:** Ethereum, Solana, Cardano. EVM is built first; SOL/ADA cannot be cut before the demo. |
| Execution | `simulate` is the default. The 2026-10-21 Discord reply permits participation, read-only mainnet, testnet, and simulation; **live mainnet orders were not asked and remain disabled**. No signed order submission without a superseding ADR. |
| Credentials | Builder code active (â€œStrikeelâ€, 1 bps cap). Builder Connect verified end-to-end with a throwaway account: API wallet works for signed reads; **zero balance, no orders**. Blockfrost/Maestro/RPC keys still optional. |
| Budget | Near-zero; free tiers and public RPC only. |
| Team | Solo builder + agent workflow. |
| Evidence | Every claim needs a file, command, test output, endpoint log, or URL. |

## 7. Assumptions (explicit)

- **A1 â€” Location:** product repo at `C:\Users\Antidump\Downloads\strikeel`; agent tooling outside the product repo or gitignored.
- **A2 â€” Stack:** pnpm monorepo; Next.js + TypeScript + Tailwind for web; pure TypeScript domain packages; SQLite via 
ode:sqlite for the demo (Postgres + Drizzle is the production target); Zod; `decimal.js`; viem/wagmi; Solana web3.js; CIP-30 adapter. No Redis/BullMQ until a real worker is needed.
- **A3 â€” Repo:** no `git init` until approved; docs land first.
- **A4 â€” Demo:** mainnet Strike market data only; no testnet. Any order/fill is labeled **SIMULATED** end-to-end. No mock price data.
- **A5 â€” Build order:** Ethereum + Uniswap V3 first (slice 001), because concentrated-LP delta is the hardest and most defensible calculation. Solana + Cardano (slice 003) are mandatory before submission, not optional.
- **A6 â€” Pricing:** use Strike for hedgeable symbols; use protocol/chain state for LP composition. Any fallback source must be recorded in `price_observations` with provenance.
- **A7 â€” Language:** product docs and code comments in English; team chat in Indonesian.
- **A8 â€” Approval:** human approval at the end of each scope; agents cannot self-approve.

## 8. Open questions (blocking)

1. **Live mainnet permission:** Discord reply from Shan | Strike Finance (2026-10-21) says â€œYeah man, go ahead all goodâ€ to participation, read-only mainnet, testnet, and simulation. It did **not** explicitly cover **live mainnet orders** (we did not ask). A one-line follow-up is pending; until answered, live mainnet stays disabled and simulation remains the default.
2. **Builder code â€” confirmed and tested:** code is **`Strikeel`** (case-sensitive). `request-signature` + wallet signature + `verify-signature` created a throwaway test account and API wallet; signed `GET /v2/account`, `/v2/positions`, `/v2/openOrders`, `/v2/symbols`, `/v2/balances` all returned **200**. No orders, zero balance. The 1 bps cap does not force a fee (`fee_share_bps: 0`).
3. **Data keys:** do we have free-tier Blockfrost/Maestro and an EVM RPC (Alchemy/Infura) key, or must everything run on public endpoints?
4. **Repo:** confirm path and permission to `git init` + create a public GitHub repo before submission.
5. **Demo scope â€” answered:** all three chains (Ethereum, Solana, Cardano) are mandatory; EVM is built first, SOL/ADA in slice 003.

## 9. Success criteria

- A user can connect/read wallets, see normalized positions, and get a net exposure vector.
- A hedge proposal shows target, required order, margin, funding, slippage, and residual exposure.
- The execution state machine records intent â†’ policy â†’ simulated submission â†’ simulated fill/reconciliation, with an audit trail.
- Every number is reproducible from fixtures or recorded inputs.
- No restricted trading occurs; simulation is labeled in UI, logs, and demo.
- Build, tests, security, originality, and evidence gates pass (see `docs/agents/quality-gates.md`).

### North star and metric families (Â§51)

**North star:** verified notional of external DeFi exposure actively managed under explicit risk mandates.

| Family | Hackathon evidence |
|---|---|
| Integration | linked wallets, supported protocols, indexed positions, freshness |
| Risk | exposure coverage, direct-hedge coverage, residual delta, margin utilization |
| Execution | intent states, simulated fill rate, unresolved states, reconciliation |
| Effectiveness | funding/fee estimates, risk reduction under defined scenarios |
| Business | active portfolios/mandates (narrative + demo data) |

## 10. Status & next steps

| Step | Status |
|---|---|
| Phase 0 clarification | 5 questions issued; defaults recorded above |
| Phase 1 docs batch 1 | Brief, architecture, ADR-0001, scope 001, agent governance, AGENTS.md |
| Phase 1 fidelity pass | Traceability matrix, ADR-0002 delivery cut, workstreams, state-machine fix |
| Phase 1 docs batch 2 | `.opencode/` agents, commands, `opencode.json` created locally and gitignored; restart opencode to load |
| Phase 2 | Vertical slice 001 after explicit scope approval |

**Owner decisions (2026-10-20):** mainnet-only (no testnet), three-chain coverage mandatory (Ethereum, Solana, Cardano), batch 2 approved. Execution remains simulated under ADR-0001.

Next action: human review of the fidelity pass; answer the five open questions or accept the assumptions. No product code until approval.

## 11. References

- Master spec: `Strikeel.txt` (v1.0, Oct 2026).
- Strike docs: https://docs.strikefinance.org/ (`llms.txt`, per-page `.md`).
- Builder reference: https://github.com/strike-finance/strike-builder-reference
- Strike skills: https://github.com/strike-finance/strike-finance-skills
- Restricted policy: https://www.strikefinance.org/restricted
- Uniswap V3 SDK: https://github.com/Uniswap/v3-sdk
- Minswap SDK: https://github.com/minswap/sdk


