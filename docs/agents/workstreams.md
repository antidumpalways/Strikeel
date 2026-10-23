# Workstreams and Ownership

- **Status:** Active
- **Date:** 2026-10-20
- **Source:** master spec §46; `AGENTS.md`; `docs/agents/validation-protocol.md`

Purpose: divide implementation across agents without two writers touching the same package, and pair every workstream with independent reviewers.

## 1. Workstreams

| ID | Workstream | Owns | May touch | Must not |
|---|---|---|---|---|
| A | Product Interface | `apps/web` UI, components, charts, copy | `packages/ui`, read-only API clients | Risk math, adapters, signing |
| B | Identity & Multi-Wallet | `packages/core/identity`, wallet connectors | `apps/web` auth screens | Execution engine, risk math |
| C | Protocol Integrations | `packages/adapters/evm|solana|cardano` | fixtures, `packages/core/portfolio` contracts | Hedge decisions, Strike orders |
| D | Risk Intelligence | `packages/core/risk`, `packages/core/portfolio` | fixtures, docs/risk-model | Network I/O, wallet UI |
| E | Strike Execution | `packages/adapters/strike`, `packages/core/trading`, `packages/core/policy` | `tools/reconcile` | Portfolio normalization rules |
| F | Platform & Quality | `packages/db`, CI, tests, observability, docs consistency | all packages for tests only | Feature logic without owner approval |

## 2. Active workstreams by slice

| Slice | Active | Review focus |
|---|---|---|
| 001 Exposure → preview | C (EVM), D, E (read adapter), A, F | LP math, Strike reads, UI honesty |
| 002 Intent + simulator | E, D, F, A (status UI) | State machine, policy, simulation boundary |
| 003 Solana + Cardano | B, C, A, F | **Required for submission**; signature verification, adapters, UTXO scope |
| 004 Rebalance + margin guardian | D, E, F | Stretch; triggers, anti-churn, margin limits |
| 005 Demo + submission | A, F | **Required for submission**; narrative, labels, reproducibility |

**Submission freeze requires slices 001, 002, 003, and 005.** Slice 004 is a stretch goal and may be cut under deadline pressure; 003 may not.

**Sequencing to protect the deadline:** 001 freezes `NormalizedPosition` + `ExposureVector` contracts first; 003 (SOL/ADA) may then run in parallel with 002 (simulator). 005 runs last. Do not start 003 before the contracts freeze, or adapters will be rewritten.

One slice may have multiple workstreams, but **one package has one writer at a time**.

## 3. Ownership rules

1. **Single writer per package per review cycle.** The handoff contract lists exact files; overlapping claims are rejected.
2. **Shared contracts require Contracts Reviewer approval.** Types in `packages/core/contracts` (or equivalent) are integration points.
3. **No cross-package edits without the owner's acknowledgment.** Test-only edits are allowed but must be declared.
4. **No two agents rewrite the same package simultaneously.** The orchestrator sequences conflicting work.
5. **Fixtures are shared infrastructure.** Changes require QA + adapter owner review.
6. **Docs are product artifacts.** Orchestrator owns `docs/`; builders may propose edits in the handoff.
7. **Reviewers do not edit reviewed files.** Findings go back to the builder.

## 4. Reviewer pairing

At least two independent reviewers per sign-off; domain-specific pairing:

| Workstream | Required reviewers |
|---|---|
| A Product Interface | Frontend + Contracts (or QA) |
| B Identity | Security + Contracts |
| C Protocol Integrations | Contracts + QA (Strike reviewer if market data involved) |
| D Risk Intelligence | Strike Reviewer + Contracts + QA |
| E Strike Execution | Strike Reviewer + Security |
| F Platform & Quality | Security + QA |

No self-approval. A builder from workstream D cannot be the sole reviewer of D.

## 5. Branch and handoff conventions (after `git init`)

- Branch: `slice-001/<workstream>/<task>` (e.g., `slice-001/c/uniswap-v3-amounts`).
- Commit: imperative, scoped (`core(risk): add lp delta fixture`).
- Handoff includes branch, commit, files, commands, evidence.
- Rebase on the integration branch before review; no force-push after review starts.

## 6. Conflict resolution

1. File/package collision → orchestrator sequences; the later agent rebases.
2. Contract disagreement → Contracts Reviewer proposes; arbiter decides if unresolved.
3. Risk-math disagreement → Strike Reviewer + fixtures; arbiter if still unresolved.
4. Security disagreement → Security Auditor; human decides if arbiter disagrees.
5. Deadline pressure → orchestrator cuts scope, never quality gates.

## 7. Work-in-progress limits

- Max 2 active workstreams per builder agent.
- Max 1 package under active rewrite per agent.
- No new scope opened while a BLOCKER is open.
- Review queue takes priority over new implementation.

## 8. Definition of ready for a workstream task

- Approved scope with AC IDs.
- File ownership listed.
- Contracts/types identified.
- Test expectations stated.
- Evidence format agreed.
- Reviewer pair assigned.

If any item is missing, the task is not ready; do not start coding.
