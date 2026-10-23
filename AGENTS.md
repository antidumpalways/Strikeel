# AGENTS.md â€” STRIKEEL

This file is the operating contract for every agent working in this repository. Read it before any task, then read the relevant scope and ADRs.

**Source of truth:** `Strikeel.txt` v1.0 is the master product/technical blueprint. `docs/context/traceability.md` maps all 59 sections to a document, slice, or deferred item. If a task conflicts with the master, stop and raise it; do not silently simplify.

## 1. Product identity

STRIKEEL is an **independent** cross-chain DeFi risk-management application. Strike Finance is the execution and market-data venue. STRIKEEL is not an official Strike product, does not custody assets, and does not guarantee protection or profit.

**North star:** verified notional of external DeFi exposure actively managed under explicit risk mandates.

## 2. Invariants (never violate)

1. **Non-custodial.** Never ask for, store, log, or transmit seed phrases or chain private keys. External positions stay with the user.
2. **No unauthorized trading.** An order requires an explicit, scoped, unexpired mandate. Wallet connection is not trading permission.
3. **Restricted mode is mandatory.** Indonesia is a restricted jurisdiction under Strike's policy. Live order submission is disabled and no testnet endpoints are used. See `docs/decisions/ADR-0001-execution-mode.md`.
4. **Simulation must be labeled.** Any simulated intent, fill, or position is marked `SIMULATED` in UI, API, DB, and demo.
5. **Deterministic money math.** Use decimal strings / integer minor units and explicit rounding. No IEEE-754 floats for financial values.
6. **No fabricated evidence.** Every claim links to a file, command output, test, endpoint log, tx hash, or URL.
7. **Stale data blocks risk-increasing action.** Unknown or stale data never silently produces a trade.
8. **Pending â‰  filled.** Only confirmed fills mutate the hedge ledger; reconcile before retry.
9. **Original work.** No copied code, UI, copy, or assets. Respect licenses and attribution.
10. **Scope discipline.** Out-of-scope changes are not merged; propose a new scope instead.

## 3. Hard rules

- Do not write product code before the human approves Phase 1 and a scope.
- Do not add a dependency without checking existing usage, license, and bundle/runtime impact.
- Do not commit secrets, `.env` values, private keys, or API tokens.
- Do not disable, skip, or weaken tests to pass a gate.
- Do not self-approve. Minimum two independent reviewers; at least one Contracts/Security.
- Do not call Strike `POST /v2/order` (or any write endpoint) while in restricted mode.
- Do not present mock/recorded data as live.
- Do not silently change shared schemas or cross-package contracts.
- Do not rewrite another agent's package while it is under review.
- Do not claim "done" without a PASS in the validation log.

## 4. Definition of Done

A scope is done only when all of the following are true:

- [ ] Every acceptance criterion is met and mapped to evidence.
- [ ] Required unit/integration/E2E tests exist and pass.
- [ ] Build, typecheck, lint, and security checks pass.
- [ ] Accessibility and honesty checks pass for UI changes.
- [ ] Originality check passes; licenses/attribution recorded.
- [ ] Docs, ADRs, and `.env.example` are updated (no values).
- [ ] `docs/agents/validation-log.md` has a complete entry.
- [ ] Two independent reviewers returned PASS (no open HIGH/BLOCKER).
- [ ] Orchestrator signed off and the human approved the scope.

Otherwise the status is `in progress` or `blocked`, never "done".

## 5. Workflow

```text
Orchestrator defines scope
  â†’ Builder implements + hands off
  â†’ Contracts review
  â†’ Security review
  â†’ Frontend review (if UI)
  â†’ Strike review (if integration/risk)
  â†’ QA validation
  â†’ Arbiter (only if needed)
  â†’ Orchestrator sign-off
  â†’ Human approval
```

Rules for each stage are in `docs/agents/validation-protocol.md`. Handoffs use `docs/agents/handoff-contract.md`. Gates are in `docs/agents/quality-gates.md`.

## 6. Roles in this repo

Agent definitions live outside the product repo (local `.opencode/agent/`), so they are not shipped. The roles are:

`orchestrator`, `builder`, `contracts-reviewer`, `security-auditor`, `frontend-reviewer`, `qa-validator`, `strike-reviewer`, `arbiter`.

The orchestrator may read and plan but must not write product code. Reviewers must not edit the files they review. Workstream ownership and reviewer pairing are defined in `docs/agents/workstreams.md`.

## 7. Repository map (target)

```text
strikeel/
â”œâ”€â”€ apps/web/                 # Next.js UI + route handlers (BFF)
â”œâ”€â”€ packages/core/            # assets, positions, exposure, hedge, policy, state machine
â”œâ”€â”€ packages/adapters/        # evm, solana, cardano, strike
â”œâ”€â”€ packages/db/              # SQLite demo store (node:sqlite); Postgres/Drizzle production target
â”œâ”€â”€ tools/reconcile/          # manual/CLI reconciliation (demo)
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ context/
â”‚   â”œâ”€â”€ architecture/
â”‚   â”œâ”€â”€ decisions/
â”‚   â”œâ”€â”€ scopes/
â”‚   â””â”€â”€ agents/
â”œâ”€â”€ tests/                    # fixtures, integration, e2e
â””â”€â”€ AGENTS.md
```

Current state: slice 001 implemented (packages + apps/web + tests); docs remain the plan of record.

## 8. Commands

Expected after scaffold (not yet available):

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Never invent a passing result. If a command does not exist, say so.

## 9. Data and API conventions

- Strike base URLs and endpoints: `docs/architecture/overview.md` Â§5.
- Simulate mode is the default; no API wallet key is required for the demo.
- Asset identity = chain + contract/policy/asset name + decimals; never symbol alone.
- Every position/price stores source, timestamp, block/slot, and adapter version.
- Reason codes are required for every hedge decision, including "no trade".

## 10. Security and privacy

- Secrets only in local env, never in repo, logs, screenshots, or fixtures.
- Authenticated routes check ownership per record.
- Redact addresses only when necessary; never redact away auditability of a transaction hash.
- Disclose the operator trust model if a trading key is ever introduced (not in the demo).
- Report a suspected policy or security issue immediately; stop work on the affected scope.

## 11. Escalation

Escalate to the human when:

- a BLOCKER/HIGH cannot be resolved within 3 cycles;
- the scope requires a policy or legal decision;
- Strike access/permission is unclear;
- a reviewer and arbiter disagree on a security finding;
- the deadline forces a scope cut.

Provide: open findings, attempted fixes, root cause, and 2â€“3 options with trade-offs.

## 12. Language and tone

- Product docs, code, comments, and commit messages: English.
- Team communication: Indonesian is fine.
- Public copy: precise, no hype, no guarantees, no impersonation of Strike.

